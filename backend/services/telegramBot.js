// FINDORA AI - Telegram Bot Service (@findoravsb_bot)
// Dual-Channel Architecture:
// 1) Individual Student Mode: Private 1-on-1 chats for personal notifications, status, and confidential 1-Time Codes.
// 2) Campus Group Mode: Admin in official campus community group (https://t.me/+V_U9BauJqKQ2NzE1)
//    broadcasting visual lost & found summaries, images, and live incident telemetry.

const fs = require('fs');
const path = require('path');
const db = require('../database/db');

class TelegramBotService {
  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN || '';
    this.botUsername = process.env.TELEGRAM_BOT_USERNAME || 'findoravsb_bot';
    this.campusGroupLink = process.env.TELEGRAM_CAMPUS_GROUP_LINK || 'https://t.me/+V_U9BauJqKQ2NzE1';
    this.campusGroupId = process.env.TELEGRAM_CAMPUS_GROUP_ID || '';
    this.apiUrl = `https://api.telegram.org/bot${this.token}`;
    this.polling = false;
    this.pollOffset = 0;
    this.pollingTimeout = null;
    this.connected = false;
    this.lastError = null;
    this.botInfo = null;
    this.captureSimulatedReplies = false;
    this.simulatedReplies = [];
  }

  /**
   * Initialize Bot and start polling if token is provided
   */
  async init() {
    this.token = process.env.TELEGRAM_BOT_TOKEN || '';
    this.apiUrl = `https://api.telegram.org/bot${this.token}`;
    this.connected = false;
    this.lastError = null;

    if (!this.token || this.token.includes('YOUR_TELEGRAM_BOT_TOKEN') || this.token.includes('placeholder')) {
      console.log(`[TELEGRAM BOT] ℹ️ Simulation Mode active for @${this.botUsername}.`);
      console.log(`[TELEGRAM BOT] 💡 Set a live TELEGRAM_BOT_TOKEN in backend/.env to connect to Telegram live.`);
      console.log(`[TELEGRAM BOT] 👥 Campus Group configured: ${this.campusGroupLink}`);
      return;
    }

    try {
      const res = await fetch(`${this.apiUrl}/getMe`);
      const data = await res.json();

      if (data.ok) {
        this.connected = true;
        this.botInfo = data.result;
        this.botUsername = data.result.username || this.botUsername;
        console.log(`[TELEGRAM BOT] ✅ Connected successfully to Telegram as @${data.result.username} (${data.result.first_name})`);
        console.log(`[TELEGRAM BOT] 👥 Ready for Campus Community Group: ${this.campusGroupLink}`);
        this.startPolling();
      } else {
        this.connected = false;
        this.lastError = data.description;
        console.warn(`[TELEGRAM BOT] ⚠️ Telegram API returned error: ${data.description}`);
        console.log(`[TELEGRAM BOT] ℹ️ Operating in local Simulation Mode.`);
      }
    } catch (err) {
      this.connected = false;
      this.lastError = err.message;
      console.error(`[TELEGRAM BOT] ❌ Network error connecting to Telegram: ${err.message}`);
    }
  }

  /**
   * Start long-polling for updates
   */
  async startPolling() {
    if (this.polling) return;
    this.polling = true;
    console.log(`[TELEGRAM BOT] 🔄 Polling started for @${this.botUsername}...`);
    this.pollLoop();
  }

  /**
   * Stop polling gracefully
   */
  stopPolling() {
    this.polling = false;
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = null;
    }
  }

  /**
   * Continuous Polling Loop
   */
  async pollLoop() {
    if (!this.polling) return;

    try {
      const url = `${this.apiUrl}/getUpdates?offset=${this.pollOffset}&timeout=20&allowed_updates=["message","my_chat_member","chat_member"]`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          this.pollOffset = update.update_id + 1;
          await this.handleUpdate(update);
        }
      }
    } catch (err) {
      // Avoid spamming on temporary network disconnection
    }

    if (this.polling) {
      this.pollingTimeout = setTimeout(() => this.pollLoop(), 1500);
    }
  }

  /**
   * Process incoming update / message
   */
  async handleUpdate(update) {
    // 1. Handle bot added to group as admin/member
    if (update.my_chat_member) {
      const myMember = update.my_chat_member;
      const chat = myMember.chat;
      const status = myMember.new_chat_member ? myMember.new_chat_member.status : '';

      if (['administrator', 'member'].includes(status)) {
        this.registerGroup(chat.id.toString(), chat.title || 'Campus Lost & Found Group', chat.type);
        const welcomeText = 
`🎓 *FINDORA AI Campus Bot is now ACTIVE in ${chat.title || 'this group'}!*

Hello everyone! I have joined as your automated Campus Lost & Found assistant.

📋 *Campus Group Commands:*
📊 \`/summary\` — Visual summary of all active lost & found items (with photos & locations!)
🔍 \`/lost\` — View items currently missing across campus
📦 \`/found\` — Browse items safely turned in at campus facilities
📸 \`/report\` — Guide to submit verified reports with live camera
ℹ️ \`/status <id>\` — Check search status of an item

🔒 *For Students (Confidential Handover Codes):*
To view your private 1-Time Handover Code, message me directly in private chat: [@${this.botUsername}](https://t.me/${this.botUsername}) (never leak codes in this group!).`;

        await this.sendMessage(chat.id.toString(), welcomeText, { parse_mode: 'Markdown' });
      } else if (['left', 'kicked'].includes(status)) {
        this.deactivateGroup(chat.id.toString());
      }
      return;
    }

    const message = update.message || update.channel_post;
    if (!message) return;

    const chat = message.chat || {};
    const chatId = chat.id ? chat.id.toString() : '';
    const chatType = chat.type || 'private';
    const isGroup = chatType === 'group' || chatType === 'supergroup';
    const isPrivate = chatType === 'private';
    const text = (message.text || '').trim();
    const fromUser = message.from || {};
    const username = fromUser.username || fromUser.first_name || 'Campus Member';

    // Auto-register group or private subscriber
    if (isGroup) {
      this.registerGroup(chatId, chat.title || 'Campus Community Group', chatType);
    } else {
      this.registerSubscriber(chatId, username, fromUser.first_name);
    }

    if (!text) return;

    // Command Router
    const parts = text.split(/\s+/);
    const cmd = parts[0].toLowerCase().split('@')[0]; // Strip @findoravsb_bot handle if present
    const args = parts.slice(1);

    switch (cmd) {
      case '/start':
        if (isGroup) {
          await this.handleGroupStartCommand(chatId, chat.title);
        } else {
          await this.handleStartCommand(chatId, fromUser);
        }
        break;

      case '/summary':
      case '/campus':
        await this.handleGroupSummaryCommand(chatId, isGroup);
        break;

      case '/help':
        await this.handleHelpCommand(chatId, isGroup);
        break;

      case '/lost':
        await this.handleLostCommand(chatId, isGroup);
        break;

      case '/found':
        await this.handleFoundCommand(chatId, isGroup);
        break;

      case '/status':
        await this.handleStatusCommand(chatId, args, isGroup);
        break;

      case '/code':
        if (isGroup) {
          // Security block in public groups
          await this.sendMessage(chatId, 
`🔒 *Confidentiality Notice:*
1-Time Handover Codes are secret proof of item ownership. For your security, codes are **never** revealed in public groups.

👉 Please open a private message with [@${this.botUsername}](https://t.me/${this.botUsername}) and type:
\`/code ${args[0] || '<item_id>'}\``, { parse_mode: 'Markdown' });
        } else {
          await this.handleCodeCommand(chatId, args);
        }
        break;

      case '/myreports':
        if (isGroup) {
          await this.sendMessage(chatId, `ℹ️ Personal reports contain private handover codes. Please check \`/myreports\` in a private direct message with [@${this.botUsername}](https://t.me/${this.botUsername}).`, { parse_mode: 'Markdown' });
        } else {
          await this.handleMyReportsCommand(chatId, fromUser);
        }
        break;

      case '/close':
      case '/verify':
        await this.handleCloseCommand(chatId, args, username, isGroup);
        break;

      case '/report':
        await this.handleReportCommand(chatId, isGroup);
        break;

      default:
        if (text.startsWith('/') && !isGroup) {
          await this.sendMessage(chatId, `❓ Unknown command "${cmd}". Type /help to see all available commands.`);
        }
        break;
    }
  }

  /**
   * Register or update subscriber in SQLite
   */
  registerSubscriber(chatId, username, firstName) {
    try {
      db.prepare(`
        INSERT INTO telegram_subscribers (chat_id, username, first_name, subscribed_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(chat_id) DO UPDATE SET
          username = excluded.username,
          first_name = excluded.first_name
      `).run(chatId, username || 'Anonymous', firstName || 'User');
    } catch (e) {
      console.error('[TELEGRAM BOT] Error saving subscriber:', e.message);
    }
  }

  /**
   * Register or update campus community group in SQLite
   */
  registerGroup(chatId, title, type) {
    try {
      db.prepare(`
        INSERT INTO telegram_groups (chat_id, title, type, is_active, updated_at)
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(chat_id) DO UPDATE SET
          title = excluded.title,
          type = excluded.type,
          is_active = 1,
          updated_at = CURRENT_TIMESTAMP
      `).run(chatId, title || 'Campus Community Group', type || 'supergroup');
      console.log(`[TELEGRAM BOT] 📌 Campus Group active: "${title}" (${chatId})`);
    } catch (e) {
      console.error('[TELEGRAM BOT] Error saving group:', e.message);
    }
  }

  /**
   * Deactivate group when bot is removed
   */
  deactivateGroup(chatId) {
    try {
      db.prepare(`
        UPDATE telegram_groups
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE chat_id = ?
      `).run(chatId);
      console.log(`[TELEGRAM BOT] ℹ️ Group deactivated: ${chatId}`);
    } catch (e) {
      console.error('[TELEGRAM BOT] Error deactivating group:', e.message);
    }
  }

  /**
   * /start Command - Individual Student (Private Chat)
   */
  async handleStartCommand(chatId, fromUser) {
    const name = fromUser.first_name || 'Student';
    const text = 
`🎓 *Welcome to FINDORA Campus Lost & Found Bot (@${this.botUsername})!*

Hello ${name}! I am your personal campus AI assistant for tracking lost items, checking item statuses, and retrieving your secret 1-Time Handover Codes.

📋 *Personal Commands:*
🔍 \`/lost\` — View active lost items currently searched
📦 \`/found\` — View items recently turned in across campus
ℹ️ \`/status <item_id>\` — Check real-time search status of an item
🔑 \`/code <item_id>\` — Retrieve your secret 1-Time Handover Code
📋 \`/myreports\` — View all your reports and codes
📸 \`/report\` — Guide to report items via Web Portal with Live Camera
❓ \`/help\` — Complete command reference

👥 *Official Campus Community Group:*
Join our campus-wide group for real-time broadcasts and photos:
👉 [Join Findora Campus Group](${this.campusGroupLink})

🔔 *Notifications:*
You are registered for direct alerts whenever an item matching yours is found or updated!`;

    await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  }

  /**
   * /start Command - Campus Group Chat
   */
  async handleGroupStartCommand(chatId, groupTitle) {
    const text = 
`🎓 *FINDORA Campus Lost & Found System Active in ${groupTitle || 'this group'}!*

This group receives automatic campus-wide broadcasts for newly reported lost items, turned-in found items, and recovery milestones.

📋 *Group Commands:*
📊 \`/summary\` — Comprehensive visual summary of all campus lost & found items with photos & locations
🔍 \`/lost\` — View current active lost items
📦 \`/found\` — Browse items staged at campus facilities
📸 \`/report\` — Guide to report items via Live Camera portal
❓ \`/help\` — Full command list

🔒 *Students:* For private 1-Time Handover Codes, please message [@${this.botUsername}](https://t.me/${this.botUsername}) in direct chat!`;

    await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  }

  /**
   * /summary Command - Comprehensive Visual Campus Summary (with Photos & Locations)
   */
  async handleGroupSummaryCommand(chatId, isGroup = false) {
    try {
      const lostItems = db.prepare(`
        SELECT id, title, category, building, floor, location, latitude, longitude, image, brand, event_time
        FROM items
        WHERE type = 'LOST' AND status = 'OPEN'
        ORDER BY created_at DESC
      `).all() || [];

      const foundItems = db.prepare(`
        SELECT id, title, category, building, floor, location, latitude, longitude, image, condition, event_time
        FROM items
        WHERE type = 'FOUND' AND status = 'OPEN'
        ORDER BY created_at DESC
      `).all() || [];

      const recoveredCount = db.prepare(`
        SELECT count(*) as count FROM items WHERE status IN ('RECOVERED', 'CLOSED')
      `).get()?.count || 0;

      // Group counts by facility / building
      const facilities = {};
      [...lostItems, ...foundItems].forEach(item => {
        const b = item.building || 'Campus Central';
        facilities[b] = (facilities[b] || 0) + 1;
      });

      const facilityBreakdown = Object.entries(facilities)
        .map(([b, count]) => `• *${b}:* ${count} active item(s)`)
        .join('\n') || '• *Campus Wide:* No active reports';

      let summaryHeader = 
`📊 *FINDORA CAMPUS LOST & FOUND INTELLIGENCE SUMMARY*
🏢 *Official Campus Incident Registry & Spatial Telemetry*

📈 *Current Campus Status:*
• 🔍 *Active Lost Items:* ${lostItems.length}
• 📦 *Active Found Items Staged:* ${foundItems.length}
• 🎉 *Officially Recovered:* ${recoveredCount}
• 🌐 *Web Portal:* http://localhost:3000

🏛️ *Activity by Facility:*
${facilityBreakdown}`;

      let detailedBody = `\n\n═══════════════════════════\n`;

      if (lostItems.length > 0) {
        detailedBody += `🔍 *ACTIVE LOST ITEMS (${lostItems.length}):*\n`;
        lostItems.slice(0, 5).forEach((item, idx) => {
          detailedBody += `\n*${idx + 1}. ${item.title}* [${item.category}]\n`;
          detailedBody += `   🏢 *Facility:* ${item.building} (Floor ${item.floor || 1})\n`;
          detailedBody += `   📍 *Area:* ${item.location || 'Reported on campus'}\n`;
          if (item.latitude && item.longitude) {
            detailedBody += `   🛰️ *GPS:* \`${item.latitude.toFixed(4)}°N, ${item.longitude.toFixed(4)}°E\`\n`;
          }
          detailedBody += `   🕒 *Time:* ${new Date(item.event_time).toLocaleDateString()} ${new Date(item.event_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
          detailedBody += `   🆔 \`${item.id}\`\n`;
        });
      } else {
        detailedBody += `\n✅ *No active lost items currently reported on campus.*\n`;
      }

      detailedBody += `\n═══════════════════════════\n`;

      if (foundItems.length > 0) {
        detailedBody += `📦 *RECENTLY FOUND ITEMS STAGED FOR CLAIM (${foundItems.length}):*\n`;
        foundItems.slice(0, 5).forEach((item, idx) => {
          detailedBody += `\n*${idx + 1}. ${item.title}* [${item.category}]\n`;
          detailedBody += `   🏢 *Staged At:* ${item.building} (Floor ${item.floor || 1})\n`;
          detailedBody += `   ⚙️ *Condition:* ${item.condition || 'Operational'}\n`;
          if (item.latitude && item.longitude) {
            detailedBody += `   🛰️ *GPS:* \`${item.latitude.toFixed(4)}°N, ${item.longitude.toFixed(4)}°E\`\n`;
          }
          detailedBody += `   🆔 \`${item.id}\`\n`;
        });
        detailedBody += `\n🔑 *To claim:* Submit verification via http://localhost:3000 or contact Campus Security.`;
      } else {
        detailedBody += `\n📦 *No unclaimed found items currently staged.*\n`;
      }

      detailedBody += `\n\n🔒 *Students:* Direct message [@${this.botUsername}](https://t.me/${this.botUsername}) in private chat to safely retrieve your secret 1-Time Handover Codes!`;

      // Find flagship item with an image to feature
      const itemWithImage = lostItems.find(i => i.image) || foundItems.find(i => i.image);

      if (itemWithImage && itemWithImage.image) {
        const photoCaption = 
`📸 *CAMPUS RADAR: ${itemWithImage.title}*
📍 *Location:* ${itemWithImage.building} (Floor ${itemWithImage.floor || 1})
📁 *Category:* ${itemWithImage.category}
${summaryHeader}`.substring(0, 1024);

        await this.sendPhoto(chatId, itemWithImage.image, photoCaption);
        await this.sendMessage(chatId, detailedBody, { parse_mode: 'Markdown' });
      } else {
        await this.sendMessage(chatId, summaryHeader + detailedBody, { parse_mode: 'Markdown' });
      }
    } catch (e) {
      await this.sendMessage(chatId, `❌ Error generating campus summary: ${e.message}`);
    }
  }

  /**
   * /help Command
   */
  async handleHelpCommand(chatId, isGroup = false) {
    if (isGroup) {
      const text = 
`📚 *FINDORA Bot Group Manual (@${this.botUsername})*
🏢 *Campus Lost & Found Community Hub*

👥 *Campus Commands for this Group:*
• \`/summary\` (or \`/campus\`) — Visual summary of all active lost & found items with photos, locations & statistics!
• \`/lost\` — List the 5 most recent active lost items
• \`/found\` — Browse staged found items
• \`/status <item_id>\` — Check public status of an item
• \`/report\` — Guide to submit reports with live camera

🔒 *Private Commands (Direct Message @${this.botUsername}):*
• \`/code <item_id>\` — Retrieve confidential 1-Time Handover Code
• \`/myreports\` — View all your reports and codes
• \`/close <code>\` — Verification Officers custody code verification

🌐 *Web Portal:* http://localhost:3000`;
      await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } else {
      const text = 
`📚 *FINDORA Bot Command Manual (@${this.botUsername})*

*For Students & Reporters:*
• \`/lost\` — List the 5 most recent active lost item searches.
• \`/found\` — Browse recently found items staged at campus facilities.
• \`/status <item_id>\` — Look up the live status of any reported item.
• \`/code <item_id>\` — View the 1-Time Recovery Code for an item you reported. Give this code to the verification officer when you retrieve your item.
• \`/myreports\` — List all reports filed by you and your secret handover codes.
• \`/report\` — Get direct links to the Live Camera registration portal.

*Official Community Group:*
Join our community group for visual photo summaries and campus alerts:
👉 [Findora Campus Group](${this.campusGroupLink})

*For Verification Officers & Admins:*
• \`/close <code>\` (or \`/verify <code>\`) — Enter the 1-time code provided by the student (e.g. \`/close FND-AB123\`). This verifies custody, marks the item RECOVERED, and officially closes the search in the registry!

*Web Portal:*
🌐 http://localhost:3000`;
      await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    }
  }

  /**
   * /lost Command - Display active lost items
   */
  async handleLostCommand(chatId, isGroup = false) {
    try {
      const items = db.prepare(`
        SELECT id, title, category, building, floor, location, latitude, longitude, image, event_time
        FROM items
        WHERE type = 'LOST' AND status = 'OPEN'
        ORDER BY created_at DESC
        LIMIT 5
      `).all();

      if (!items || items.length === 0) {
        await this.sendMessage(chatId, '✅ Great news! There are currently no active lost item reports on campus.');
        return;
      }

      let response = `🔍 *Active Lost Items on Campus (${items.length}):*\n\n`;
      items.forEach((item, index) => {
        response += `*${index + 1}. ${item.title}*\n`;
        response += `📁 Category: ${item.category}\n`;
        response += `📍 Location: ${item.building} (Floor ${item.floor || 1})\n`;
        if (item.location) response += `📌 Details: ${item.location}\n`;
        if (item.latitude && item.longitude) {
          response += `🛰️ GPS: \`${item.latitude.toFixed(4)}°N, ${item.longitude.toFixed(4)}°E\`\n`;
        }
        response += `🕒 Time: ${new Date(item.event_time).toLocaleString()}\n`;
        response += `🆔 ID: \`${item.id}\`\n\n`;
      });

      response += `If you found any of these items, please message /found or bring it to the Central Library security desk!`;
      
      const itemWithImage = items.find(i => i.image);
      if (itemWithImage && itemWithImage.image) {
        await this.sendPhoto(chatId, itemWithImage.image, response.substring(0, 1024));
      } else {
        await this.sendMessage(chatId, response, { parse_mode: 'Markdown' });
      }
    } catch (e) {
      await this.sendMessage(chatId, `❌ Error retrieving lost items: ${e.message}`);
    }
  }

  /**
   * /found Command - Display recently found items
   */
  async handleFoundCommand(chatId, isGroup = false) {
    try {
      const items = db.prepare(`
        SELECT id, title, category, building, floor, location, latitude, longitude, condition, image, event_time
        FROM items
        WHERE type = 'FOUND' AND status = 'OPEN'
        ORDER BY created_at DESC
        LIMIT 5
      `).all();

      if (!items || items.length === 0) {
        await this.sendMessage(chatId, '📦 No unclaimed found items currently registered.');
        return;
      }

      let response = `📦 *Recently Found Items Staged on Campus (${items.length}):*\n\n`;
      items.forEach((item, index) => {
        response += `*${index + 1}. ${item.title}*\n`;
        response += `📁 Category: ${item.category}\n`;
        response += `📍 Staged At: ${item.building} (Floor ${item.floor || 1})\n`;
        response += `⚙️ Condition: ${item.condition || 'Operational'}\n`;
        if (item.latitude && item.longitude) {
          response += `🛰️ GPS: \`${item.latitude.toFixed(4)}°N, ${item.longitude.toFixed(4)}°E\`\n`;
        }
        response += `🆔 ID: \`${item.id}\`\n\n`;
      });

      response += `To claim an item, submit a claim through the Findora web portal (http://localhost:3000) or contact Campus Security.`;
      
      const itemWithImage = items.find(i => i.image);
      if (itemWithImage && itemWithImage.image) {
        await this.sendPhoto(chatId, itemWithImage.image, response.substring(0, 1024));
      } else {
        await this.sendMessage(chatId, response, { parse_mode: 'Markdown' });
      }
    } catch (e) {
      await this.sendMessage(chatId, `❌ Error retrieving found items: ${e.message}`);
    }
  }

  /**
   * /status <item_id> Command
   */
  async handleStatusCommand(chatId, args, isGroup = false) {
    if (!args || args.length === 0) {
      await this.sendMessage(chatId, 'ℹ️ Usage: `/status <item_id>` (e.g. `/status item_1790664000000`)', { parse_mode: 'Markdown' });
      return;
    }

    const query = args[0].trim();
    try {
      const item = db.prepare(`
        SELECT id, title, type, category, status, building, floor, closed_at, closed_by
        FROM items
        WHERE id = ? OR title LIKE ?
        LIMIT 1
      `).get(query, `%${query}%`);

      if (!item) {
        await this.sendMessage(chatId, `⚠️ No item found matching "${query}". Please check the ID or title.`);
        return;
      }

      let statusEmoji = '🟡';
      if (item.status === 'RECOVERED' || item.status === 'CLOSED') statusEmoji = '🟢';
      if (item.status === 'MATCHED') statusEmoji = '🟣';

      let text = 
`📄 *Item Status Report*

📌 *${item.title}*
• *Type:* ${item.type}
• *Category:* ${item.category}
• *Facility:* ${item.building} Floor ${item.floor || 1}
• *Search Status:* ${statusEmoji} *${item.status}*
• *Item ID:* \`${item.id}\`\n`;

      if (item.status === 'RECOVERED' || item.status === 'CLOSED') {
        text += `\n🎉 *Search Officially Closed!*
• *Closed At:* ${item.closed_at ? new Date(item.closed_at).toLocaleString() : 'Recently'}
• *Verified By:* ${item.closed_by || 'Campus Verification Officer'}`;
      } else {
        text += `\n🔍 Search is actively ongoing in Findora Campus Network.`;
      }

      await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (e) {
      await this.sendMessage(chatId, `❌ Error checking status: ${e.message}`);
    }
  }

  /**
   * /code <item_id> Command - Confidential 1-Time Handover Code (Private Chat Only)
   */
  async handleCodeCommand(chatId, args) {
    if (!args || args.length === 0) {
      await this.sendMessage(chatId, '🔑 Usage: `/code <item_id>` (e.g. `/code item_1790664000000`)', { parse_mode: 'Markdown' });
      return;
    }

    const itemId = args[0].trim();
    try {
      const item = db.prepare(`
        SELECT id, title, type, status, close_code
        FROM items
        WHERE id = ?
      `).get(itemId);

      if (!item) {
        await this.sendMessage(chatId, `⚠️ Item with ID \`${itemId}\` not found.`, { parse_mode: 'Markdown' });
        return;
      }

      if (item.status === 'RECOVERED' || item.status === 'CLOSED') {
        await this.sendMessage(chatId, `✅ Item *${item.title}* is already marked as RECOVERED / CLOSED.`, { parse_mode: 'Markdown' });
        return;
      }

      const code = item.close_code || 'FND-CODE-PENDING';
      const text = 
`🔐 *Your Secret 1-Time Handover Code*

📌 *Item:* ${item.title}
🔑 *1-Time Code:* \`${code}\`

⚠️ *Instructions:*
Keep this code safe. When your item is located and you meet the **Campus Verification Officer** to collect it, recite this code to the officer. 

The officer will enter this code to verify custody and officially close the search.`;

      await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (e) {
      await this.sendMessage(chatId, `❌ Error retrieving code: ${e.message}`);
    }
  }

  /**
   * /myreports Command - List student's reports and secret codes (Private Chat Only)
   */
  async handleMyReportsCommand(chatId, fromUser) {
    try {
      const items = db.prepare(`
        SELECT id, title, type, category, status, building, floor, close_code, created_at
        FROM items
        ORDER BY created_at DESC
        LIMIT 5
      `).all();

      if (!items || items.length === 0) {
        await this.sendMessage(chatId, '📝 You currently have no reports registered in Findora.');
        return;
      }

      let text = `📋 *Your Campus Lost & Found Reports (${items.length}):*\n\n`;
      items.forEach((item, idx) => {
        text += `*${idx + 1}. ${item.title}* [${item.type}]\n`;
        text += `• *Status:* ${item.status}\n`;
        text += `• *Facility:* ${item.building} (Floor ${item.floor || 1})\n`;
        text += `• *1-Time Handover Code:* \`${item.close_code || 'N/A'}\`\n`;
        text += `• *Item ID:* \`${item.id}\`\n\n`;
      });

      text += `⚠️ *Confidentiality Notice:* Keep your 1-time handover code secret until meeting the Campus Verification Officer.`;
      await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (e) {
      await this.sendMessage(chatId, `❌ Error retrieving reports: ${e.message}`);
    }
  }

  /**
   * /close <code> or /verify <code> Command - Verification Officer search closure
   */
  async handleCloseCommand(chatId, args, username, isGroup = false) {
    if (!args || args.length === 0) {
      await this.sendMessage(chatId, '🛡️ Usage: `/close <1-time-code>` (e.g. `/close FND-AB123`)', { parse_mode: 'Markdown' });
      return;
    }

    const code = args[0].trim().toUpperCase();

    try {
      const item = db.prepare(`
        SELECT * FROM items
        WHERE UPPER(close_code) = ?
      `).get(code);

      const recoveryCase = !item ? db.prepare(`
        SELECT * FROM recovery_cases
        WHERE UPPER(handover_code) = ?
      `).get(code) : null;

      if (!item && !recoveryCase) {
        await this.sendMessage(chatId, `❌ *Invalid 1-Time Code: \`${code}\`*\n\nNo active item or recovery case matches this code. Custody transfer rejected.`, { parse_mode: 'Markdown' });
        return;
      }

      const targetItemId = item ? item.id : recoveryCase.item_id;
      const targetItem = item || db.prepare('SELECT * FROM items WHERE id = ?').get(targetItemId);

      if (targetItem.status === 'RECOVERED' || targetItem.status === 'CLOSED') {
        await this.sendMessage(chatId, `⚠️ Search for *${targetItem.title}* has already been closed and recovered.`, { parse_mode: 'Markdown' });
        return;
      }

      const now = new Date().toISOString();
      const officerTag = `Telegram Officer @${username}`;

      // Update item status
      db.prepare(`
        UPDATE items
        SET status = 'RECOVERED', closed_at = ?, closed_by = ?
        WHERE id = ?
      `).run(now, officerTag, targetItemId);

      // Also close any linked recovery case
      if (recoveryCase || targetItemId) {
        db.prepare(`
          UPDATE recovery_cases
          SET status = 'RECOVERED', recovered_at = ?
          WHERE item_id = ?
        `).run(now, targetItemId);
      }

      // Log audit
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details)
        VALUES (?, ?, 'SEARCH_CLOSED_BY_TELEGRAM_CODE', 'items', ?, ?)
      `).run(
        `aud_${Date.now()}`,
        `tg_${chatId}`,
        targetItemId,
        `1-Time Code ${code} verified by ${officerTag}. Search closed.`
      );

      // Send success response
      const successText = 
`✅ *SEARCH CLOSED & CUSTODY TRANSFERRED!*

🎉 *Item Recovered:* ${targetItem.title}
📁 *Category:* ${targetItem.category}
🏢 *Facility:* ${targetItem.building} (Floor ${targetItem.floor || 1})
🔑 *Verified Code:* \`${code}\`
👮 *Authorized By:* ${officerTag}
🕒 *Timestamp:* ${new Date(now).toLocaleString()}

The search for this item is officially marked as *RECOVERED* in Findora Registry. Broadcast alert dispatched to campus network.`;

      await this.sendMessage(chatId, successText, { parse_mode: 'Markdown' });

      // Broadcast resolution to all subscribers and campus groups
      this.broadcastSearchClosed(targetItem, officerTag, code);
    } catch (e) {
      await this.sendMessage(chatId, `❌ Error processing verification: ${e.message}`);
    }
  }

  /**
   * /report Command
   */
  async handleReportCommand(chatId, isGroup = false) {
    const text = 
`📸 *How to Report Lost or Found Items with Live Camera*

Findora strictly requires a **Live WebRTC Camera Photo with GPS Location Tag** to ensure authentic campus reports.

1. Open the Findora Web Portal:
🌐 http://localhost:3000

2. Click on **"Report Item"** in the sidebar.
3. Select **"I Lost Something"** or **"I Found Something"**.
4. Enter item attributes (Title, Category, Brand, Facility).
5. Click **"Turn On Camera"** and take a live photo.
   • Your photo will be stamped with GPS coords & facility name.
6. Submit your report! You will immediately receive your **1-Time Handover Code**.`;

    await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  }

  /**
   * Helper: Send message to Telegram Chat
   */
  async sendMessage(chatId, text, options = {}) {
    // If not connected to live Telegram API, log and capture simulated message
    if (!this.connected) {
      console.log(`[TELEGRAM SIMULATED MESSAGE to ${chatId}]:\n${text}\n`);
      if (this.captureSimulatedReplies && this.simulatedReplies) {
        this.simulatedReplies.push({ chatId, text, options, type: 'text' });
      }
      return { ok: true, simulated: true, text };
    }

    try {
      const payload = {
        chat_id: chatId,
        text,
        parse_mode: options.parse_mode || 'Markdown'
      };

      let res = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      let data = await res.json();

      // Retry without markdown if parsing fails due to unescaped entities
      if (!data.ok && data.description && data.description.includes("can't parse entities")) {
        console.warn(`[TELEGRAM BOT] Markdown parse failed for chat ${chatId}, retrying as plain text...`);
        const plainPayload = {
          chat_id: chatId,
          text: text.replace(/[*_`\[\]]/g, '')
        };
        res = await fetch(`${this.apiUrl}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(plainPayload)
        });
        data = await res.json();
      }

      return data;
    } catch (err) {
      console.error(`[TELEGRAM BOT] Failed to send message to ${chatId}:`, err.message);
      return { ok: false, error: err.message };
    }
  }

  /**
   * Helper: Send Photo to Telegram Chat (Supports local uploads and URLs)
   */
  async sendPhoto(chatId, photoSource, caption = '', options = {}) {
    if (!this.connected) {
      console.log(`[TELEGRAM SIMULATED PHOTO to ${chatId}]: (Image: ${photoSource})\n${caption}\n`);
      if (this.captureSimulatedReplies && this.simulatedReplies) {
        this.simulatedReplies.push({ chatId, photo: photoSource, text: caption, type: 'photo' });
      }
      return { ok: true, simulated: true, photo: photoSource, text: caption };
    }

    try {
      // 1. If photo is a web URL (e.g. Cloudinary or HTTPS)
      if (typeof photoSource === 'string' && (photoSource.startsWith('http://') || photoSource.startsWith('https://'))) {
        const payload = {
          chat_id: chatId,
          photo: photoSource,
          caption: (caption || '').substring(0, 1024),
          parse_mode: options.parse_mode || 'Markdown'
        };
        const res = await fetch(`${this.apiUrl}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.ok) return data;
      }

      // 2. If photo is a local file in /uploads
      let localPath = photoSource;
      if (typeof photoSource === 'string' && photoSource.startsWith('/uploads/')) {
        localPath = path.resolve(__dirname, '..', '..', 'uploads', path.basename(photoSource));
      }

      if (typeof localPath === 'string' && fs.existsSync(localPath)) {
        const fileBuffer = fs.readFileSync(localPath);
        const ext = path.extname(localPath).toLowerCase().replace('.', '') || 'jpeg';
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        const blob = new Blob([fileBuffer], { type: mimeType });

        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('caption', (caption || '').substring(0, 1024));
        formData.append('parse_mode', options.parse_mode || 'Markdown');
        formData.append('photo', blob, path.basename(localPath));

        const res = await fetch(`${this.apiUrl}/sendPhoto`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.ok) return data;
      }

      // Fallback: send as text message with photo link
      return await this.sendMessage(chatId, `📷 *Item Image:* ${photoSource}\n\n${caption}`, options);
    } catch (err) {
      console.error(`[TELEGRAM BOT] Failed to send photo to ${chatId}:`, err.message);
      return await this.sendMessage(chatId, caption, options);
    }
  }

  /**
   * Broadcast: New Item Reported (Lost or Found)
   */
  async broadcastNewItem(item, closeCode) {
    const isLost = item.type === 'LOST';
    const emoji = isLost ? '🚨 [CAMPUS ALERT: NEW LOST ITEM]' : '📦 [CAMPUS ALERT: NEW FOUND ITEM]';
    
    let text = 
`${emoji}
*${item.title}*

• *Category:* ${item.category}
• *Facility:* ${item.building} (Floor ${item.floor || 1})
• *Location Details:* ${item.location || 'Reported on campus'}
• *Reported:* ${new Date().toLocaleTimeString()}
• *Item ID:* \`${item.id}\``;

    if (item.brand) text += `\n• *Brand:* ${item.brand}`;
    if (item.condition) text += `\n• *Condition:* ${item.condition}`;
    if (item.latitude && item.longitude) {
      text += `\n• *Live GPS:* \`${item.latitude.toFixed(4)}°N, ${item.longitude.toFixed(4)}°E\``;
    }

    if (isLost) {
      text += `\n\n🔍 *If you see or found this item, message /found or report to Campus Security!*`;
    } else {
      text += `\n\n🔑 *Belongs to you? Head to Findora portal (http://localhost:3000) to claim with blind verification.*`;
    }

    await this.broadcastToAll(text, item.image);
  }

  /**
   * Broadcast: AI Match Discovered
   */
  async broadcastMatch(lostItem, foundItem, score) {
    const text = 
`⚡ *AI MULTIMODAL MATCH DETECTED (${Math.round(score * 100)}% Confidence)!*

🔗 *Correlation:*
• *Lost Item:* ${lostItem.title} (\`${lostItem.id}\`)
• *Found Item:* ${foundItem.title} (\`${foundItem.id}\`)
• *Facility:* ${foundItem.building} (Floor ${foundItem.floor || 1})

The owner can now initiate blind verification on Findora to claim the item.`;

    const img = foundItem.image || lostItem.image;
    await this.broadcastToAll(text, img);
  }

  /**
   * Broadcast: Search Closed / Item Recovered
   */
  async broadcastSearchClosed(item, officerName, code) {
    const text = 
`🎉 *CAMPUS ITEM RECOVERED — SEARCH OFFICIALLY CLOSED!*

📌 *Item:* ${item.title}
📁 *Category:* ${item.category}
🏢 *Facility:* ${item.building}
👮 *Custody Verified By:* ${officerName}
🔑 *Verified 1-Time Code:* \`${code}\`

Searching is successfully completed. Findora zero-leak custody transfer logged!`;

    await this.broadcastToAll(text, item.image);
  }

  /**
   * Broadcast message & optional image to all registered subscribers AND campus groups
   */
  async broadcastToAll(text, image = null) {
    try {
      const subscribers = db.prepare('SELECT chat_id FROM telegram_subscribers').all() || [];
      const groups = db.prepare('SELECT chat_id FROM telegram_groups WHERE is_active = 1').all() || [];

      const allTargets = new Set();
      subscribers.forEach(s => allTargets.add(s.chat_id));
      groups.forEach(g => allTargets.add(g.chat_id));

      if (this.campusGroupId) {
        allTargets.add(this.campusGroupId);
      }

      if (allTargets.size === 0) {
        console.log(`[TELEGRAM BROADCAST] (No active subscribers or groups):\n${text}\n`);
        return;
      }

      console.log(`[TELEGRAM BROADCAST] Sending alert to ${allTargets.size} destinations (subscribers + campus groups)...`);
      for (const chatId of allTargets) {
        if (image) {
          await this.sendPhoto(chatId, image, text);
        } else {
          await this.sendMessage(chatId, text, { parse_mode: 'Markdown' });
        }
      }
    } catch (e) {
      console.error('[TELEGRAM BOT] Broadcast error:', e.message);
    }
  }

  /**
   * Simulation runner for testing commands (Private or Group) without live Telegram connection
   */
  async simulateMessage(chatId, text, username = 'test_user', chatType = 'private', chatTitle = 'Campus Community Group') {
    this.captureSimulatedReplies = true;
    this.simulatedReplies = [];

    const fakeUpdate = {
      update_id: Date.now(),
      message: {
        message_id: 1,
        chat: { 
          id: chatId,
          type: chatType,
          title: chatTitle
        },
        from: { id: chatId, first_name: username, username },
        text
      }
    };
    await this.handleUpdate(fakeUpdate);

    const replies = [...this.simulatedReplies];
    this.captureSimulatedReplies = false;
    this.simulatedReplies = [];
    return replies;
  }
}

const telegramBot = new TelegramBotService();

module.exports = telegramBot;
