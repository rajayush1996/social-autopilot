import nodemailer from 'nodemailer';
import config from '../config/env.js';
import logger from '../utils/logger.js';
import { prisma } from '../config/db.js';

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
   * Send Generic Transactional Email with Multi-Port Failover & Persistent Database Audit Logging
   */
  async sendEmail({ to, subject, html, text, from, userId, metadata }) {
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

          // Persistent Audit Log in Database
          await prisma.emailLog.create({
            data: {
              userId: userId || null,
              recipient: to,
              subject,
              status: 'DELIVERED',
              port: target.port,
              messageId: info.messageId,
              metadata: metadata || null,
            }
          }).catch(dbErr => logger.warn(`[EmailService] Failed to record success email log: ${dbErr.message}`));

          return { success: true, messageId: info.messageId, port: target.port };
        } catch (err) {
          lastError = err;
          logger.warn(`[EmailService] ⚠️ Port ${target.port} attempt failed (${err.message}). Trying fallback port...`);
        }
      }

      logger.error(`[EmailService] ❌ All SMTP delivery ports failed for ${to}: ${lastError?.message}`);

      // Persistent Failure Audit Log in Database
      await prisma.emailLog.create({
        data: {
          userId: userId || null,
          recipient: to,
          subject,
          status: 'FAILED',
          errorMessage: lastError?.message || 'All SMTP delivery ports failed',
          metadata: metadata || null,
        }
      }).catch(dbErr => logger.warn(`[EmailService] Failed to record failure email log: ${dbErr.message}`));

      // Create In-App Notification so user sees the failure on dashboard
      if (userId) {
        await prisma.notification.create({
          data: {
            userId,
            title: '⚠️ Email Delivery Notice',
            message: `Email "${subject}" could not be sent to ${to}. Reason: ${lastError?.message || 'Delivery failed'}`,
            type: 'warning',
          }
        }).catch(() => {});
      }

      return { success: false, error: lastError?.message };
    } else {
      logger.info(`[EmailService Console Fallback] ✉️ To: ${to} | Subject: ${subject}\n${text || html}`);

      await prisma.emailLog.create({
        data: {
          userId: userId || null,
          recipient: to,
          subject,
          status: 'CONSOLE_FALLBACK',
          errorMessage: 'SMTP credentials not configured; logged to console',
          metadata: metadata || null,
        }
      }).catch(() => {});

      return { success: true, isConsoleFallback: true };
    }
  }

  /**
   * Send Email Approval Request for Generated Post Content (Ultra-Clean Light Theme)
   */
  async sendPostApprovalEmail({ userId, userEmail, userName, postId, postContent, mediaUrls = [], targetPlatforms = [], scheduledAt, approvalToken, apiBaseUrl, frontendUrl }) {
    const baseUrl = apiBaseUrl || process.env.API_BASE_URL || 'http://localhost:5000';
    const appUrl = frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000';

    const approveLink = approvalToken ? `${baseUrl}/api/posts/approve-email?token=${approvalToken}` : `${appUrl}/composer`;
    const editLink = postId ? `${appUrl}/composer?postId=${postId}` : `${appUrl}/composer`;

    // Bulletproof defensive resolution of post content
    let displayContent = (typeof postContent === 'string' && postContent.trim() !== '' && postContent.trim() !== 'undefined')
      ? postContent.trim()
      : null;

    if (!displayContent && typeof postContent === 'object' && postContent?.content) {
      displayContent = String(postContent.content).trim();
    }

    // Fail-safe 1: If content is missing, query database directly via postId
    if (!displayContent && postId) {
      try {
        const dbPost = await prisma.post.findUnique({ where: { id: postId }, select: { content: true } });
        if (dbPost?.content && dbPost.content.trim() !== '' && dbPost.content.trim() !== 'undefined') {
          displayContent = dbPost.content.trim();
        }
      } catch (dbErr) {
        logger.warn(`[EmailService] Fail-safe post query warning: ${dbErr.message}`);
      }
    }

    // Fail-safe 2: Clean professional fallback if all else fails
    if (!displayContent || displayContent === 'undefined') {
      displayContent = 'Your scheduled AI AutoPilot post has been generated and is ready for review.';
    }

    let finalMediaUrls = Array.isArray(mediaUrls) ? mediaUrls : [];
    let finalPlatforms = Array.isArray(targetPlatforms) && targetPlatforms.length > 0 ? targetPlatforms : ['LINKEDIN'];

    const formattedDate = scheduledAt ? new Date(scheduledAt).toLocaleString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }) : 'Immediate / Next Slot';

    const escapeHtml = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const formattedBody = escapeHtml(displayContent).replace(/\r\n|\n|\r/g, '<br/>');

    // Modern Platform Badges
    const platformColors = {
      LINKEDIN: { bg: '#0a66c2', text: '#ffffff', label: 'LinkedIn' },
      X: { bg: '#0f1419', text: '#ffffff', label: 'X' },
      FACEBOOK: { bg: '#1877f2', text: '#ffffff', label: 'Facebook' },
      INSTAGRAM: { bg: '#e1306c', text: '#ffffff', label: 'Instagram' },
    };

    const platformsHtml = finalPlatforms
      .map((p) => {
        const plat = platformColors[p] || { bg: '#2563eb', text: '#ffffff', label: p };
        return `<span style="display:inline-block; background-color:${plat.bg}; color:${plat.text}; padding:4px 9px; border-radius:5px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; margin-right:6px; margin-bottom:6px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${plat.label}</span>`;
      })
      .join('');

    // Optional Attached Media Preview
    const mediaHtml = (finalMediaUrls.length > 0 && finalMediaUrls[0]) ? `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:14px;">
        <tr>
          <td align="center">
            <img src="${finalMediaUrls[0]}" alt="Post Visual" width="100%" style="display:block; width:100%; max-width:100%; height:auto; border-radius:8px; border:1px solid #e2e8f0;" />
          </td>
        </tr>
      </table>
    ` : '';

    const htmlContent = `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="x-apple-disable-message-reformatting" />
      <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
      <meta name="color-scheme" content="light dark" />
      <meta name="supported-color-schemes" content="light dark" />
      <title>Post Approval Required - OmniSync</title>
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
      <style type="text/css">
        body, table, td, p, a, li, blockquote {
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
        table, td {
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
        img {
          -ms-interpolation-mode: bicubic;
          border: 0;
          height: auto;
          line-height: 100%;
          outline: none;
          text-decoration: none;
          max-width: 100%;
        }
        body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          min-width: 100% !important;
          background-color: #f1f5f9;
        }
        @media only screen and (max-width: 600px) {
          .email-wrapper {
            padding: 12px 8px !important;
          }
          .email-card {
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 12px !important;
          }
          .header-cell {
            padding: 16px 16px !important;
          }
          .content-cell {
            padding: 18px 16px 22px 16px !important;
          }
          .preview-cell {
            padding: 14px 12px !important;
          }
          .footer-cell {
            padding: 16px 14px !important;
          }
          .headline-text {
            font-size: 18px !important;
            line-height: 24px !important;
          }
          .body-intro {
            font-size: 13.5px !important;
            line-height: 20px !important;
          }
          .post-content {
            font-size: 13.5px !important;
            line-height: 21px !important;
          }
          .btn-primary {
            font-size: 14px !important;
            padding: 14px 0 !important;
          }
          .btn-secondary {
            font-size: 13px !important;
            padding: 12px 0 !important;
          }
        }
      </style>
    </head>
    <body style="margin:0; padding:0; background-color:#f1f5f9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased; color:#0f172a;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f1f5f9; table-layout:fixed;">
        <tr>
          <td align="center" class="email-wrapper" style="padding:24px 12px; background-color:#f1f5f9;">
            
            <!--[if (gte mso 9)|(IE)]>
            <table align="center" border="0" cellspacing="0" cellpadding="0" width="560">
            <tr>
            <td align="center" valign="top" width="560">
            <![endif]-->

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-card" style="max-width:560px; width:100%; background-color:#ffffff; border-radius:14px; border:1px solid #e2e8f0; margin:0 auto; overflow:hidden;">
              
              <!-- Header Bar with Logo & Status -->
              <tr>
                <td class="header-cell" style="padding:20px 24px 16px 24px; border-bottom:1px solid #f1f5f9; background-color:#ffffff;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td align="left" valign="middle">
                        <span style="display:inline-block; background-color:#2563eb; color:#ffffff; font-weight:800; font-size:12px; padding:6px 12px; border-radius:6px; letter-spacing:0.8px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                          ⚡ OMNISYNC
                        </span>
                      </td>
                      <td align="right" valign="middle">
                        <span style="display:inline-block; font-size:11.5px; font-weight:700; color:#2563eb; background-color:#eff6ff; border:1px solid #bfdbfe; padding:4px 10px; border-radius:20px; white-space:nowrap; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                          Review Ready
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Main Content Body -->
              <tr>
                <td class="content-cell" style="padding:24px 24px 24px 24px;">
                  
                  <h1 class="headline-text" style="margin:0 0 8px 0; font-size:19px; font-weight:800; color:#0f172a; line-height:26px; letter-spacing:-0.2px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    Review today&apos;s scheduled post
                  </h1>
                  
                  <p class="body-intro" style="margin:0 0 16px 0; font-size:14px; line-height:22px; color:#475569; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    Hi <strong>${escapeHtml(userName || 'Creator')}</strong>, your AutoPilot engine generated a new draft. Review the content below to approve or modify:
                  </p>

                  <!-- Target Platform Badges -->
                  <div style="margin:0 0 14px 0;">
                    ${platformsHtml}
                  </div>

                  <!-- Content Preview Card (Table layout for 100% email client consistency) -->
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; margin-bottom:18px;">
                    <tr>
                      <td class="preview-cell" style="padding:16px 16px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                        <div class="post-content" style="font-size:14px; line-height:22px; color:#1e293b; word-break:break-word; overflow-wrap:break-word; white-space:normal;">
                          ${formattedBody}
                        </div>
                        ${mediaHtml}
                      </td>
                    </tr>
                  </table>

                  <!-- Scheduled Time Info Banner -->
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; margin-bottom:20px;">
                    <tr>
                      <td style="padding:10px 14px; font-size:12.5px; line-height:18px; color:#1e40af; font-weight:600; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                        📅 <strong>Target Publishing Time:</strong> ${formattedDate}
                      </td>
                    </tr>
                  </table>

                  <!-- Action Buttons (Zero horizontal padding on <a> ensures 0 overflow in Gmail) -->
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:10px;">
                    <tr>
                      <td align="center" bgcolor="#2563eb" style="border-radius:10px; background-color:#2563eb;">
                        <a href="${approveLink}" target="_blank" class="btn-primary" style="display:block; width:100%; padding:14px 0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:14.5px; font-weight:700; color:#ffffff; text-decoration:none; text-align:center; border-radius:10px; line-height:20px;">
                          ✅ 1-Click Approve &amp; Schedule
                        </a>
                      </td>
                    </tr>
                  </table>

                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:16px;">
                    <tr>
                      <td align="center" bgcolor="#ffffff" style="border-radius:10px; background-color:#ffffff; border:1px solid #cbd5e1;">
                        <a href="${editLink}" target="_blank" class="btn-secondary" style="display:block; width:100%; padding:12px 0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:13.5px; font-weight:600; color:#334155; text-decoration:none; text-align:center; border-radius:10px; line-height:18px;">
                          ✏️ Edit in Composer
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0; text-align:center; font-size:11.5px; line-height:16px; color:#64748b; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    🔒 <em>Safe 1-Click Approval &bull; No password or login required.</em>
                  </p>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td class="footer-cell" style="padding:16px 24px; background-color:#f8fafc; border-top:1px solid #e2e8f0; text-align:center;">
                  <p style="margin:0 0 4px 0; font-size:11.5px; font-weight:600; color:#64748b; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    OmniSync Social AutoPilot &bull; Intelligent Growth Platform
                  </p>
                  <p style="margin:0; font-size:10.5px; line-height:15px; color:#94a3b8; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    You received this review email because automated draft approval is active on your account.
                  </p>
                </td>
              </tr>

            </table>

            <!--[if (gte mso 9)|(IE)]>
            </td>
            </tr>
            </table>
            <![endif]-->

          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    const fromAddress = process.env.SMTP_FROM || process.env.FROM_EMAIL || 'info@omnisyncapp.com';

    return this.sendEmail({
      to: userEmail,
      subject: `[Action Required] Review & Approve: Post for ${targetPlatforms.join(', ') || 'Social Media'}`,
      html: htmlContent,
      text: `Hi ${userName || 'Creator'},\n\nYour post is ready for review:\n\n"${displayContent}"\n\nScheduled for: ${formattedDate}\n\n✅ 1-Click Approve: ${approveLink}\n✏️ Edit in Composer: ${editLink}`,
      from: fromAddress,
      userId,
      metadata: { postId, type: 'POST_APPROVAL', targetPlatforms },
    });
  }
}

export const emailService = new EmailService();
export default emailService;
