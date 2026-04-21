// services/notification-service/src/utils/emailService.js
const nodemailer = require('nodemailer');
const logger = require('./logger');

const createTransporter = () => {
  // For demo: use ethereal fake SMTP if no real credentials
  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'demo@gmail.com') {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: 'ethereal@example.com', pass: 'password' },
    });
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
};

const transporter = createTransporter();
const FROM = process.env.EMAIL_FROM || '"PromptFlow AI" <noreply@promptflow.ai>';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({ from: FROM, to, subject, html, text });
    logger.info({ event: 'email_sent', to, subject, messageId: info.messageId });
    return info;
  } catch (err) {
    logger.error({ err, to, subject }, 'Email send failed');
    throw err;
  }
};

const emailService = {
  async sendWelcomeEmail(email, name) {
    await sendEmail({
      to: email,
      subject: '🎉 Welcome to PromptFlow AI!',
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 32px; border-radius: 12px; text-align: center; margin-bottom: 32px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">PromptFlow AI</h1>
            <p style="color: #c7d2fe; margin: 8px 0 0;">Your AI-powered document intelligence platform</p>
          </div>
          <h2 style="color: #1f2937;">Welcome, ${name}! 👋</h2>
          <p style="color: #6b7280; line-height: 1.6;">Your account has been created. Here's how to get started:</p>
          <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
            <ol style="color: #374151; line-height: 2; margin: 0; padding-left: 20px;">
              <li>Create your first workspace</li>
              <li>Upload documents (PDF, DOCX, TXT)</li>
              <li>Ask AI questions about your documents</li>
              <li>View analytics and usage stats</li>
            </ol>
          </div>
          <a href="${APP_URL}/dashboard" style="display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">Go to Dashboard →</a>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">You're on the Free plan — 100 AI requests/month included.</p>
        </div>
      `,
    });
  },

  async sendPasswordResetEmail(email, token) {
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;
    await sendEmail({
      to: email,
      subject: '🔐 Reset your PromptFlow AI password',
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1f2937;">Password Reset Request</h2>
          <p style="color: #6b7280;">Click the button below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset Password</a>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">If you didn't request this, ignore this email. Your password won't change.</p>
          <p style="color: #9ca3af; font-size: 11px;">Link: ${resetUrl}</p>
        </div>
      `,
    });
  },

  async sendWorkspaceInviteEmail(email, token, workspaceId) {
    const acceptUrl = `${APP_URL}/invite/accept?token=${token}`;
    await sendEmail({
      to: email,
      subject: '📬 You\'ve been invited to a PromptFlow workspace',
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1f2937;">Workspace Invitation</h2>
          <p style="color: #6b7280;">You've been invited to collaborate on a PromptFlow AI workspace.</p>
          <a href="${acceptUrl}" style="display: inline-block; background: #059669; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">Accept Invitation →</a>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">This invitation expires in 7 days.</p>
        </div>
      `,
    });
  },

  async sendPlanUpgradeEmail(userId, plan, amount) {
    const planNames = { pro: 'Pro', team: 'Team' };
    logger.info({ event: 'plan_upgrade_notification', userId, plan, amount });
    // In production, look up user email from auth service
  },

  async sendUsageWarningEmail(workspaceId, percent) {
    logger.warn({ event: 'usage_warning_notification', workspaceId, percent });
    // In production, notify workspace owner
  },

  async sendUsageExceededEmail(workspaceId) {
    logger.error({ event: 'usage_exceeded_notification', workspaceId });
    // In production, notify workspace owner about upgrade
  },

  async sendPipelineFailureEmail(event) {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    if (!adminEmail) return;
    await sendEmail({
      to: adminEmail,
      subject: `🚨 CI/CD Pipeline FAILED: ${event.service || 'unknown service'}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h2 style="color: #dc2626; margin: 0;">⚠️ Pipeline Failure Alert</h2>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; color: #6b7280; font-weight: 600;">Service:</td><td style="padding: 8px;">${event.service || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; color: #6b7280; font-weight: 600;">Branch:</td><td style="padding: 8px;">${event.branch || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; color: #6b7280; font-weight: 600;">Commit:</td><td style="padding: 8px;">${event.commit || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; color: #6b7280; font-weight: 600;">Step:</td><td style="padding: 8px;">${event.step || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; color: #6b7280; font-weight: 600;">Time:</td><td style="padding: 8px;">${new Date().toISOString()}</td></tr>
          </table>
          <a href="${event.runUrl || APP_URL}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px;">View Pipeline Logs →</a>
        </div>
      `,
    });
  },

  async sendGenericNotification(to, subject, message) {
    await sendEmail({ to, subject, html: `<div style="font-family: sans-serif; padding: 20px;"><p>${message}</p></div>` });
  },
};

module.exports = emailService;
