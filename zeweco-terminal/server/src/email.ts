/**
 * Email service for password reset PINs.
 * Configure via env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 * For Gmail: SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, use App Password for SMTP_PASS
 */
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  requireTLS: true, // Force STARTTLS for port 587 (Gmail, Google Workspace)
  auth: process.env.SMTP_USER && process.env.SMTP_PASS
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

const FROM = process.env.EMAIL_FROM || 'Zeweco Terminal <noreply@zeweco.com>';

export async function sendPasswordResetPin(to: string, pin: string): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('[Email] SMTP not configured. Set SMTP_USER and SMTP_PASS in .env');
    return false;
  }
  try {
    await transporter.sendMail({
      from: FROM,
      to,
      subject: 'Zeweco Terminal – Password Reset PIN',
      text: `Your password reset PIN is: ${pin}\n\nThis PIN expires in 15 minutes. Do not share it.\n\nIf you didn't request this, ignore this email.`,
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;">
          <h2 style="color:#111;">Zeweco Terminal</h2>
          <p>Your password reset PIN is:</p>
          <p style="font-size:24px;font-weight:bold;letter-spacing:4px;color:#2563eb;">${pin}</p>
          <p style="color:#666;font-size:14px;">This PIN expires in 15 minutes. Do not share it.</p>
          <p style="color:#999;font-size:12px;">If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Email] Failed to send:', msg);
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}
