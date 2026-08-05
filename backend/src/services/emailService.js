import nodemailer from 'nodemailer';
import config from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Email Service
 * Handles transactional emails & HTML Approval Notifications
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      logger.info(`[EmailService] 📧 SMTP Transporter initialized (${smtpHost}:${smtpPort})`);
    } else {
      logger.warn('[EmailService] ⚠️ SMTP credentials missing. Email service running in Console Log fallback mode.');
    }
  }

  /**
   * Send Email Approval Request for Generated Post Content
   */
  async sendPostApprovalEmail({ userEmail, userName, postId, postContent, targetPlatforms = [], scheduledAt, approvalToken, apiBaseUrl, frontendUrl }) {
    const baseUrl = apiBaseUrl || process.env.API_BASE_URL || 'http://localhost:5000';
    const appUrl = frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000';

    const approveLink = `${baseUrl}/api/posts/approve-email?token=${approvalToken}`;
    const editLink = `${appUrl}/composer?postId=${postId}`;

    const formattedDate = scheduledAt ? new Date(scheduledAt).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    }) : 'Immediate / Next Slot';

    const platformsHtml = (targetPlatforms || ['LINKEDIN', 'X'])
      .map((p) => `<span style="background:#312e81; color:#c7d2fe; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:bold; margin-right:6px;">${p}</span>`)
      .join('');

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Post Approval Required - OmniSync</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 20px; letter-spacing: 0.5px; }
        .content { padding: 28px; }
        .badge-bar { margin-bottom: 16px; }
        .post-card { background: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 20px; margin: 16px 0; font-size: 14px; line-height: 1.6; color: #e5e7eb; white-space: pre-wrap; }
        .meta-info { font-size: 12px; color: #9ca3af; margin-bottom: 24px; }
        .btn-container { text-align: center; margin-top: 28px; }
        .btn-approve { display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 14px 28px; border-radius: 10px; margin-right: 12px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
        .btn-edit { display: inline-block; background: #374151; color: #d1d5db; text-decoration: none; font-weight: bold; font-size: 14px; padding: 14px 24px; border-radius: 10px; border: 1px solid #4b5563; }
        .footer { background: #0f172a; padding: 16px; text-align: center; font-size: 11px; color: #6b7280; border-top: 1px solid #1e293b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚡ OmniSync Autopilot Approval</h1>
        </div>
        <div class="content">
          <p>Hi ${userName || 'Creator'},</p>
          <p>Your new AI-generated social media post is ready for review. Please review the content below and approve it for automated scheduling:</p>
          
          <div class="badge-bar">
            ${platformsHtml}
          </div>

          <div class="post-card">${postContent}</div>

          <div class="meta-info">
            📅 <strong>Target Scheduled Time:</strong> ${formattedDate}
          </div>

          <div class="btn-container">
            <a href="${approveLink}" class="btn-approve">✅ Approve & Schedule Post</a>
            <a href="${editLink}" class="btn-edit">✏️ Edit in Composer</a>
          </div>
        </div>
        <div class="footer">
          Sent by OmniSync Social Autopilot Engine • Safe 1-Click Approval
        </div>
      </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: `"OmniSync Autopilot" <${process.env.FROM_EMAIL || 'notifications@omnisync.io'}>`,
      to: userEmail,
      subject: `[Action Required] Approve your new post for ${targetPlatforms.join(', ') || 'Social Media'}`,
      html: htmlContent,
      text: `Hi ${userName || 'Creator'},\n\nYour post is ready:\n\n"${postContent}"\n\nApprove & Schedule: ${approveLink}\nEdit: ${editLink}`,
    };

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail(mailOptions);
        logger.info(`[EmailService] ✉️ Approval email sent to ${userEmail} (Message ID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
      } catch (err) {
        logger.error(`[EmailService] ❌ Failed to send email: ${err.message}`);
        return { success: false, error: err.message };
      }
    } else {
      logger.info(`[EmailService Console Fallback] ✉️ EMAIL APPROVAL REQUEST FOR: ${userEmail}\nApprove Link: ${approveLink}\nContent:\n${postContent}`);
      return { success: true, isConsoleFallback: true, approveLink };
    }
  }
}

export const emailService = new EmailService();
export default emailService;
