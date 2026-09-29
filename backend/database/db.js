const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let dbPath = path.resolve(__dirname, 'findora.db');

// In Vercel serverless environment, filesystem is read-only except /tmp
if (process.env.VERCEL) {
    const tmpDbPath = path.join('/tmp', 'findora.db');
    if (!fs.existsSync(tmpDbPath) && fs.existsSync(dbPath)) {
        try {
            fs.copyFileSync(dbPath, tmpDbPath);
        } catch (e) {
            console.warn('[DB] Could not copy initial db to /tmp, will initialize fresh:', e.message);
        }
    }
    dbPath = tmpDbPath;
}

const db = new Database(dbPath, {
    // verbose: console.log 
});

// Enable WAL mode for high concurrency and performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema & migrations
function initDB() {
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);

    // Auto-migrate new columns on items table
    try {
        db.exec("ALTER TABLE items ADD COLUMN close_code TEXT");
    } catch (e) {
        // Column may already exist
    }
    try {
        db.exec("ALTER TABLE items ADD COLUMN closed_at DATETIME");
    } catch (e) {
        // Column may already exist
    }
    try {
        db.exec("ALTER TABLE items ADD COLUMN closed_by TEXT");
    } catch (e) {
        // Column may already exist
    }

    // Auto-create telegram_subscribers table if not exists
    db.exec(`
        CREATE TABLE IF NOT EXISTS telegram_subscribers (
            chat_id TEXT PRIMARY KEY,
            username TEXT,
            first_name TEXT,
            role TEXT DEFAULT 'student',
            subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Auto-create telegram_groups table if not exists
    db.exec(`
        CREATE TABLE IF NOT EXISTS telegram_groups (
            chat_id TEXT PRIMARY KEY,
            title TEXT,
            type TEXT DEFAULT 'supergroup',
            is_active INTEGER DEFAULT 1,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Backfill any missing close_code on existing items
    const missingCodes = db.prepare("SELECT id FROM items WHERE close_code IS NULL").all();
    if (missingCodes && missingCodes.length > 0) {
        const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const nums = '23456789';
        const updateStmt = db.prepare("UPDATE items SET close_code = ? WHERE id = ?");
        for (const item of missingCodes) {
            let code = 'FND-';
            for (let i = 0; i < 2; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
            for (let i = 0; i < 3; i++) code += nums.charAt(Math.floor(Math.random() * nums.length));
            updateStmt.run(code, item.id);
        }
    }
}

initDB();

module.exports = db;
