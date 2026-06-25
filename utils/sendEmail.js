const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, text, html }) => {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');

  // If credentials are missing, log and skip — don't block the OTP flow
  if (!smtpUser || !smtpPass) {
    console.warn('⚠️  SMTP credentials missing in server/.env');
    console.warn('    Add SMTP_USER and SMTP_PASS to send real emails.');
    console.log(`📧 [MOCK EMAIL] To: ${to} | Subject: ${subject}`);
    console.log(`🔑 [MOCK CODE] ${text}`);
    return { success: true, mock: true };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,   // true for port 465 (SSL), false for 587 (STARTTLS)
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    tls: {
      rejectUnauthorized: false  // allow self-signed certs in local dev
    }
  });

  try {
    // Verify connection before sending
    await transporter.verify();

    const info = await transporter.sendMail({
      from: `"Property Rental" <${smtpUser}>`,
      to,
      subject,
      text,
      html
    });

    console.log(`✉️  Email sent to ${to} — Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ SMTP send error:', error.message);
    // Throw so the caller can return a proper error response
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

module.exports = sendEmail;
