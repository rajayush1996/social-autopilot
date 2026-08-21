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

  createTransporter(port, secure) {
    const smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      return nodemailer.createTransport({
        host: smtpHost,
        port: port,
        secure: secure !== undefined ? secure : port === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 12000,
      });
    }
    return null;
  }

  initTransporter() {
    const defaultPort = parseInt(process.env.SMTP_PORT || '587', 10);
    this.transporter = this.createTransporter(defaultPort, defaultPort === 465);

    if (this.transporter) {
      logger.info(`[EmailService] 📧 SMTP Transporter initialized (smtp-relay.brevo.com:${defaultPort})`);
    } else {
      logger.warn('[EmailService] ⚠️ SMTP credentials missing. Email service running in Console Log fallback mode.');
    }
  }

  /**
   * Send Generic Transactional Email with Multi-Port Failover
   */
  async sendEmail({ to, subject, html, text, from }) {
    if (!this.transporter) this.initTransporter();
    const fromAddress = from || process.env.SMTP_FROM || process.env.FROM_EMAIL || 'info@omnisyncapp.com';
    const mailOptions = {
      from: `"OmniSync" <${fromAddress}>`,
      to,
      subject,
      html,
      text,
    };

    if (this.transporter) {
      const configuredPort = parseInt(process.env.SMTP_PORT || '587', 10);
      const portsToTry = [
        { port: configuredPort, secure: configuredPort === 465 },
        { port: 465, secure: true },
        { port: 2525, secure: false },
      ].filter((v, idx, arr) => arr.findIndex(t => t.port === v.port) === idx);

      let lastError = null;

      for (const target of portsToTry) {
        try {
          const transport = (target.port === configuredPort && this.transporter) 
            ? this.transporter 
            : this.createTransporter(target.port, target.secure);

          if (!transport) continue;

          const info = await transport.sendMail(mailOptions);
          logger.info(`[EmailService] ✉️ Email delivered to ${to} via Port ${target.port} (Message ID: ${info.messageId})`);
          return { success: true, messageId: info.messageId, port: target.port };
        } catch (err) {
          lastError = err;
          logger.warn(`[EmailService] ⚠️ Port ${target.port} attempt failed (${err.message}). Trying fallback port...`);
        }
      }

      logger.error(`[EmailService] ❌ All SMTP delivery ports failed for ${to}: ${lastError?.message}`);
      return { success: false, error: lastError?.message };
    } else {
      logger.info(`[EmailService Console Fallback] ✉️ To: ${to} | Subject: ${subject}\n${text || html}`);
      return { success: true, isConsoleFallback: true };
    }
  }

  /**
   * Send Email Approval Request for Generated Post Content (Ultra-Clean Light Theme)
   */
  async sendPostApprovalEmail({ userEmail, userName, postId, postContent, mediaUrls = [], targetPlatforms = [], scheduledAt, approvalToken, apiBaseUrl, frontendUrl }) {
    const baseUrl = apiBaseUrl || process.env.API_BASE_URL || 'http://localhost:5000';
    const appUrl = frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000';

    const approveLink = `${baseUrl}/api/posts/approve-email?token=${approvalToken}`;
    const editLink = `${appUrl}/composer?postId=${postId}`;

    const formattedDate = scheduledAt ? new Date(scheduledAt).toLocaleString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }) : 'Immediate / Next Slot';

    // Modern Platform Badges
    const platformColors = {
      LINKEDIN: { bg: '#0077b5', text: '#ffffff', label: 'LinkedIn' },
      X: { bg: '#0f1419', text: '#ffffff', label: 'X (Twitter)' },
      FACEBOOK: { bg: '#1877f2', text: '#ffffff', label: 'Facebook' },
      INSTAGRAM: { bg: '#e1306c', text: '#ffffff', label: 'Instagram' },
    };

    const platformsHtml = (targetPlatforms && targetPlatforms.length > 0 ? targetPlatforms : ['LINKEDIN'])
      .map((p) => {
        const plat = platformColors[p] || { bg: '#2563eb', text: '#ffffff', label: p };
        return `<span style="display:inline-block; background-color:${plat.bg}; color:${plat.text}; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-right:6px; margin-bottom:6px;">${plat.label}</span>`;
      })
      .join('');

    // Optional Attached Media Preview
    const mediaHtml = (mediaUrls && mediaUrls.length > 0 && mediaUrls[0]) ? `
      <div style="margin-top:16px; margin-bottom:16px; text-align:center;">
        <img src="${mediaUrls[0]}" alt="Attached Post Visual" style="max-width:100%; max-height:360px; border-radius:10px; border:1px solid #e2e8f0; object-fit:cover; display:block; margin:0 auto;" />
      </div>
    ` : '';

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Post Approval Required - OmniSync</title>
    </head>
    <body style="margin:0; padding:30px 15px; background-color:#f8fafc; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased; color:#0f172a;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout:fixed;">
        <tr>
          <td align="center">
            <!-- Email Container Card (Light Minimalist Theme) -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background-color:#ffffff; border-radius:16px; border:1px solid #e2e8f0; box-shadow:0 4px 20px -2px rgba(15, 23, 42, 0.06); overflow:hidden;">
              
              <!-- Header Bar -->
              <tr>
                <td style="padding:28px 36px 20px 36px; border-bottom:1px solid #f1f5f9; background-color:#ffffff;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="left">
                        <div style="display:inline-block; vertical-align:middle; background-color:#2563eb; color:#ffffff; font-weight:800; font-size:13px; padding:6px 10px; border-radius:8px; letter-spacing:0.5px;">
                          ⚡ OMNISYNC
                        </div>
                      </td>
                      <td align="right">
                        <span style="font-size:12px; font-weight:700; color:#2563eb; background-color:#eff6ff; border:1px solid #bfdbfe; padding:4px 10px; border-radius:20px;">
                          Draft Review Ready
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Main Body Content -->
              <tr>
                <td style="padding:32px 36px;">
                  <h2 style="margin:0 0 8px 0; font-size:20px; font-weight:800; color:#0f172a; letter-spacing:-0.3px;">
                    Review today's scheduled post
                  </h2>
                  <p style="margin:0 0 24px 0; font-size:14px; line-height:1.6; color:#475569;">
                    Hi <strong>${userName || 'Creator'}</strong>, your AutoPilot engine has generated a new draft. Review the content and attached visual below to approve it for automated dispatch.
                  </p>

                  <!-- Target Platform Badges -->
                  <div style="margin-bottom:12px;">
                    ${platformsHtml}
                  </div>

                  <!-- Post Preview Card (Clean Light High-Contrast) -->
                  <div style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:22px; margin-bottom:20px;">
                    <div style="font-size:14px; line-height:1.65; color:#1e293b; white-space:pre-wrap; word-break:break-word; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${postContent}</div>
                    ${mediaHtml}
                  </div>

                  <!-- Scheduled Time Info Banner -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; margin-bottom:28px;">
                    <tr>
                      <td style="padding:12px 16px; font-size:13px; color:#1e40af;">
                        📅 <strong>Target Publishing Time:</strong> ${formattedDate}
                      </td>
                    </tr>
                  </table>

                  <!-- Action Buttons CTA (Prominent Light Theme) -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:10px; margin-bottom:16px;">
                    <tr>
                      <td align="center">
                        <table border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                          <tr>
                            <td align="center" style="border-radius:10px; background-color:#2563eb; box-shadow:0 4px 12px rgba(37, 99, 235, 0.25);">
                              <a href="${approveLink}" target="_blank" style="display:inline-block; padding:14px 28px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:14px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:10px;">
                                ✅ Approve & Schedule Post
                              </a>
                            </td>
                            <td style="width:12px;"></td>
                            <td align="center" style="border-radius:10px; background-color:#ffffff; border:1px solid #cbd5e1;">
                              <a href="${editLink}" target="_blank" style="display:inline-block; padding:13px 22px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:14px; font-weight:700; color:#475569; text-decoration:none; border-radius:10px;">
                                ✏️ Edit in Composer
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:20px 0 0 0; text-align:center; font-size:12px; color:#64748b;">
                    🔒 <em>Safe 1-Click Approval — No password or login required.</em>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:20px 36px; background-color:#f8fafc; border-top:1px solid #e2e8f0; text-align:center;">
                  <p style="margin:0 0 4px 0; font-size:12px; font-weight:600; color:#64748b;">
                    OmniSync Social AutoPilot • Intelligent Growth Platform
                  </p>
                  <p style="margin:0; font-size:11px; color:#94a3b8;">
                    You received this transactional review email because automated draft approval is active on your account.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    const fromAddress = process.env.SMTP_FROM || process.env.FROM_EMAIL || 'info@omnisyncapp.com';

    const mailOptions = {
      from: `"OmniSync Autopilot" <${fromAddress}>`,
      to: userEmail,
      subject: `[Action Required] Review & Approve: Post for ${targetPlatforms.join(', ') || 'Social Media'}`,
      html: htmlContent,
      text: `Hi ${userName || 'Creator'},\n\nYour post is ready for review:\n\n"${postContent}"\n\nScheduled for: ${formattedDate}\n\n✅ 1-Click Approve: ${approveLink}\n✏️ Edit in Composer: ${editLink}`,
    };

    if (!this.transporter) this.initTransporter();

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
