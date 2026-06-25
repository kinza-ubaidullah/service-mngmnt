import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

// ─── Email HTML Template ────────────────────────────────────────────────────
function buildHtml(adminName: string, otp: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f9fafb; border-radius: 16px; overflow: hidden;">
      <div style="background: #1a3d2e; padding: 28px 32px; text-align: center;">
        <h1 style="color: #4ade80; margin: 0; font-size: 22px; letter-spacing: 1px;">Al Jaroshi CRM</h1>
        <p style="color: #86efac; margin: 6px 0 0; font-size: 13px;">Service Management System</p>
      </div>
      <div style="padding: 32px;">
        <p style="color: #374151; font-size: 15px; margin: 0 0 8px;">Hello <strong>${adminName}</strong>,</p>
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">Use the OTP below to reset your admin password. It expires in <strong>10 minutes</strong>.</p>
        <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="color: #166534; font-size: 11px; font-weight: bold; letter-spacing: 2px; margin: 0 0 8px; text-transform: uppercase;">Your OTP Code</p>
          <p style="color: #14532d; font-size: 42px; font-weight: 900; letter-spacing: 12px; margin: 0; font-family: monospace;">${otp}</p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">If you did not request this, please ignore this email. Your account is safe.</p>
      </div>
      <div style="background: #f3f4f6; padding: 16px 32px; text-align: center;">
        <p style="color: #9ca3af; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} Al Jaroshi CRM. All rights reserved.</p>
      </div>
    </div>
  `;
}

// ─── Fallback: log OTP to file ───────────────────────────────────────────────
function logOtpFallback(toEmail: string, otp: string, errorDetail: string) {
  try {
    const logPath = path.join(process.cwd(), 'email_fallback.log');
    const logLine = `[${new Date().toISOString()}] To: ${toEmail} | OTP: ${otp} | Error: ${errorDetail}\n`;
    fs.appendFileSync(logPath, logLine, 'utf8');
    console.log('[email] OTP written to email_fallback.log — check file on server');
  } catch (logErr: any) {
    console.error('[email] Failed to write fallback log:', logErr.message);
  }
}

// ─── Method 1: SMTP via Nodemailer ───────────────────────────────────────────
async function trySMTP(toEmail: string, subject: string, html: string): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.log('[email] SMTP not configured, skipping');
    return false;
  }

  try {
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = port === 465;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }, // allow self-signed certs (cPanel)
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `Al Jaroshi CRM <${user}>`,
      to: toEmail,
      subject,
      html,
    });

    console.log('[email] Sent via SMTP to', toEmail);
    return true;
  } catch (e: any) {
    console.warn('[email] SMTP failed:', e?.message);
    return false;
  }
}

// ─── Method 2: Resend API ───────────────────────────────────────────────────
async function tryResend(toEmail: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[email] Resend API key not configured, skipping');
    return false;
  }

  const resend = new Resend(apiKey);

  // Try custom FROM first, then resend.dev fallback
  const froms = [
    process.env.RESEND_FROM,
    'Al Jaroshi CRM <onboarding@resend.dev>',
  ].filter(Boolean) as string[];

  for (const from of froms) {
    try {
      const result = await resend.emails.send({ from, to: toEmail, subject, html });
      if (!result.error) {
        console.log('[email] Sent via Resend (from:', from, ') to', toEmail);
        return true;
      }
      console.warn('[email] Resend from', from, 'failed:', JSON.stringify(result.error));
    } catch (e: any) {
      console.warn('[email] Resend exception with from', from, ':', e?.message);
    }
  }

  return false;
}

// ─── Main export ─────────────────────────────────────────────────────────────
export const sendOtpEmail = async (
  toEmail: string,
  otp: string,
  adminName: string
): Promise<{ sent: boolean; error?: string }> => {
  const subject = `Your Password Reset OTP — Al Jaroshi CRM`;
  const html = buildHtml(adminName, otp);

  // 1. Try SMTP (cPanel/Gmail/any SMTP — no domain verification needed)
  if (await trySMTP(toEmail, subject, html)) {
    return { sent: true };
  }

  // 2. Try Resend API
  if (await tryResend(toEmail, subject, html)) {
    return { sent: true };
  }

  // 3. Both failed — log OTP to file so admin can retrieve it manually
  const errorMsg = 'All email delivery methods failed (SMTP + Resend). OTP logged to email_fallback.log';
  console.error('[email]', errorMsg);
  logOtpFallback(toEmail, otp, errorMsg);
  return { sent: false, error: errorMsg };
};
