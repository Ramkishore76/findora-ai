const nodemailer = require('nodemailer');
require('dotenv').config();

// Initialize Brevo SMTP Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false, // TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify SMTP connection on startup if configured
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter.verify((error, success) => {
    if (error) {
      console.warn('[EMAIL WARNING] Brevo SMTP connection failed:', error.message);
    } else {
      console.log('📧 Brevo SMTP Relay ready to dispatch emails.');
    }
  });
}

/**
 * Send an email notification
 */
async function sendEmail({ to, subject, html, text }) {
  if (!to || (!process.env.SMTP_USER && !process.env.SMTP_PASS)) {
    console.log(`[EMAIL SIMULATED] To: ${to} | Subject: ${subject}`);
    return { success: true, simulated: true };
  }

  try {
    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER;
    const info = await transporter.sendMail({
      from: `"FINDORA AI Vault" <${fromAddress}>`,
      replyTo: process.env.ADMIN_EMAIL || fromAddress,
      to,
      subject,
      text: text || html.replace(/<[^>]+>/g, ''),
      html,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    });
    console.log(`📧 [BREVO SMTP DISPATCH SUCCESS] MessageId: ${info.messageId} -> Queued for ${to}`);
    return { success: true, messageId: info.messageId, response: info.response };
  } catch (error) {
    console.error('❌ [BREVO SMTP ERROR] Failed sending to', to, ':', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Shared Base Layout for all Findora AI Institutional Emails
 */
function renderBaseTemplate({ title, badge, badgeColor = '#2563eb', contentHtml, ctaText = 'Open Findora Portal', ctaUrl = 'https://findoravsbec.vercel.app' }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 24px 10px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.07);">
        
        <!-- Header -->
        <tr>
          <td style="padding: 28px 32px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); text-align: left;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="display: inline-block; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                    🛡️ FINDORA AI <span style="font-weight: 400; color: #38bdf8; font-size: 14px; margin-left: 6px;">VAULT</span>
                  </span>
                  <div style="font-size: 11px; color: #94a3b8; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase;">
                    Autonomous Campus Lost &amp; Found Intelligence Network
                  </div>
                </td>
                <td align="right" valign="top">
                  <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; background: ${badgeColor}22; border: 1px solid ${badgeColor}; color: ${badgeColor}; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                    ${badge}
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Main Body Content -->
        <tr>
          <td style="padding: 32px 32px 24px 32px; color: #1e293b;">
            ${contentHtml}

            <!-- CTA Button -->
            ${ctaText && ctaUrl ? `
              <div style="margin: 30px 0 10px 0; text-align: center;">
                <a href="${ctaUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 10px; font-size: 14px; font-weight: 700; letter-spacing: 0.2px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                  ${ctaText} &rarr;
                </a>
              </div>
            ` : ''}
          </td>
        </tr>

        <!-- Security Notice -->
        <tr>
          <td style="padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5;">
            🔒 <strong>Zero-Knowledge Ownership Protocol:</strong> Never share one-time secret handover codes or challenge responses with unauthorized individuals. Official custody transfers must be verified by designated Security Officers.
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding: 24px 32px; background: #0f172a; color: #94a3b8; font-size: 11px; line-height: 1.6; text-align: center;">
            <p style="margin: 0 0 6px 0; font-weight: 600; color: #cbd5e1;">
              FINDORA AI • VSBEC Campus Network • Team 22
            </p>
            <p style="margin: 0 0 10px 0;">
              Telegram Alerts: <a href="https://t.me/findoravsb_bot" style="color: #38bdf8; text-decoration: none; font-weight: bold;">@findoravsb_bot</a> • Web Portal: <a href="https://findoravsbec.vercel.app" style="color: #38bdf8; text-decoration: none;">findoravsbec.vercel.app</a>
            </p>
            <p style="margin: 0; color: #64748b; font-size: 10px;">
              This is an automated institutional notification from the FINDORA Campus Intelligence Gateway.
            </p>
          </td>
        </tr>

      </table>
    </body>
    </html>
  `;
}

/**
 * 1. Notification for AI Match Discovered
 */
async function sendMatchAlertEmail(toEmail, matchData = {}) {
  const lostTitle = matchData.lost_title || 'Your Reported Lost Item';
  const foundTitle = matchData.found_title || 'Campus Discovered Item';
  const confidence = Math.round((matchData.final_score || 0.9) * 100);

  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #0f172a;">
      ✨ High-Confidence AI Match Detected!
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
      Our multimodal AI vision engine has correlated your lost item report with newly indexed property registered on campus.
    </p>

    <!-- Comparison Card -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <table width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-bottom: 12px; border-bottom: 1px dashed #cbd5e1;">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #dc2626;">Your Lost Report</div>
            <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">${lostTitle}</div>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px dashed #cbd5e1;">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #16a34a;">Matched Found Item</div>
            <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 2px;">${foundTitle}</div>
          </td>
        </tr>
        <tr>
          <td style="padding-top: 12px;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size: 12px; font-weight: 600; color: #475569;">Multimodal Match Confidence:</span>
                </td>
                <td align="right">
                  <span style="font-size: 16px; font-weight: 900; color: #2563eb;">${confidence}% Match</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #475569;">
      <strong>Next Step:</strong> Log in to the portal and start a <strong>Zero-Knowledge Ownership Challenge</strong>. You will answer challenge questions derived from encrypted physical traits to verify ownership.
    </p>
  `;

  return sendEmail({
    to: toEmail,
    subject: `[FINDORA AI] High Confidence Match Detected (${confidence}%): ${lostTitle}`,
    text: `High-Confidence AI Match Found!\nYour Lost Report: ${lostTitle}\nMatched Found Item: ${foundTitle}\nConfidence: ${confidence}%\n\nPlease visit https://findoravsbec.vercel.app to start your ownership challenge.`,
    html: renderBaseTemplate({
      title: 'High Confidence Match Detected',
      badge: `${confidence}% Match`,
      badgeColor: '#2563eb',
      contentHtml,
      ctaText: 'Review Match & Claim'
    })
  });
}

/**
 * 2. Handover & Recovery Authorization Code Email
 */
async function sendHandoverCodeEmail(toEmail, recoveryCase = {}) {
  const code = recoveryCase.handover_code || '------';
  const pickup = recoveryCase.pickup_location || 'Campus Central Security Desk, Academic Admin Hall';
  const caseId = recoveryCase.id || `rec_${Date.now()}`;

  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #15803d;">
      ✅ Claim Approved &amp; Custody Authorized!
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
      Your blind challenge answers have been verified by institutional security protocols. Your item is cleared for custody collection.
    </p>

    <!-- Code Card -->
    <div style="background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0;">
      <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #166534; letter-spacing: 1px;">
        1-Time Secure Handover Verification Code
      </div>
      <div style="font-size: 36px; font-weight: 900; letter-spacing: 6px; color: #15803d; font-family: 'SF Mono', Consolas, Monaco, monospace; margin: 10px 0;">
        ${code}
      </div>
      <div style="font-size: 12px; color: #166534; font-weight: 500;">
        Recite this code to the Security Officer at the pickup desk to close the custody chain.
      </div>
    </div>

    <!-- Location Card -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px;">
      <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Authorized Pickup Point</div>
      <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 3px;">📍 ${pickup}</div>
      <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Case ID: <code>${caseId}</code></div>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject: `[FINDORA AI] Claim Approved: Handover Code ${code}`,
    text: `Your claim has been approved!\nHandover Code: ${code}\nPickup Station: ${pickup}\nCase ID: ${caseId}\n\nPresent this code to the officer to complete collection.`,
    html: renderBaseTemplate({
      title: 'Claim Approved & Custody Authorized',
      badge: 'Authorized',
      badgeColor: '#16a34a',
      contentHtml,
      ctaText: 'View Case Status'
    })
  });
}

/**
 * 3. 6-Digit Password Reset OTP Email
 */
async function sendPasswordResetEmail(toEmail, resetCode) {
  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #0f172a;">
      Password Verification Code
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
      A password reset was requested for your Findora campus account (<strong>${toEmail}</strong>). Enter this 6-digit one-time code to proceed:
    </p>

    <!-- OTP Code Box -->
    <div style="background: #f8fafc; border: 2px dashed #0284c7; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0;">
      <span style="font-size: 42px; font-weight: 900; letter-spacing: 10px; color: #0284c7; font-family: 'SF Mono', Consolas, Monaco, monospace; display: inline-block;">
        ${resetCode}
      </span>
      <div style="color: #64748b; font-size: 12px; margin-top: 10px; font-weight: 500;">
        ⏱️ Valid for 15 minutes. Never disclose this verification code to anyone.
      </div>
    </div>

    <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">
      If you did not request this password reset, your account remains secure and you can safely disregard this message.
    </p>
  `;

  return sendEmail({
    to: toEmail,
    subject: `Your Findora Verification Code: ${resetCode}`,
    text: `Your Findora Vault verification code is: ${resetCode}\n\nValid for 15 minutes. Enter this code to reset your account password.`,
    html: renderBaseTemplate({
      title: 'Password Verification Code',
      badge: 'Security Verification',
      badgeColor: '#0284c7',
      contentHtml,
      ctaText: 'Go to Reset Page',
      ctaUrl: 'https://findoravsbec.vercel.app'
    })
  });
}

/**
 * 4. Welcome Registration Email
 */
async function sendWelcomeRegistrationEmail(toEmail, userName, userRole) {
  const roleTitle = userRole === 'admin' 
    ? 'Campus Administrator' 
    : userRole === 'verification_officer' 
      ? 'Verification & Custody Officer' 
      : 'Campus Student / Member';

  const roleColor = userRole === 'admin' ? '#dc2626' : userRole === 'verification_officer' ? '#d97706' : '#2563eb';

  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #0f172a;">
      Welcome to Findora Vault, ${userName}!
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
      Your account on the Findora Autonomous Campus Lost &amp; Found network has been initialized successfully.
    </p>

    <!-- Account Details Card -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <table width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-bottom: 8px; color: #64748b; font-size: 12px;">Full Name:</td>
          <td style="padding-bottom: 8px; color: #0f172a; font-weight: 700; font-size: 13px;" align="right">${userName}</td>
        </tr>
        <tr>
          <td style="padding-bottom: 8px; color: #64748b; font-size: 12px;">Institutional Email:</td>
          <td style="padding-bottom: 8px; color: #0f172a; font-weight: 700; font-size: 13px;" align="right">${toEmail}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-size: 12px;">Assigned Institutional Role:</td>
          <td style="color: ${roleColor}; font-weight: 800; font-size: 13px;" align="right">${roleTitle}</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #475569;">
      You can now register lost or found property with live optical GPS watermarks, track real-time incident matches via Gemini 2.5 Flash, and manage campus custody recovery.
    </p>
  `;

  return sendEmail({
    to: toEmail,
    subject: `Welcome to Findora Vault, ${userName}`,
    text: `Hello ${userName}!\n\nWelcome to Findora Vault. Your account has been registered as ${roleTitle}.\nEmail: ${toEmail}\n\nAccess the campus portal: https://findoravsbec.vercel.app`,
    html: renderBaseTemplate({
      title: 'Welcome to Findora Vault',
      badge: 'Account Active',
      badgeColor: '#16a34a',
      contentHtml,
      ctaText: 'Access Campus Portal'
    })
  });
}

/**
 * 5. Lost / Found Report Confirmation Email
 */
async function sendReportConfirmationEmail(toEmail, item = {}, closeCode = '------') {
  const title = item.title || 'Registered Property';
  const category = item.category || 'General';
  const location = item.building ? `${item.building} (Floor ${item.floor || 1})` : (item.location || 'Campus Facilities');
  const itemId = item.id || `item_${Date.now()}`;

  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #0f172a;">
      Lost Property Report Confirmed
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
      Your report for <strong>${title}</strong> has been indexed in the Findora Campus Network and broadcasted to campus safety channels.
    </p>

    <!-- Close Code Box -->
    <div style="background: #eff6ff; border: 2px dashed #2563eb; border-radius: 14px; padding: 22px; text-align: center; margin: 24px 0;">
      <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #1e40af; letter-spacing: 0.5px;">
        Your Secret 1-Time Handover Code
      </div>
      <div style="font-size: 34px; font-weight: 900; letter-spacing: 6px; color: #1d4ed8; font-family: 'SF Mono', Consolas, Monaco, monospace; margin: 8px 0;">
        ${closeCode}
      </div>
      <div style="font-size: 12px; color: #1e40af; font-weight: 500;">
        Recite this secret code to the verification officer when recovering your item to officially close the search.
      </div>
    </div>

    <!-- Details Card -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
      <table width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-bottom: 6px; color: #64748b; font-size: 12px;">Item:</td>
          <td style="padding-bottom: 6px; color: #0f172a; font-weight: 700; font-size: 13px;" align="right">${title} (${category})</td>
        </tr>
        <tr>
          <td style="padding-bottom: 6px; color: #64748b; font-size: 12px;">Reported Zone:</td>
          <td style="padding-bottom: 6px; color: #0f172a; font-weight: 700; font-size: 13px;" align="right">${location}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-size: 12px;">Reference ID:</td>
          <td style="color: #64748b; font-family: monospace; font-size: 12px;" align="right">${itemId}</td>
        </tr>
      </table>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject: `[Findora] Lost Report Registered - Secret Code: ${closeCode}`,
    text: `Your report for ${title} has been registered.\n1-Time Handover Code: ${closeCode}\nZone: ${location}\nReference: ${itemId}\n\nWhen receiving your item, recite this code to the Verification Officer to close the search.`,
    html: renderBaseTemplate({
      title: 'Lost Property Report Confirmed',
      badge: 'Report Open',
      badgeColor: '#2563eb',
      contentHtml,
      ctaText: 'Track Report in Portal'
    })
  });
}

/**
 * 6. Search Closed & Item Recovered Notification
 */
async function sendSearchClosedEmail(toEmail, item = {}, officerName = 'Campus Security Officer') {
  const title = item.title || 'Recovered Item';
  const category = item.category || 'General';

  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #15803d;">
      ✅ Search Successfully Closed &amp; Item Recovered!
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
      Your item <strong>${title}</strong> has been returned to you and the custody chain has been securely closed.
    </p>

    <!-- Summary Box -->
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <table width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-bottom: 8px; color: #166534; font-size: 12px;">Recovered Item:</td>
          <td style="padding-bottom: 8px; color: #14532d; font-weight: 700; font-size: 13px;" align="right">${title} (${category})</td>
        </tr>
        <tr>
          <td style="padding-bottom: 8px; color: #166534; font-size: 12px;">Verified By:</td>
          <td style="padding-bottom: 8px; color: #14532d; font-weight: 700; font-size: 13px;" align="right">${officerName}</td>
        </tr>
        <tr>
          <td style="color: #166534; font-size: 12px;">Ledger Status:</td>
          <td style="color: #15803d; font-weight: 900; font-size: 13px;" align="right">RECOVERED &amp; CLOSED</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #475569;">
      Thank you for utilizing the Findora Autonomous Campus Lost &amp; Found network. If you ever misplace property again, we are here to connect and protect.
    </p>
  `;

  return sendEmail({
    to: toEmail,
    subject: `[Findora] Search Closed: ${title} Recovered!`,
    text: `Your item ${title} has been verified and returned by ${officerName}. The search has officially been closed.`,
    html: renderBaseTemplate({
      title: 'Search Successfully Closed',
      badge: 'Recovered',
      badgeColor: '#16a34a',
      contentHtml,
      ctaText: 'View Custody Ledger'
    })
  });
}

module.exports = {
  sendEmail,
  sendMatchAlertEmail,
  sendHandoverCodeEmail,
  sendPasswordResetEmail,
  sendWelcomeRegistrationEmail,
  sendReportConfirmationEmail,
  sendSearchClosedEmail
};
