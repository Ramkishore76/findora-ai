const path = require('path');
const fs = require('fs');
const schemaSql = require('./schemaDefinition');

let Database;
try {
    Database = require('better-sqlite3');
} catch (err) {
    console.warn('[DB] Native better-sqlite3 not loadable in this runtime:', err.message);
}

let dbInstance = null;

if (Database) {
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

    try {
        dbInstance = new Database(dbPath);
        try {
            dbInstance.pragma('journal_mode = WAL');
        } catch (e) {
            dbInstance.pragma('journal_mode = MEMORY');
        }
        dbInstance.pragma('foreign_keys = ON');
    } catch (dbErr) {
        console.error('[DB] Failed to open SQLite at ' + dbPath + ':', dbErr.message);
        // Fallback to in-memory SQLite if /tmp fails
        try {
            dbInstance = new Database(':memory:');
        } catch (memErr) {
            console.error('[DB] Memory fallback also failed:', memErr.message);
        }
    }
}

// In-Memory Storage Fallback if native driver cannot run on Lambda
class InMemoryDb {
    constructor() {
        this.tables = {
            users: [],
            items: [],
            item_private_attributes: [],
            embeddings: [],
            matches: [],
            claims: [],
            claim_questions: [],
            claim_answers: [],
            fraud_alerts: [],
            recovery_cases: [],
            notifications: [],
            audit_logs: [],
            telegram_subscribers: [],
            telegram_groups: []
        };
    }
    exec(sql) { return this; }
    pragma(cmd) { return []; }
    prepare(sql) {
        const self = this;
        const normalized = sql.trim();
        return {
            all(...params) {
                if (/FROM\s+users/i.test(normalized)) return [...self.tables.users];
                if (/FROM\s+items/i.test(normalized)) return [...self.tables.items];
                if (/FROM\s+telegram_groups/i.test(normalized)) return [...self.tables.telegram_groups];
                if (/FROM\s+telegram_subscribers/i.test(normalized)) return [...self.tables.telegram_subscribers];
                if (/FROM\s+notifications/i.test(normalized)) return [...self.tables.notifications];
                if (/FROM\s+claims/i.test(normalized)) return [...self.tables.claims];
                if (/FROM\s+matches/i.test(normalized)) return [...self.tables.matches];
                return [];
            },
            get(...params) {
                if (/count\(\*\)/i.test(normalized)) {
                    if (/FROM\s+users/i.test(normalized)) return { count: self.tables.users.length, c: self.tables.users.length };
                    if (/FROM\s+items/i.test(normalized)) return { count: self.tables.items.length, c: self.tables.items.length };
                    return { count: 0, c: 0 };
                }
                if (/FROM\s+users\s+WHERE/i.test(normalized) && params[0]) {
                    const search = String(params[0]).toLowerCase();
                    return self.tables.users.find(u => u.email.toLowerCase() === search || u.id === search);
                }
                if (/FROM\s+items\s+WHERE/i.test(normalized) && params[0]) {
                    return self.tables.items.find(i => i.id === params[0]);
                }
                if (/FROM\s+users/i.test(normalized)) return self.tables.users[0];
                if (/FROM\s+items/i.test(normalized)) return self.tables.items[0];
                return undefined;
            },
            run(...params) {
                if (/INSERT\s+INTO\s+users/i.test(normalized)) {
                    self.tables.users.push({
                        id: params[0],
                        name: params[1],
                        email: params[2],
                        password_hash: params[3],
                        role: params[4] || 'student'
                    });
                }
                return { changes: 1, lastInsertRowid: Date.now() };
            }
        };
    }
}

const db = dbInstance || new InMemoryDb();

// Initialize tables & seed
function initDB() {
    try {
        db.exec(schemaSql);
    } catch (e) {
        console.warn('[DB Init Schema Warning]:', e.message);
    }

    // Auto-create missing tables if needed
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS telegram_subscribers (
                chat_id TEXT PRIMARY KEY,
                username TEXT,
                first_name TEXT,
                role TEXT DEFAULT 'student',
                subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS telegram_groups (
                chat_id TEXT PRIMARY KEY,
                title TEXT,
                type TEXT DEFAULT 'supergroup',
                is_active INTEGER DEFAULT 1,
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
    } catch (e) {}

    // Auto-seed default users if table is empty
    try {
        const userCheck = db.prepare("SELECT count(*) as c FROM users").get();
        const userCount = userCheck ? (userCheck.c || userCheck.count || 0) : 0;
        
        if (userCount === 0) {
            const bcrypt = require('bcryptjs');
            const defaultPassword = process.env.ADMIN_PASSWORD || 'Findora2026!';
            const passwordHash = bcrypt.hashSync(defaultPassword, 8);

            const insertUser = db.prepare(`
                INSERT OR IGNORE INTO users (id, name, email, password_hash, role, avatar)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            insertUser.run(
                'usr_1790666586110',
                'Tharun Kumar',
                'tharunkumark42007@gmail.com',
                passwordHash,
                'admin',
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
            );

            insertUser.run(
                'usr_siva_k',
                'Siva Kumar',
                'sivakumar463703@gmail.com',
                passwordHash,
                'verification_officer',
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
            );

            insertUser.run(
                'usr_santhosh_k',
                'Kumar Santhosh',
                'writetokumarsanthosh@gmail.com',
                passwordHash,
                'student',
                'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
            );

            insertUser.run(
                'usr_demo_admin',
                'System Admin',
                'admin@findora.local',
                passwordHash,
                'admin',
                'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
            );

            console.log('[DB] ✅ Seeded initial admin & demo users with password:', defaultPassword);
        }
    } catch (e) {
        console.warn('[DB User Seed Warning]:', e.message);
    }
}

initDB();

module.exports = db;
