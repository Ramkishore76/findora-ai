const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const { authenticateToken, requireAuth, requireOfficerOrAdmin } = require('../middleware/auth');
const { rankCandidates } = require('../services/matching');
const { generateHandoverCode } = require('../services/recovery');
const telegramBot = require('../services/telegramBot');
const { sendReportConfirmationEmail, sendSearchClosedEmail } = require('../services/email');

// Multer storage configuration
const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `item_${Date.now()}_${Math.round(Math.random() * 1e4)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const { uploadToCloudinary } = require('../services/storage');

// Upload image endpoint
router.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }
  let finalUrl = `/uploads/${req.file.filename}`;
  try {
    const cloudUrl = await uploadToCloudinary(req.file.path);
    if (cloudUrl) {
      finalUrl = cloudUrl;
    }
  } catch (err) {
    console.warn('Cloudinary upload fallback to local:', err.message);
  }
  res.json({ imageUrl: finalUrl });
});

// List Public Items (Security rule: Never leak private attributes!)
router.get('/', (req, res) => {
  try {
    const { type, category, building, search, status } = req.query;

    let query = `
      SELECT 
        i.id, i.type, i.title, i.description, i.category, i.color, 
        i.brand, i.model, i.image, i.location, i.building, i.floor,
        i.event_time, i.created_at, i.status, i.owner_id, i.condition,
        u.name as reporter_name
      FROM items i
      LEFT JOIN users u ON i.owner_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      query += ` AND i.type = ?`;
      params.push(type.toUpperCase());
    }
    if (category) {
      query += ` AND i.category = ?`;
      params.push(category);
    }
    if (building) {
      query += ` AND i.building = ?`;
      params.push(building);
    }
    if (status) {
      query += ` AND i.status = ?`;
      params.push(status);
    }
    if (search) {
      query += ` AND (i.title LIKE ? OR i.description LIKE ? OR i.brand LIKE ? OR i.model LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY i.created_at DESC`;
    const items = db.prepare(query).all(...params);

    res.json({ items, count: items.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Single Item by ID
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const item = db.prepare(`
      SELECT i.*, u.name as reporter_name, u.email as reporter_email
      FROM items i
      LEFT JOIN users u ON i.owner_id = u.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    // Check if requester is owner or admin
    const isAuthorized = req.user && (req.user.id === item.owner_id || req.user.role === 'admin' || req.user.role === 'verification_officer');

    if (isAuthorized) {
      const privateAttrs = db.prepare('SELECT * FROM item_private_attributes WHERE item_id = ?').get(item.id);
      item.private_attributes = privateAttrs || null;
    } else {
      // Redact private attributes for safety!
      item.private_attributes = null;
    }

    res.json({ item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Report Lost Item
router.post('/lost', authenticateToken, (req, res) => {
  try {
    const {
      title, description, category, color, brand, model,
      image, location, building, floor, event_time,
      serial_number, unique_marks, damage_details, hidden_features,
      latitude, longitude
    } = req.body;

    if (!title || !description || !category || !building) {
      return res.status(400).json({ error: 'Title, description, category, and building are required.' });
    }

    const itemId = `item_${Date.now()}`;
    const ownerId = req.user?.id || db.prepare('SELECT id FROM users LIMIT 1').get()?.id || 'usr_anonymous';
    const closeCode = generateHandoverCode();

    const insertItem = db.prepare(`
      INSERT INTO items (
        id, type, title, description, category, color, brand, model,
        image, location, building, floor, event_time, owner_id, status,
        serial_number, unique_marks, damage_details, hidden_features,
        latitude, longitude, close_code
      ) VALUES (?, 'LOST', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, ?)
    `);

    insertItem.run(
      itemId,
      title,
      description,
      category,
      color || null,
      brand || null,
      model || null,
      image || null,
      location || `${building} Floor ${floor || 1}`,
      building,
      floor ? parseInt(floor) : 1,
      event_time || new Date().toISOString(),
      ownerId,
      serial_number || null,
      unique_marks || null,
      damage_details || null,
      hidden_features || null,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      closeCode
    );

    // Save private ownership clues table for backwards compatibility
    const privId = `priv_${itemId}`;
    try {
      db.prepare(`
        INSERT INTO item_private_attributes (
          id, item_id, serial_number, unique_marks, damage_details, hidden_features
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        privId,
        itemId,
        serial_number || null,
        unique_marks || null,
        damage_details || null,
        hidden_features || null
      );
    } catch {}

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details)
      VALUES (?, ?, 'REPORT_LOST_ITEM', 'items', ?, ?)
    `).run(`aud_${Date.now()}`, ownerId, itemId, `Reported lost item: ${title} (Close Code: ${closeCode})`);

    const currentItem = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);

    // Broadcast alert to Telegram Bot subscribers (@findoravsb_bot)
    telegramBot.broadcastNewItem(currentItem, closeCode);

    // Send confirmation email with 1-Time Code to owner
    const ownerUser = db.prepare('SELECT email FROM users WHERE id = ?').get(ownerId);
    if (ownerUser && ownerUser.email) {
      sendReportConfirmationEmail(ownerUser.email, currentItem, closeCode).catch(err => {
        console.error('[EMAIL ERROR] Failed sending report confirmation:', err.message);
      });
    }

    // Auto-scan for AI matches immediately
    const candidatePool = db.prepare("SELECT * FROM items WHERE type = 'FOUND' AND status != 'RECOVERED'").all();
    const matches = rankCandidates(currentItem, candidatePool);

    if (matches.length > 0 && matches[0].final_score >= 0.70) {
      const topMatch = matches[0];
      const matchId = `match_${Date.now()}`;
      db.prepare(`
        INSERT INTO matches (
          id, lost_item_id, found_item_id, final_score, visual_score,
          text_score, location_score, time_score, category_score,
          attribute_score, explanation, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `).run(
        matchId,
        topMatch.lost_item_id,
        topMatch.found_item_id,
        topMatch.final_score,
        topMatch.visual_score,
        topMatch.text_score,
        topMatch.location_score,
        topMatch.time_score,
        topMatch.category_score,
        topMatch.attribute_score,
        JSON.stringify(topMatch.explanation)
      );

      // Create instant Smart Recovery notification
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, data)
        VALUES (?, ?, 'AI Match Discovered', ?, 'MATCH_ALERT', ?)
      `).run(
        `notif_${Date.now()}`,
        ownerId,
        `Potential match discovered with ${Math.round(topMatch.final_score * 100)}% confidence for your ${title}.`,
        JSON.stringify({ match_id: matchId, item_id: itemId })
      );

      // Broadcast AI Match alert to Telegram Bot subscribers
      const matchedFoundItem = db.prepare('SELECT * FROM items WHERE id = ?').get(topMatch.found_item_id);
      if (matchedFoundItem) {
        telegramBot.broadcastMatch(currentItem, matchedFoundItem, topMatch.final_score);
      }
    }

    res.status(201).json({
      message: 'Lost item reported successfully and indexed by Findora AI.',
      itemId,
      close_code: closeCode,
      matchesFound: matches.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Report Found Item
router.post('/found', authenticateToken, (req, res) => {
  try {
    const {
      title, description, category, color, brand, model,
      image, location, building, floor, event_time, condition,
      unique_marks, damage_details, hidden_features,
      latitude, longitude
    } = req.body;

    if (!title || !description || !category || !building) {
      return res.status(400).json({ error: 'Title, description, category, and building are required.' });
    }

    const itemId = `item_${Date.now()}`;
    const ownerId = req.user?.id || db.prepare('SELECT id FROM users LIMIT 1').get()?.id || 'usr_anonymous';
    const closeCode = generateHandoverCode();

    const insertItem = db.prepare(`
      INSERT INTO items (
        id, type, title, description, category, color, brand, model,
        image, location, building, floor, event_time, owner_id, status, condition,
        unique_marks, damage_details, hidden_features,
        latitude, longitude, close_code
      ) VALUES (?, 'FOUND', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, ?)
    `);

    insertItem.run(
      itemId,
      title,
      description,
      category,
      color || null,
      brand || null,
      model || null,
      image || null,
      location || `${building} Floor ${floor || 1}`,
      building,
      floor ? parseInt(floor) : 1,
      event_time || new Date().toISOString(),
      ownerId,
      condition || 'Operational',
      unique_marks || null,
      damage_details || null,
      hidden_features || null,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      closeCode
    );

    // Save private observations table for backwards compatibility
    const privId = `priv_${itemId}`;
    try {
      db.prepare(`
        INSERT INTO item_private_attributes (
          id, item_id, unique_marks, damage_details, hidden_features
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        privId,
        itemId,
        unique_marks || null,
        damage_details || null,
        hidden_features || null
      );
    } catch {}

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details)
      VALUES (?, ?, 'REPORT_FOUND_ITEM', 'items', ?, ?)
    `).run(`aud_${Date.now()}`, ownerId, itemId, `Turned in found item: ${title} (Close Code: ${closeCode})`);

    const currentFoundItem = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
    // Broadcast alert to Telegram Bot subscribers (@findoravsb_bot)
    telegramBot.broadcastNewItem(currentFoundItem, closeCode);

    // Scan lost items pool
    const candidatePool = db.prepare("SELECT * FROM items WHERE type = 'LOST' AND status != 'RECOVERED'").all();
    const currentItem = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
    const matches = rankCandidates(currentItem, candidatePool);

    if (matches.length > 0 && matches[0].final_score >= 0.80) {
      const topMatch = matches[0];
      const matchId = `match_${Date.now()}`;
      db.prepare(`
        INSERT INTO matches (
          id, lost_item_id, found_item_id, final_score, visual_score,
          text_score, location_score, time_score, category_score,
          attribute_score, explanation, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `).run(
        matchId,
        topMatch.lost_item_id,
        topMatch.found_item_id,
        topMatch.final_score,
        topMatch.visual_score,
        topMatch.text_score,
        topMatch.location_score,
        topMatch.time_score,
        topMatch.category_score,
        topMatch.attribute_score,
        JSON.stringify(topMatch.explanation)
      );

      // Notify owner of lost item
      const lostItem = db.prepare('SELECT owner_id, title FROM items WHERE id = ?').get(topMatch.lost_item_id);
      if (lostItem) {
        db.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, data)
          VALUES (?, ?, 'Potential Match Found!', ?, 'MATCH_ALERT', ?)
        `).run(
          `notif_${Date.now()}`,
          lostItem.owner_id,
          `A found item matching your ${lostItem.title} was just reported with ${Math.round(topMatch.final_score * 100)}% match confidence.`,
          JSON.stringify({ match_id: matchId, item_id: topMatch.lost_item_id })
        );

        // Broadcast AI Match alert to Telegram Bot subscribers
        const matchedLostItem = db.prepare('SELECT * FROM items WHERE id = ?').get(topMatch.lost_item_id);
        if (matchedLostItem) {
          telegramBot.broadcastMatch(matchedLostItem, currentItem, topMatch.final_score);
        }
      }
    }

    res.status(201).json({
      message: 'Found item reported and stored securely.',
      itemId,
      close_code: closeCode,
      matchesFound: matches.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verification Officer endpoint: Close searching using 1-Time Code recited by owner
router.post('/close-search', authenticateToken, requireOfficerOrAdmin, async (req, res) => {
  try {
    const { closeCode, notes } = req.body;
    if (!closeCode || !closeCode.trim()) {
      return res.status(400).json({ error: '1-Time Verification Code is required.' });
    }

    const code = closeCode.trim().toUpperCase();

    // Look for active item with this 1-time code
    let item = db.prepare('SELECT * FROM items WHERE UPPER(close_code) = ?').get(code);
    let recoveryCase = null;

    if (!item) {
      // Fallback: check recovery_cases table
      recoveryCase = db.prepare('SELECT * FROM recovery_cases WHERE UPPER(handover_code) = ?').get(code);
      if (recoveryCase) {
        item = db.prepare('SELECT * FROM items WHERE id = ?').get(recoveryCase.item_id);
      }
    }

    if (!item) {
      return res.status(404).json({
        error: `Invalid 1-Time Code "${code}". No active item matched this code.`
      });
    }

    if (item.status === 'RECOVERED' || item.status === 'CLOSED') {
      return res.status(400).json({
        error: `Search for item "${item.title}" is already marked as RECOVERED/CLOSED.`
      });
    }

    const officerName = req.user?.name || 'Campus Security Officer';
    const officerId = req.user?.id || 'officer_vault';
    const now = new Date().toISOString();

    // Mark item as RECOVERED & record custody close
    db.prepare(`
      UPDATE items
      SET status = 'RECOVERED', closed_at = ?, closed_by = ?
      WHERE id = ?
    `).run(now, officerName, item.id);

    // If item was linked to a recovery case, mark it RECOVERED as well
    db.prepare(`
      UPDATE recovery_cases
      SET status = 'RECOVERED', recovered_at = ?
      WHERE item_id = ?
    `).run(now, item.id);

    // Mark any related claims
    db.prepare(`
      UPDATE claims
      SET status = 'APPROVED'
      WHERE lost_item_id = ? OR found_item_id = ?
    `).run(item.id, item.id);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details)
      VALUES (?, ?, 'SEARCH_CLOSED_BY_CODE', 'items', ?, ?)
    `).run(
      `aud_${Date.now()}`,
      officerId,
      item.id,
      `1-Time Code ${code} verified by ${officerName}. Custody transferred and search closed.`
    );

    // Notify owner via email
    const owner = db.prepare('SELECT email FROM users WHERE id = ?').get(item.owner_id);
    if (owner && owner.email) {
      sendSearchClosedEmail(owner.email, item, officerName).catch(err => {
        console.error('[EMAIL ERROR] Failed sending search closed notification:', err.message);
      });
    }

    // Broadcast resolution to Telegram Bot subscribers (@findoravsb_bot)
    telegramBot.broadcastSearchClosed(item, officerName, code);

    // Create in-app notification for owner
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, data)
      VALUES (?, ?, 'Item Recovered & Search Closed!', ?, 'HANDOVER_READY', ?)
    `).run(
      `notif_${Date.now()}`,
      item.owner_id,
      `Your item ${item.title} has been officially verified and returned by ${officerName}. The search is closed.`,
      JSON.stringify({ item_id: item.id, status: 'RECOVERED', verified_by: officerName })
    );

    res.json({
      success: true,
      message: `Item custody verified! Search for "${item.title}" is officially closed.`,
      item: {
        ...item,
        status: 'RECOVERED',
        closed_at: now,
        closed_by: officerName
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
