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
 * Send Notification for AI Match Discovered
 */
async function sendMatchAlertEmail(toEmail, matchData) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0b0b0e; color: #ffffff; border-radius: 12px;">
      <h2 style="color: #38bdf8; margin-top: 0;">✨ FINDORA AI - High Confidence Match Found!</h2>
      <p style="color: #94a3b8; font-size: 14px;">An item matching your registered report has been indexed in the campus network.</p>
      
      <div style="background: #141418; padding: 15px; border-radius: 8px; border: 1px solid #26262e; margin: 20px 0;">
        <p style="margin: 0; font-size: 16px; font-weight: bold; color: #ffffff;">Lost Item: ${matchData.lost_title}</p>
        <p style="margin: 6px 0 0 0; color: #38bdf8; font-size: 14px;">Found Item: ${matchData.found_title}</p>
        <p style="margin: 6px 0 0 0; color: #4ade80; font-size: 14px; font-weight: bold;">AI Match Confidence: ${Math.round((matchData.final_score || 0.9) * 100)}%</p>
      </div>

      <p style="font-size: 13px; color: #94a3b8;">
        To secure and reclaim this item, initiate a <strong>Zero-Knowledge Blind Claim</strong> in the FINDORA app. Sensitive physical characteristics remain concealed.
      </p>

      <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #26262e; font-size: 11px; color: #64748b;">
        FINDORA AI • Privacy-First Autonomous Lost & Found Intelligence Network • 2026
      </div>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject: `[FINDORA AI] High Confidence Match Detected for your Report`,
    html
  });
}

/**
 * Send Handover & Recovery Authorization Code Email
 */
async function sendHandoverCodeEmail(toEmail, recoveryCase) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0b0b0e; color: #ffffff; border-radius: 12px;">
      <h2 style="color: #4ade80; margin-top: 0;">🛡️ Claim Approved & Custody Authorized!</h2>
      <p style="color: #94a3b8; font-size: 14px;">Your ownership challenge has been verified and campus security has authorized item release.</p>
      
      <div style="background: #141418; padding: 20px; border-radius: 8px; border: 1px solid #26262e; text-align: center; margin: 20px 0;">
        <div style="color: #64748b; font-size: 11px; text-transform: uppercase; font-family: monospace;">Case Reference ID</div>
        <div style="font-size: 18px; font-weight: bold; color: #ffffff; margin-bottom: 12px; font-family: monospace;">${recoveryCase.id}</div>
        
        <div style="color: #64748b; font-size: 11px; text-transform: uppercase; font-family: monospace;">Your Secure Handover Secret Code</div>
        <div style="font-size: 32px; font-weight: 900; letter-spacing: 4px; color: #38bdf8; font-family: monospace; margin: 6px 0;">
          ${recoveryCase.handover_code}
        </div>
      </div>

      <p style="font-size: 13px; color: #e2e8f0;">
        <strong>Pickup Station:</strong> ${recoveryCase.pickup_location || 'Campus Central Security Desk, Wilson Hall'}
      </p>
      <p style="font-size: 13px; color: #94a3b8;">
        Present this secret code or your QR code to the custody desk officer to complete handoff.
      </p>

      <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #26262e; font-size: 11px; color: #64748b;">
        FINDORA AI • Secure Custody Chain Authorized • 2026
      </div>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject: `[FINDORA AI] Claim Approved: Handover Code ${recoveryCase.handover_code}`,
    html
  });
}

async function sendPasswordResetEmail(toEmail, resetCode) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #ffffff; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #0284c7; margin-top: 0; font-size: 20px; font-weight: 700;">Findora Vault - Password Verification</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">
        You requested a password reset for your Findora campus account. Enter this 6-digit code on the reset page:
      </p>
      
      <div style="background: #f8fafc; border: 2px dashed #0284c7; padding: 20px; border-radius: 10px; text-align: center; margin: 24px 0;">
        <span style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #0f172a; font-family: monospace;">
          ${resetCode}
        </span>
        <div style="color: #64748b; font-size: 12px; margin-top: 8px;">Valid for 15 minutes. Do not share this code.</div>
      </div>

      <p style="font-size: 13px; color: #64748b; line-height: 1.4;">
        If you did not make this request, you can safely ignore this email.
      </p>

      <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; font-family: monospace;">
        FINDORA AI • Campus Recovery &amp; Verification
      </div>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject: `Your Findora Verification Code: ${resetCode}`,
    text: `Your Findora Vault verification code is: ${resetCode}\n\nValid for 15 minutes. Enter this code to reset your account password.`,
    html
  });
}

async function sendWelcomeRegistrationEmail(toEmail, userName, userRole) {
  const roleTitle = userRole === 'admin' 
    ? 'Campus Security Officer (Administrator)' 
    : userRole === 'verification_officer' 
      ? 'Verification & Custody Officer' 
      : 'Campus Student / Member';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #ffffff; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #00875a; margin-top: 0; font-size: 20px; font-weight: 700;">Welcome to Findora Vault!</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">
        Hello <strong>${userName}</strong>,
      </p>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">
        Your account on the Findora Autonomous Campus Lost &amp; Found network has been created successfully.
      </p>
      
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 10px; margin: 20px 0;">
        <div style="color: #64748b; font-size: 11px; text-transform: uppercase; font-family: monospace;">Account Details</div>
        <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 4px;">Email: ${toEmail}</div>
        <div style="font-size: 14px; font-weight: 600; color: #0284c7; margin-top: 2px;">Assigned Role: ${roleTitle}</div>
      </div>

      <p style="color: #475569; font-size: 13px; line-height: 1.5;">
        You can now report lost or found property, track incident matches with multimodal AI vision, and initiate Zero-Knowledge blind verifications.
      </p>

      <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; font-family: monospace;">
        FINDORA AI • Zero-Knowledge Campus Lost &amp; Found Network
      </div>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject: `Welcome to Findora Vault, ${userName}`,
    text: `Hello ${userName}!\n\nWelcome to Findora Vault. Your account has been registered as ${roleTitle}.\nEmail: ${toEmail}\n\nYou can now log in to the campus recovery portal.`,
    html
  });
}

async function sendReportConfirmationEmail(toEmail, item, closeCode) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #ffffff; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #0284c7; margin-top: 0; font-size: 20px; font-weight: 700;">Findora Vault - Lost Item Registered</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">
        Your lost item report for <strong>${item.title}</strong> has been registered in the Findora Campus Network.
      </p>
      
      <div style="background: #f0fdf4; border: 2px dashed #16a34a; padding: 18px; border-radius: 10px; text-align: center; margin: 20px 0;">
        <div style="font-size: 11px; text-transform: uppercase; font-family: monospace; color: #166534; font-weight: bold;">Your 1-Time Handover Code (Say to Officer to Close Search)</div>
        <div style="font-size: 32px; font-weight: 900; letter-spacing: 4px; color: #15803d; font-family: monospace; margin: 8px 0;">
          ${closeCode}
        </div>
        <div style="font-size: 12px; color: #166534;">Keep this code safe. When picking up your item from the campus verification officer, recite this code to close the search.</div>
      </div>

      <p style="color: #475569; font-size: 13px; line-height: 1.5;">
        Facility: ${item.building} (Floor ${item.floor || 1})<br>
        Item Reference ID: <code>${item.id}</code>
      </p>

      <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; font-family: monospace;">
        FINDORA AI • Telegram Bot: @findoravsb_bot • Zero-Knowledge Protocol
      </div>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject: `[Findora] Lost Report Registered - 1-Time Code: ${closeCode}`,
    text: `Your report for ${item.title} has been registered.\n1-Time Handover Code: ${closeCode}\nWhen receiving your item, recite this code to the Verification Officer to close the search.`,
    html
  });
}

async function sendSearchClosedEmail(toEmail, item, officerName) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #ffffff; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #16a34a; margin-top: 0; font-size: 20px; font-weight: 700;">✅ Search Officially Closed &amp; Custody Restored!</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">
        Your item <strong>${item.title}</strong> has been successfully returned and verified by <strong>${officerName}</strong>.
      </p>
      
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 10px; margin: 20px 0;">
        <div style="color: #64748b; font-size: 11px; text-transform: uppercase; font-family: monospace;">Recovery Summary</div>
        <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 4px;">Item: ${item.title} (${item.category})</div>
        <div style="font-size: 13px; color: #0284c7; margin-top: 2px;">Verification Officer: ${officerName}</div>
        <div style="font-size: 13px; color: #16a34a; font-weight: bold; margin-top: 2px;">Status: RECOVERED &amp; CLOSED</div>
      </div>

      <p style="color: #475569; font-size: 13px; line-height: 1.5;">
        Thank you for using Findora Autonomous Campus Lost &amp; Found network.
      </p>

      <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; font-family: monospace;">
        FINDORA AI • Telegram Bot: @findoravsb_bot
      </div>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject: `[Findora] Search Closed: ${item.title} Recovered!`,
    text: `Your item ${item.title} has been verified and returned by ${officerName}. The search is officially closed.`,
    html
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
