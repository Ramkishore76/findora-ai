const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const { sendPasswordResetEmail, sendWelcomeRegistrationEmail } = require('../services/email');

// 1. User Registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, adminSecret } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const id = `usr_${Date.now()}`;
    const passwordHash = bcrypt.hashSync(password, 8);

    // Role-based authorization: strictly 3 roles (student, verification_officer, admin)
    const allowedAdminSecret = process.env.ADMIN_REGISTRATION_SECRET || 'FindoraAdmin2026!';
    let assignedRole = 'student';

    if (role === 'admin') {
      if (adminSecret === allowedAdminSecret || normalizedEmail === process.env.ADMIN_EMAIL?.toLowerCase()) {
        assignedRole = 'admin';
      } else {
        return res.status(403).json({ error: 'Valid Institutional Admin Secret is required to register as Administrator.' });
      }
    } else if (role === 'verification_officer') {
      if (adminSecret === allowedAdminSecret || normalizedEmail === process.env.OFFICER_EMAIL?.toLowerCase() || normalizedEmail === process.env.ADMIN_EMAIL?.toLowerCase()) {
        assignedRole = 'verification_officer';
      } else {
        return res.status(403).json({ error: 'Valid Institutional Officer Secret is required to register as Verification Officer.' });
      }
    } else {
      assignedRole = 'student';
    }

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name.trim(), normalizedEmail, passwordHash, assignedRole);

    const token = jwt.sign(
      { id, name: name.trim(), email: normalizedEmail, role: assignedRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Dispatch welcome registration email via Brevo SMTP
    sendWelcomeRegistrationEmail(normalizedEmail, name.trim(), assignedRole).catch(err => {
      console.warn('[REGISTRATION EMAIL WARNING]:', err.message);
    });

    res.json({
      user: { id, name: name.trim(), email: normalizedEmail, role: assignedRole },
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. User Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(normalizedEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    const normalizedRole = user.role === 'user' ? 'student' : user.role;

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: normalizedRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: normalizedRole,
        avatar: user.avatar
      },
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get Current User Profile (Verifies Session)
router.get('/me', authenticateToken, (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const user = db.prepare('SELECT id, name, email, role, avatar FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    const normalizedRole = user.role === 'user' ? 'student' : user.role;
    res.json({ user: { ...user, role: normalizedRole } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Request Password Reset (Dispatches 6-digit OTP code via Brevo SMTP)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT id, email, name FROM users WHERE LOWER(email) = ?').get(normalizedEmail);
    if (!user) {
      return res.status(404).json({ error: `No registered account found for ${normalizedEmail}. Please check spelling or create an account.` });
    }

    // Generate random 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetId = `rst_${Date.now()}`;

    // Store in password_resets with 15-minute expiration
    db.prepare(`
      INSERT INTO password_resets (id, email, token, expires_at, used)
      VALUES (?, ?, ?, datetime('now', '+15 minutes'), 0)
    `).run(resetId, normalizedEmail, otpCode);

    console.log('\n======================================================');
    console.log(`🔐 [BREVO OTP GENERATED] For Account: ${normalizedEmail}`);
    console.log(`🔑 [6-DIGIT OTP CODE]: ${otpCode}`);
    console.log('======================================================\n');

    // Dispatch real email via Brevo SMTP
    await sendPasswordResetEmail(normalizedEmail, otpCode);

    res.json({ 
      message: `A 6-digit verification code has been dispatched to ${normalizedEmail}. Please check your email inbox and spam folder.`
    });
  } catch (error) {
    console.error('[FORGOT PASSWORD ERROR]:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Reset Password using OTP code
router.post('/reset-password', (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const resetRecord = db.prepare(`
      SELECT * FROM password_resets 
      WHERE LOWER(email) = ? AND token = ? AND used = 0 AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC LIMIT 1
    `).get(normalizedEmail, code.trim());

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired verification code. Please request a new code.' });
    }

    // Hash new password and update user
    const passwordHash = bcrypt.hashSync(newPassword, 8);
    db.prepare('UPDATE users SET password_hash = ? WHERE LOWER(email) = ?').run(passwordHash, normalizedEmail);

    // Mark reset record as used
    db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRecord.id);

    res.json({ message: 'Your password has been successfully reset. You can now log in.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
