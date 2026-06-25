const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');
const {
  generateToken,
  normalizePublicRole,
  pendingRegistrations,
  buildRegistrationEmailHtml,
  buildGoogleAuthUrl,
  exchangeGoogleAuthCode,
  fetchGoogleUserInfo,
} = require('../services/authservice');

router.post('/register', async (req, res) => {
  const { name, email, password, photo, role } = req.body;
  const selectedRole = normalizePublicRole(role);

  try {
    if (!req.app.locals.dbReady) {
      const mockUser = {
        _id: 'mock_registered_' + Date.now(),
        name,
        email,
        role: selectedRole,
        photo: photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
      };
      const token = generateToken(mockUser);
      res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'none', maxAge: 7 * 24 * 60 * 60 * 1000 });
      return res.status(201).json({ message: 'Registration successful (Offline)!', token, user: { id: mockUser._id, name: mockUser.name, email: mockUser.email, photo: mockUser.photo, role: mockUser.role } });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    pendingRegistrations.set(email, {
      name,
      email,
      hashedPassword,
      photo: photo || undefined,
      role: selectedRole,
      otpCode,
      otpExpires
    });

    setTimeout(() => pendingRegistrations.delete(email), 15 * 60 * 1000);

    try {
      await sendEmail({
        to: email,
        subject: 'Verify your account — Property Rental',
        text: `Welcome, ${name}! Your verification code is ${otpCode}. It expires in 10 minutes.`,
        html: buildRegistrationEmailHtml({ name, otpCode })
      });
    } catch (mailError) {
      pendingRegistrations.delete(email);
      console.error('Failed to send registration OTP:', mailError.message);
      return res.status(500).json({ message: 'Could not send verification email. Please try again.' });
    }

    return res.json({
      status: 'OTP_REQUIRED',
      email,
      message: 'A verification code has been sent to your email.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

router.post('/verify-register-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    const pending = pendingRegistrations.get(email);

    if (!pending) {
      return res.status(400).json({ message: 'No pending registration found. Please register again.' });
    }

    if (pending.otpCode !== otp) {
      return res.status(400).json({ message: 'Invalid verification code.' });
    }

    if (new Date() > pending.otpExpires) {
      pendingRegistrations.delete(email);
      return res.status(400).json({ message: 'Verification code has expired. Please register again.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      pendingRegistrations.delete(email);
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const newUser = new User({
      name: pending.name,
      email: pending.email,
      password: pending.hashedPassword,
      photo: pending.photo,
      role: pending.role
    });

    await newUser.save();
    pendingRegistrations.delete(email);

    const token = generateToken(newUser);
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'none', maxAge: 7 * 24 * 60 * 60 * 1000 });

    return res.status(201).json({
      message: 'Account verified and created successfully!',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        photo: newUser.photo,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Registration OTP verification error:', error);
    return res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!req.app.locals.dbReady) {
      let role = 'Tenant';
      let name = 'Alex Mercer';
      if (email.includes('admin')) {
        role = 'Admin';
        name = 'Sarah Jenkins';
      } else if (email.includes('owner')) {
        role = 'Owner';
        name = 'Robert Davis';
      } else if (email.includes('tenant')) {
        role = 'Tenant';
        name = 'Emma Watson';
      }

      const mockUser = {
        _id: 'mock_user_123',
        name,
        email,
        role,
        photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
      };
      const token = generateToken(mockUser);
      res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'none', maxAge: 7 * 24 * 60 * 60 * 1000 });
      return res.json({ message: 'Login successful (Offline)!', token, user: { id: mockUser._id, name: mockUser.name, email: mockUser.email, photo: mockUser.photo, role: mockUser.role } });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    if (!user.password) {
      return res.status(400).json({ message: 'This account uses Google Sign-In. Please use the Google login button.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const token = generateToken(user);
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'none', maxAge: 7 * 24 * 60 * 60 * 1000 });

    return res.json({
      message: 'Login successful!',
      token,
      user: { id: user._id, name: user.name, email: user.email, photo: user.photo, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

router.get('/google', (req, res) => {
  res.redirect(buildGoogleAuthUrl());
});

router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error('Google error:', error);
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=${error}`);
  }

  if (!code) {
    console.error('No authorization code received');
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=no_code`);
  }

  try {
    const accessToken = await exchangeGoogleAuthCode(code);
    const googleUser = await fetchGoogleUserInfo(accessToken);

    const email = googleUser.email;
    const name = googleUser.name || email.split('@')[0];
    const photo = googleUser.picture;
    const googleId = googleUser.id;

    if (!req.app.locals.dbReady) {
      const mockUser = {
        _id: `mock_google_${Date.now()}`,
        name,
        email,
        photo,
        googleId,
        role: 'Tenant'
      };

      const token = generateToken(mockUser);
      res.cookie('token', token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard?token=${encodeURIComponent(token)}`);
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        name,
        email,
        photo,
        googleId,
        role: 'Tenant'
      });
      await user.save();
    } else {
      if (!user.googleId) {
        user.googleId = googleId;
        user.photo = photo || user.photo;
      }
      await user.save();
    }

    const token = generateToken(user);
    res.cookie('token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard?token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error('Google callback error:', error.response?.data || error.message);
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=${encodeURIComponent(error.message)}`);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ message: 'Logged out successfully!' });
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    if (!req.app.locals.dbReady) {
      return res.json({
        user: {
          id: req.user.id || 'mock_user_123',
          name: req.user.name || 'User Account',
          email: req.user.email,
          role: req.user.role || 'Tenant',
          photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
        }
      });
    }

    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.json({ user });
  } catch (error) {
    return res.json({
      user: {
        id: req.user.id || 'mock_user_123',
        name: req.user.name || 'User Account',
        email: req.user.email,
        role: req.user.role || 'Tenant',
        photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
      }
    });
  }
});

router.put('/me', verifyToken, async (req, res) => {
  const { name, photo, email } = req.body;
  try {
    if (!req.app.locals.dbReady) {
      return res.json({
        message: 'Profile updated successfully (offline simulation)!',
        user: {
          id: req.user.id || 'mock_user_123',
          name: name || req.user.name || 'User Account',
          email: email || req.user.email,
          photo: photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          role: req.user.role || 'Tenant'
        }
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (name) user.name = name;
    if (photo) user.photo = photo;

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already in use by another account.' });
      }
      user.email = email;
    }

    await user.save();
    const token = generateToken(user);

    return res.json({
      message: 'Profile updated successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photo: user.photo,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
