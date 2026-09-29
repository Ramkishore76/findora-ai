/**
 * FINDORA AI – Full Supabase Reseed Script
 * Clears ALL data and inserts fresh realistic sample records.
 * Run: node backend/database/reseed_supabase.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ─── helpers ────────────────────────────────────────────────────────────────
const q = (sql, params = []) => pool.query(sql, params);
const log = (msg) => console.log(`  ${msg}`);

// ─── Timestamps ─────────────────────────────────────────────────────────────
const now  = new Date();
const d1   = new Date(now - 5 * 86400000);  // 5 days ago
const d2   = new Date(now - 3 * 86400000);  // 3 days ago
const d3   = new Date(now - 1 * 86400000);  // 1 day ago
const d4   = new Date(now - 2 * 3600000);   // 2 hours ago

async function clearAll() {
  console.log('\n Clearing all tables (cascade)...');
  const tables = [
    'fraud_alerts','claim_answers','claim_questions','recovery_cases',
    'claims','matches','item_private_attributes','embeddings',
    'notifications','audit_logs','telegram_subscribers','telegram_groups',
    'items','users'
  ];
  for (const t of tables) {
    try { await q(`DELETE FROM ${t}`); log(`cleared ${t}`); }
    catch (e) { log(`skip ${t}: ${e.message}`); }
  }
}

async function seedUsers() {
  console.log('\n Seeding users...');
  const hash = await bcrypt.hash('Findora2026!', 10);

  const users = [
    ['usr_tharun_k',   'Tharun Kumar',    'tharunkumark42007@gmail.com',   hash, 'admin',                'https://i.pravatar.cc/150?img=12'],
    ['usr_siva_k',     'Siva Kumar',      'sivakumar463703@gmail.com',     hash, 'verification_officer', 'https://i.pravatar.cc/150?img=15'],
    ['usr_santhosh_k', 'Kumar Santhosh',  'writetokumarsanthosh@gmail.com',hash, 'student',              'https://i.pravatar.cc/150?img=20'],
    ['usr_priya_m',    'Priya Meenakshi', 'priya.vsb@gmail.com',           hash, 'student',              'https://i.pravatar.cc/150?img=47'],
    ['usr_demo_admin', 'System Admin',    'admin@findora.local',           hash, 'admin',                'https://i.pravatar.cc/150?img=68'],
  ];

  for (const [id,name,email,ph,role,avatar] of users) {
    await q(`
      INSERT INTO users (id,name,email,password_hash,role,avatar,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, role=EXCLUDED.role
    `, [id, name, email, ph, role, avatar, d1]);
    log(`[${role}] ${name} — ${email}`);
  }
}

async function seedItems() {
  console.log('\n Seeding items...');

  const items = [
    {
      id:'item_lost_001', type:'LOST', status:'OPEN',
      title:'Blue Dell Laptop',
      description:'Dell Inspiron 15 3000 series, blue lid with a small crack on top-right corner. Has a VSB CSE sticker on the palm rest.',
      category:'Electronics', color:'Blue', brand:'Dell', model:'Inspiron 15 3000',
      image:'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Dell_Laptop.jpg/320px-Dell_Laptop.jpg',
      location:'Block A – Computer Lab', building:'Block A', floor:2,
      event_time: d1, owner_id:'usr_santhosh_k',
      serial_number:'SN-DL-7834XC', unique_marks:'VSB CSE sticker, crack on lid',
      damage_details:'Small crack top-right corner', hidden_features:'Login password hint: Santhosh@123',
      close_code:'LOST-ABC1', condition: null, closed_at: null, closed_by: null
    },
    {
      id:'item_found_001', type:'FOUND', status:'OPEN',
      title:'Black JBL Earbuds Case',
      description:'JBL Tune 230NC TWS charging case, black. Found near library entrance bench. Earbuds are inside.',
      category:'Electronics', color:'Black', brand:'JBL', model:'Tune 230NC TWS',
      image:'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/No_image.svg/320px-No_image.svg.png',
      location:'Library – Entrance Bench', building:'Library Block', floor:1,
      event_time: d2, owner_id:'usr_priya_m',
      serial_number: null, unique_marks:'Small scratch on lid',
      damage_details: null, hidden_features: null,
      close_code:'FIND-XB29', condition:'Good – fully functional', closed_at: null, closed_by: null
    },
    {
      id:'item_lost_002', type:'LOST', status:'OPEN',
      title:'Maroon College ID Card',
      description:'VSB Engineering College student ID. Name: Santhosh Kumar, Roll No: 22CSA045. Lost near the canteen.',
      category:'Documents', color:'Maroon', brand: null, model: null,
      image:'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/No_image.svg/320px-No_image.svg.png',
      location:'Canteen – Near Counter 3', building:'Canteen Block', floor:1,
      event_time: d3, owner_id:'usr_santhosh_k',
      serial_number:'22CSA045', unique_marks:'Photo ID, blood group O+',
      damage_details: null, hidden_features:'Roll number printed on back',
      close_code:'LOST-CD44', condition: null, closed_at: null, closed_by: null
    },
    {
      id:'item_found_002', type:'FOUND', status:'RECOVERED',
      title:'Grey HP Laptop Bag',
      description:'HP branded grey laptop backpack found in Seminar Hall after the cloud computing workshop. No laptop inside.',
      category:'Bags', color:'Grey', brand:'HP', model:'Active Backpack 15.6"',
      image:'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/No_image.svg/320px-No_image.svg.png',
      location:'Seminar Hall – Row 4', building:'Block B', floor:3,
      event_time: d2, owner_id:'usr_tharun_k',
      serial_number: null, unique_marks:'HP logo, grey mesh front pocket',
      damage_details: null, hidden_features: null,
      close_code:'FIND-RCV9', condition:'Excellent', closed_at: d4, closed_by:'Siva Kumar'
    },
  ];

  for (const item of items) {
    await q(`
      INSERT INTO items (
        id,type,title,description,category,color,brand,model,
        image,location,building,floor,event_time,created_at,
        status,owner_id,condition,serial_number,unique_marks,
        damage_details,hidden_features,close_code,closed_at,closed_by
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,$13,$14,
        $15,$16,$17,$18,$19,
        $20,$21,$22,$23,$24
      )
      ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, closed_at=EXCLUDED.closed_at
    `, [
      item.id, item.type, item.title, item.description, item.category,
      item.color, item.brand, item.model,
      item.image, item.location, item.building, item.floor,
      item.event_time, item.event_time,
      item.status, item.owner_id, item.condition,
      item.serial_number, item.unique_marks,
      item.damage_details, item.hidden_features,
      item.close_code, item.closed_at, item.closed_by
    ]);
    log(`[${item.type}/${item.status}] ${item.title}`);
  }
}

async function seedPrivateAttributes() {
  console.log('\n Seeding private attributes...');
  const privs = [
    ['priv_lost_001','item_lost_001','SN-DL-7834XC','VSB CSE sticker, crack on lid','Small crack top-right corner','Login hint: Santhosh@123'],
    ['priv_lost_002','item_lost_002','22CSA045',     'Photo ID, blood group O+',     null,                          'Roll number on back'],
  ];
  for (const [id, item_id, sn, um, dd, hf] of privs) {
    await q(`
      INSERT INTO item_private_attributes (id,item_id,serial_number,unique_marks,damage_details,hidden_features,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (item_id) DO NOTHING
    `, [id, item_id, sn, um, dd, hf, now]);
    log(`private attrs → ${item_id}`);
  }
}

async function seedMatches() {
  console.log('\n Seeding AI match...');
  await q(`
    INSERT INTO matches (
      id,lost_item_id,found_item_id,
      final_score,visual_score,text_score,location_score,
      time_score,category_score,attribute_score,
      explanation,status,created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (id) DO NOTHING
  `, [
    'match_001','item_lost_001','item_found_001',
    0.42,0.30,0.55,0.60,0.40,0.20,0.45,
    JSON.stringify({reason:'Same building zone, similar report time window'}),
    'PENDING', d3
  ]);
  log('AI match: item_lost_001 vs item_found_001 — 42% PENDING');
}

async function seedNotifications() {
  console.log('\n Seeding notifications...');
  const notifs = [
    ['notif_001','usr_santhosh_k','ITEM_REPORTED', 'Lost Item Reported',       'Your Blue Dell Laptop has been reported. Track in app.',            d1],
    ['notif_002','usr_priya_m',   'ITEM_REPORTED', 'Found Item Submitted',      'JBL Earbuds Case logged. We will match it with lost items.',         d2],
    ['notif_003','usr_santhosh_k','MATCH_ALERT',   'Potential Match Found!',    'A found item may match your Blue Dell Laptop (42% confidence).',     d3],
    ['notif_004','usr_tharun_k',  'HANDOVER_READY','Item Recovered & Closed',   'HP Laptop Bag verified and returned by Siva Kumar. Search closed.',  d4],
  ];
  for (const [id,uid,type,title,msg,ts] of notifs) {
    await q(`
      INSERT INTO notifications (id,user_id,type,title,message,read,created_at)
      VALUES ($1,$2,$3,$4,$5,0,$6)
      ON CONFLICT (id) DO NOTHING
    `, [id, uid, type, title, msg, ts]);
    log(`[${type}] ${title}`);
  }
}

async function seedAuditLogs() {
  console.log('\n Seeding audit_logs...');
  const entries = [
    ['aud_001','usr_santhosh_k','REPORT_LOST_ITEM',    'items','item_lost_001', 'Reported lost: Blue Dell Laptop (Code: LOST-ABC1)',        d1],
    ['aud_002','usr_priya_m',   'REPORT_FOUND_ITEM',   'items','item_found_001','Turned in found: JBL Earbuds Case (Code: FIND-XB29)',      d2],
    ['aud_003','usr_santhosh_k','REPORT_LOST_ITEM',    'items','item_lost_002', 'Reported lost: Maroon College ID Card (Code: LOST-CD44)',  d3],
    ['aud_004','usr_siva_k',    'SEARCH_CLOSED_BY_CODE','items','item_found_002','Code FIND-RCV9 verified. HP Bag returned.',               d4],
    ['aud_005','usr_tharun_k',  'LOGIN',               'users','usr_tharun_k',  'Admin login from dashboard',                              now],
  ];
  for (const [id,uid,action,et,eid,detail,ts] of entries) {
    await q(`
      INSERT INTO audit_logs (id,user_id,action,target_type,target_id,details,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (id) DO NOTHING
    `, [id, uid, action, et, eid, detail, ts]);
    log(`${action}: ${detail.substring(0,55)}`);
  }
}

async function seedTelegram() {
  console.log('\n Seeding telegram_subscribers...');
  await q(`
    INSERT INTO telegram_subscribers (chat_id,username,first_name,role,subscribed_at)
    VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (chat_id) DO NOTHING
  `, ['123456789','tharun_vsb','Tharun','admin', d1]);
  log('subscriber: tharun_vsb');
}

async function verifyAll() {
  console.log('\n Row counts after reseed:\n');
  const tables = ['users','items','item_private_attributes','matches','notifications','audit_logs','telegram_subscribers'];
  for (const t of tables) {
    const res = await q(`SELECT COUNT(*) FROM ${t}`);
    console.log(`    ${t.padEnd(32)} ${res.rows[0].count} rows`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log('FINDORA AI - Supabase Reseed Starting...');
    console.log(`Database: ${(process.env.DATABASE_URL || '').substring(0, 55)}...`);

    await clearAll();
    await seedUsers();
    await seedItems();
    await seedPrivateAttributes();
    await seedMatches();
    await seedNotifications();
    await seedAuditLogs();
    await seedTelegram();
    await verifyAll();

    console.log('\nRESEED COMPLETE! All tables populated.\n');
  } catch (err) {
    console.error('\nRESEED FAILED:', err.message);
    console.error(err.stack);
  } finally {
    await pool.end();
  }
})();
