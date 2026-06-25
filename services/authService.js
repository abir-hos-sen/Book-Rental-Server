const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_dev_123';

const pendingRegistrations = new Map();

const generateToken = (user) => jwt.sign(
  { id: user._id, email: user.email, role: user.role, name: user.name },
  JWT_SECRET,
  { expiresIn: '7d' }
);

const normalizePublicRole = (role) => {
  if (role === 'Owner' || role === 'owner') return 'Owner';
  return 'Tenant';
};

const buildRegistrationEmailHtml = ({ name, otpCode }) => `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f0fdfa; padding: 30px; border-radius: 8px; max-width: 520px; margin: 0 auto; border: 1px solid #ccfbf1;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="color: #0d9488; margin: 0; font-size: 22px;">Property Rental</h2>
      <p style="color: #6b7280; font-size: 13px; margin-top: 4px;">Account Verification</p>
    </div>
    <p style="color: #374151; font-size: 15px;">Welcome, <strong>${name}</strong>!</p>
    <p style="color: #374151; font-size: 15px;">Enter the code below to verify your email and activate your account. Expires in <strong>10 minutes</strong>.</p>
    <div style="text-align: center; margin: 28px 0;">
      <span style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #0d9488; background: white; padding: 16px 28px; border-radius: 8px; display: inline-block; border: 2px solid #0d9488; box-shadow: 0 2px 12px rgba(13,148,136,0.15);">${otpCode}</span>
    </div>
    <p style="color: #6b7280; font-size: 13px;">If you did not create an account, please ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
    <p style="color: #9ca3af; font-size: 11px; text-align: center;">This is an automated message — please do not reply.</p>
  </div>
`;

const buildGoogleAuthUrl = () => `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/google/callback`)}&response_type=code&scope=email%20profile&prompt=select_account`;

const exchangeGoogleAuthCode = async (code) => {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/google/callback`
    })
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    throw new Error(`Failed to exchange Google auth code: ${errorBody}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
};

const fetchGoogleUserInfo = async (accessToken) => {
  const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!userResponse.ok) {
    const errorBody = await userResponse.text();
    throw new Error(`Failed to fetch Google user info: ${errorBody}`);
  }

  return userResponse.json();
};

module.exports = {
  generateToken,
  normalizePublicRole,
  pendingRegistrations,
  buildRegistrationEmailHtml,
  buildGoogleAuthUrl,
  exchangeGoogleAuthCode,
  fetchGoogleUserInfo,
};