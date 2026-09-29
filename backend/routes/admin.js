const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, requireOfficerOrAdmin, requireAdminOnly } = require('../middleware/auth');
const { generateCaseId, generateHandoverCode, createTimeline } = require('../services/recovery');
const { seedDatabase } = require('../database/seed');

// Admin Command Center Dashboard Overview (Restricted to Officers and Admins)
router.get('/dashboard', authenticateToken, requireOfficerOrAdmin, (req, res) => {
  try {
    const totalLost = db.prepare("SELECT COUNT(*) as count FROM items WHERE type = 'LOST'").get().count;
    const totalFound = db.prepare("SELECT COUNT(*) as count FROM items WHERE type = 'FOUND'").get().count;
    const totalMatches = db.prepare("SELECT COUNT(*) as count FROM matches WHERE status != 'DISMISSED'").get().count;
    const pendingClaims = db.prepare("SELECT COUNT(*) as count FROM claims WHERE status IN ('PENDING_VERIFICATION', 'UNDER_REVIEW')").get().count;
    const totalRecovered = db.prepare("SELECT COUNT(*) as count FROM recovery_cases WHERE status IN ('RECOVERED', 'CLOSED')").get().count;
    const activeRiskAlerts = db.prepare("SELECT COUNT(*) as count FROM fraud_alerts WHERE status = 'ACTIVE'").get().count;

    // Top Recent AI Matches
    const topMatches = db.prepare(`
      SELECT 
        m.id, m.final_score, m.created_at,
        l.title as lost_title, l.category,
        f.title as found_title, f.building as found_building
      FROM matches m
      JOIN items l ON m.lost_item_id = l.id
      JOIN items f ON m.found_item_id = f.id
      ORDER BY m.final_score DESC, m.created_at DESC
      LIMIT 5
    `).all();

    // Pending Claims for review
    const claimsReview = db.prepare(`
      SELECT 
        c.id, c.status, c.verification_score, c.risk_score, c.risk_level, c.created_at,
        f.title as found_title, f.building,
        u.name as claimant_name, u.email as claimant_email
      FROM claims c
      JOIN items f ON c.found_item_id = f.id
      LEFT JOIN users u ON c.claimant_id = u.id
      ORDER BY c.risk_score DESC, c.created_at DESC
      LIMIT 8
    `).all();

    // Active Fraud Alerts
    const fraudAlerts = db.prepare(`
      SELECT 
        fa.*, u.name as claimant_name, u.email as claimant_email
      FROM fraud_alerts fa
      LEFT JOIN users u ON fa.claimant_id = u.id
      WHERE fa.status = 'ACTIVE'
      ORDER BY fa.created_at DESC
      LIMIT 5
    `).all();

    const formattedAlerts = fraudAlerts.map(a => {
      let parsedReasons = [];
      try {
        parsedReasons = typeof a.reasons === 'string' ? JSON.parse(a.reasons) : (a.reasons || []);
      } catch {
        parsedReasons = a.reasons ? [a.reasons] : [];
      }
      return {
        ...a,
        reasons: parsedReasons
      };
    });

    // Recovery Rate calculation
    const recoveryRate = totalFound > 0 ? Math.round((totalRecovered / totalFound) * 100) : 0;

    res.json({
      stats: {
        totalLost,
        totalFound,
        aiMatches: totalMatches,
        pendingClaims,
        recovered: totalRecovered,
        activeRiskAlerts,
        recoveryRate
      },
      topMatches,
      claimsReview,
      fraudAlerts: formattedAlerts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Approve Claim -> Creates Recovery Case & Generates Handover Code
router.post('/claims/:id/approve', authenticateToken, requireOfficerOrAdmin, (req, res) => {
  try {
    const claimId = req.params.id;
    const adminId = req.user ? req.user.id : null;
    const { pickupLocation, adminNotes } = req.body;

    const claim = db.prepare('SELECT * FROM claims WHERE id = ?').get(claimId);
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found.' });
    }

    // Check if recovery case already exists
    let recoveryCase = db.prepare('SELECT * FROM recovery_cases WHERE claim_id = ?').get(claimId);

    if (!recoveryCase) {
      const caseId = generateCaseId();
      const handoverCode = generateHandoverCode();
      const location = pickupLocation || 'Central Campus Security Desk - Wilson Hall Rm 102';
      const timeline = createTimeline('HANDOVER_PENDING', req.user?.name || 'Campus Security Officer');

      db.prepare(`
        INSERT INTO recovery_cases (
          id, claim_id, item_id, claimant_id, pickup_location,
          handover_code, status, timeline, admin_id
        ) VALUES (?, ?, ?, ?, ?, ?, 'HANDOVER_PENDING', ?, ?)
      `).run(
        caseId,
        claimId,
        claim.found_item_id,
        claim.claimant_id,
        location,
        handoverCode,
        JSON.stringify(timeline),
        adminId
      );

      recoveryCase = {
        id: caseId,
        claim_id: claimId,
        handover_code: handoverCode,
        pickup_location: location,
        status: 'HANDOVER_PENDING',
        timeline
      };
    }

    // Update claim status
    db.prepare(`
      UPDATE claims
      SET status = 'APPROVED', admin_notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(adminNotes || 'Claim verified and authorized by campus administrator.', claimId);

    // Update found item and lost item status
    db.prepare("UPDATE items SET status = 'CLAIMED' WHERE id = ?").run(claim.found_item_id);
    if (claim.lost_item_id) {
      db.prepare("UPDATE items SET status = 'CLAIMED' WHERE id = ?").run(claim.lost_item_id);
    }

    // Notify claimant in-app
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, data)
      VALUES (?, ?, 'Recovery Case Authorized!', ?, 'HANDOVER_READY', ?)
    `).run(
      `notif_${Date.now()}`,
      claim.claimant_id,
      `Your claim has been authorized! Handover code: ${recoveryCase.handover_code}. Proceed to pickup.`,
      JSON.stringify({ case_id: recoveryCase.id, handover_code: recoveryCase.handover_code })
    );

    // Send real Brevo SMTP Email notification to claimant
    try {
      const { sendHandoverCodeEmail } = require('../services/email');
      const claimantUser = db.prepare('SELECT email FROM users WHERE id = ?').get(claim.claimant_id);
      if (claimantUser && claimantUser.email) {
        sendHandoverCodeEmail(claimantUser.email, recoveryCase).catch(err => {
          console.warn('[EMAIL DISPATCH ERROR]', err.message);
        });
      }
    } catch (e) {
      console.warn('[EMAIL DISPATCH NOT AVAILABLE]', e.message);
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details)
      VALUES (?, ?, 'APPROVE_CLAIM', 'claims', ?, ?)
    `).run(
      `aud_${Date.now()}`,
      adminId,
      claimId,
      `Approved claim #${claimId}. Generated Recovery Case ${recoveryCase.id} with Handover Code ${recoveryCase.handover_code}`
    );

    res.json({
      message: 'Claim approved successfully and recovery case generated.',
      claimId,
      recoveryCase
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Reject Claim
router.post('/claims/:id/reject', authenticateToken, requireOfficerOrAdmin, (req, res) => {
  try {
    const claimId = req.params.id;
    const adminId = req.user ? req.user.id : null;
    const { reason } = req.body;

    db.prepare(`
      UPDATE claims 
      SET status = 'REJECTED', admin_notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reason || 'Ownership evidence and answers did not satisfy verification criteria.', claimId);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details)
      VALUES (?, ?, 'REJECT_CLAIM', 'claims', ?, ?)
    `).run(`aud_${Date.now()}`, adminId, claimId, `Rejected claim #${claimId}. Reason: ${reason || 'Failed verification'}`);

    res.json({ message: 'Claim marked as rejected.', claimId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset Demo Environment to Initial State (Hackathon Rule: Strictly Super Admin only!)
router.post('/reset-demo', authenticateToken, requireAdminOnly, (req, res) => {
  try {
    seedDatabase();
    res.json({ message: 'Findora demo environment successfully reset to fresh baseline.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
