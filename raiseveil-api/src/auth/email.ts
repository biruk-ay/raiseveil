import nodemailer from "nodemailer";

interface AuthEmail {
  to: string;
  subject: string;
  text: string;
}

export async function sendAuthEmail(email: AuthEmail): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!smtpUrl || !from) {
    throw new Error("SMTP_URL and AUTH_EMAIL_FROM must be configured to send account emails");
  }

  const transport = nodemailer.createTransport(smtpUrl);
  await transport.sendMail({ ...email, from });
}
