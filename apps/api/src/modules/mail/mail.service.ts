// apps/api/src/modules/mail/mail.service.ts
// Sends transactional emails using Nodemailer.
// Supports Gmail, Yandex, Mailtrap, and any SMTP provider.
// Falls back to Ethereal (fake SMTP) when no credentials are configured.

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter!: Transporter;
  private configured = false;

  async onModuleInit(): Promise<void> {
    const smtpHost = process.env['SMTP_HOST'];
    const smtpPort = parseInt(process.env['SMTP_PORT'] ?? '587', 10);
    const smtpUser = process.env['SMTP_USER'] ?? '';
    const smtpPass = process.env['SMTP_PASS'] ?? '';
    const smtpSecure = process.env['SMTP_SECURE'] === 'true';

    if (smtpHost && smtpUser && smtpPass) {
      this.configured = true;

      // For port 587 without SSL (STARTTLS), requireTLS prevents silent
      // downgrade to plain-text. For port 465 with secure=true it is not needed.
      const requireTLS = smtpPort === 587 && !smtpSecure;

      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,   // true → SSL/TLS on connect (port 465)
        requireTLS,           // true → STARTTLS mandatory (port 587)
        auth: { user: smtpUser, pass: smtpPass },
        tls: {
          // Use the SMTP hostname for SNI so certificates are validated correctly
          servername: smtpHost,
          // In production keep full cert validation; relax only in dev if needed
          rejectUnauthorized: process.env['NODE_ENV'] === 'production',
          // Allow TLS 1.2 — required by some providers (e.g. Yandex port 465)
          minVersion: 'TLSv1.2' as const,
        },
      });

      this.logger.log(
        `Mail: connecting to ${smtpHost}:${smtpPort} ` +
        `(secure=${smtpSecure}, requireTLS=${requireTLS}) as ${smtpUser}\n` +
        `  FROM will be: ${process.env['SMTP_FROM_ADDR'] ?? smtpUser} ` +
        `(name: ${process.env['SMTP_FROM_NAME'] ?? 'ProjectHub'})`,
      );

      // Verify the connection immediately so misconfigured credentials surface
      // in the startup log rather than silently swallowed later.
      try {
        await this.transporter.verify();
        this.logger.log('Mail: SMTP connection verified ✓');
      } catch (err) {
        this.logger.error(
          `Mail: SMTP verification FAILED for ${smtpHost}:${smtpPort}.\n` +
          `  Error   : ${String(err)}\n` +
          `  Checklist:\n` +
          `    • Gmail  → enable 2-FA and use an App Password (not your login password)\n` +
          `              https://myaccount.google.com/apppasswords\n` +
          `    • Yandex → enable SMTP in Mail Settings → Security → App Passwords\n` +
          `              https://mail.yandex.ru/settings/properties\n` +
          `    • Verify SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in your .env\n` +
          `    • For port 587 use SMTP_SECURE=false; for port 465 use SMTP_SECURE=true`,
        );
      }
    } else {
      // ── Ethereal fake SMTP ────────────────────────────────────────────────
      // Emails are NOT delivered; a preview URL is printed to the log instead.
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      this.logger.warn(
        'Mail: no SMTP credentials found — using Ethereal (emails are NOT delivered).\n' +
        `  Ethereal inbox : https://ethereal.email (login: ${testAccount.user})\n` +
        '  To enable real delivery set SMTP_HOST, SMTP_USER, SMTP_PASS in your .env file.',
      );
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /** Returns the FROM address.
   *  Gmail and Yandex reject emails whose From differs from the authenticated
   *  user, so we default FROM to SMTP_USER when no explicit address is set.
   */
  private get from(): string {
    const name = process.env['SMTP_FROM_NAME'] ?? 'ProjectHub';
    // Use SMTP_FROM_ADDR if explicitly set; otherwise fall back to the SMTP
    // login (required by Gmail/Yandex to avoid "550 not allowed" errors).
    const addr =
      process.env['SMTP_FROM_ADDR'] ??
      process.env['SMTP_USER'] ??
      'noreply@projecthub.app';
    return `"${name}" <${addr}>`;
  }

  // ─── Public methods ───────────────────────────────────────────────────────

  async sendInviteEmail(opts: {
    to: string;
    orgName: string;
    inviterName: string;
    temporaryPassword: string;
    loginUrl: string;
  }): Promise<void> {
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;color:#111">
        <h2 style="font-size:20px">You're invited to ${opts.orgName}!</h2>
        <p>Hi,</p>
        <p>
          <strong>${opts.inviterName}</strong> has invited you to join
          <strong>${opts.orgName}</strong> on ProjectHub.
        </p>
        <p>Your temporary login credentials:</p>
        <ul>
          <li><strong>Email:</strong> ${opts.to}</li>
          <li>
            <strong>Temporary password:</strong>
            <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px">
              ${opts.temporaryPassword}
            </code>
          </li>
        </ul>
        <p>Please log in and change your password immediately.</p>
        <a
          href="${opts.loginUrl}"
          style="display:inline-block;margin-top:12px;padding:10px 24px;
                 background:#4F46E5;color:#fff;border-radius:6px;text-decoration:none"
        >
          Log in to ProjectHub
        </a>
        <p style="margin-top:24px;color:#6B7280;font-size:12px">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `;

    const info = await this.transporter.sendMail({
      from: this.from,
      to: opts.to,
      subject: `You're invited to ${opts.orgName}`,
      html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) this.logger.log(`Invite email preview: ${previewUrl}`);
    this.logger.log(`Invite email sent to ${opts.to} (id: ${info.messageId})`);
  }

  async sendNotificationEmail(opts: {
    to: string;
    subject: string;
    bodyHtml: string;
  }): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: opts.to,
        subject: opts.subject,
        html: opts.bodyHtml,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) this.logger.log(`Notification email preview: ${previewUrl}`);
      this.logger.log(`Notification email sent to ${opts.to}: "${opts.subject}"`);
    } catch (err) {
      // Log but do not rethrow — a failing notification email must never
      // crash the notification delivery pipeline.
      this.logger.error(
        `Failed to send notification email to ${opts.to}: ${String(err)}`,
      );
    }
  }
}
