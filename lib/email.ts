import nodemailer from "nodemailer";

type EmailTransportStatus = {
  configured: boolean;
  provider: "supabase" | "none";
  fromEmail: string | null;
  notice: string;
};

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function getSupabaseEmailFrom(): string {
  return (
    process.env.SUPABASE_FROM_EMAIL?.trim() ??
    process.env.SUPABASE_SMTP_FROM?.trim() ??
    "Tokn <noreply@tokn.so>"
  );
}

function getSupabaseSmtpConfig() {
  const host = process.env.SUPABASE_SMTP_HOST?.trim();
  const port = Number(process.env.SUPABASE_SMTP_PORT?.trim() ?? "0");
  const user = process.env.SUPABASE_SMTP_USER?.trim();
  const password = process.env.SUPABASE_SMTP_PASSWORD?.trim();
  const secure = process.env.SUPABASE_SMTP_SECURE?.trim() === "true" || port === 465;

  if (!host || !port || !user || !password) {
    return null;
  }

  return {
    host,
    port,
    secure,
    auth: { user, pass: password },
  };
}

export function getSupabaseEmailDeliveryStatus(): EmailTransportStatus {
  const smtpConfig = getSupabaseSmtpConfig();
  const fromEmail = getSupabaseEmailFrom();

  if (!smtpConfig) {
    return {
      configured: false,
      provider: "none",
      fromEmail: fromEmail || null,
      notice: "Email delivery is disabled. Add Supabase SMTP credentials to enable outbound mail.",
    };
  }

  return {
    configured: true,
    provider: "supabase",
    fromEmail: fromEmail || null,
    notice: "Email delivery is enabled via Supabase SMTP.",
  };
}

export async function sendEmailViaSupabaseSmtp(payload: EmailPayload) {
  const smtpConfig = getSupabaseSmtpConfig();
  const fromEmail = getSupabaseEmailFrom();

  if (!smtpConfig) {
    return { ok: true as const, provider: "none" as const, skipped: true as const };
  }

  const transporter = nodemailer.createTransport(smtpConfig);
  await transporter.sendMail({
    from: fromEmail,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });

  return { ok: true as const, provider: "supabase" as const };
}
