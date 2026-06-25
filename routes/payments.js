const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const Booking = require('../models/Booking');
const Property = require('../models/Property');
const { verifyToken, verifyRole } = require('../middleware/auth');
const { sendInvoiceEmail } = require('../services/paymentService');

const getStripe = () => require('stripe')(process.env.STRIPE_SECRET_KEY);

const MOCK_PROPERTIES = {
  '1': { title: 'Luxury Penthouse with Skyline Views', rent: 4200, ownerEmail: 'owner@rental.com' },
  '2': { title: 'Modern Minimalist Villa with Infinity Pool', rent: 8500, ownerEmail: 'owner@rental.com' },
  '3': { title: 'Cozy Alpine Cabin near Ski Slopes', rent: 350, ownerEmail: 'owner@rental.com' },
  '4': { title: 'Mid-Century Modern Suburban House', rent: 3600, ownerEmail: 'owner@rental.com' },
  '5': { title: 'Sleek Waterfront Studio Apartment', rent: 2100, ownerEmail: 'owner@rental.com' },
  '6': { title: 'Elegant Historic Townhouse', rent: 4800, ownerEmail: 'owner@rental.com' },
  '7': { title: 'Beach Front Luxury Resort', rent: 6500, ownerEmail: 'owner@rental.com' },
  '8': { title: 'Urban Loft Downtown', rent: 2800, ownerEmail: 'owner@rental.com' },
};

const resolveProperty = async (propertyId, propertyTitle, propertyRent) => {
  const mongoose = require('mongoose');
  let property = null;

  if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(propertyId)) {
    property = await Property.findById(propertyId);
  }

  if (!property && MOCK_PROPERTIES[propertyId]) {
    const m = MOCK_PROPERTIES[propertyId];
    property = {
      _id: propertyId,
      title: propertyTitle || m.title,
      rent: Number(propertyRent) || m.rent,
      ownerEmail: m.ownerEmail,
      ownerId: null,
      isMock: true,
    };
  }

  if (!property && (propertyTitle || propertyRent)) {
    property = {
      _id: propertyId || 'mock_prop_' + Date.now(),
      title: propertyTitle || 'Rental Property',
      rent: Number(propertyRent) || 1000,
      ownerEmail: 'owner@rental.com',
      ownerId: null,
      isMock: true,
    };
  }

  return property;
};

const saveBookingSafe = async (bookingData) => {
  const mongoose = require('mongoose');
  global.offlineBookings = global.offlineBookings || [];

  let bookingObj = { ...bookingData };
  if (!bookingObj._id) {
    bookingObj._id = 'bk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  }

  try {
    if (mongoose.connection.readyState === 1) {
      const booking = new Booking(bookingData);
      await booking.save();
      bookingObj = booking.toObject();
      global.offlineBookings.push(bookingObj);
      return booking;
    }
  } catch (err) {
    console.error('Mongoose booking save error:', err.message);
  }

  global.offlineBookings.push(bookingObj);
  return bookingObj;
};

router.post('/create-checkout-session', verifyToken, async (req, res) => {
  const { propertyId, moveInDate, tenantPhone, additionalNotes, propertyTitle, propertyRent } = req.body;

  const allowedRoles = ['Tenant', 'User'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Only Tenants can book properties.' });
  }

  if (!propertyId || !moveInDate || !tenantPhone) {
    return res.status(400).json({ message: 'propertyId, moveInDate, and tenantPhone are required.' });
  }

  try {
    const property = await resolveProperty(propertyId, propertyTitle, propertyRent);

    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    const booking = await saveBookingSafe({
      propertyId: property.isMock ? new (require('mongoose').Types.ObjectId)() : property._id,
      mockPropertyRef: property.isMock ? String(property._id) : null,
      propertyName: property.title,
      propertyImage: '',
      ownerEmail: property.ownerEmail,
      tenantEmail: req.user.email,
      tenantName: req.user.name,
      tenantPhone,
      moveInDate: new Date(moveInDate),
      additionalNotes: additionalNotes || '',
      amount: property.rent,
      status: 'Pending',
      paymentStatus: 'Unpaid',
    });

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: property.title,
              description: `Booking for ${new Date(moveInDate).toLocaleDateString()}`,
              images: [],
            },
            unit_amount: Math.round(property.rent * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/checkout/cancel`,
      customer_email: req.user.email,
      metadata: {
        bookingId: booking ? booking._id.toString() : 'mock',
        propertyId: property._id.toString(),
        tenantId: req.user.id,
      },
    });

    return res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe checkout session error:', error.message);
    return res.status(500).json({ message: error.message || 'Failed to create payment session.' });
  }
});

router.post('/card-payment/initiate', verifyToken, async (req, res) => {
  const { propertyId, moveInDate, tenantPhone, additionalNotes, propertyTitle, propertyRent } = req.body;

  const allowedRoles = ['Tenant', 'User'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Only Tenants can book properties.' });
  }

  if (!propertyId || !moveInDate || !tenantPhone) {
    return res.status(400).json({ message: 'propertyId, moveInDate, and tenantPhone are required.' });
  }

  try {
    const property = await resolveProperty(propertyId, propertyTitle, propertyRent);

    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    const booking = await saveBookingSafe({
      propertyId: property.isMock ? new (require('mongoose').Types.ObjectId)() : property._id,
      mockPropertyRef: property.isMock ? String(property._id) : null,
      propertyName: property.title,
      propertyImage: '',
      ownerEmail: property.ownerEmail,
      tenantEmail: req.user.email,
      tenantName: req.user.name,
      tenantPhone,
      moveInDate: new Date(moveInDate),
      additionalNotes: additionalNotes || '',
      amount: property.rent,
      status: 'Pending',
      paymentStatus: 'Unpaid',
    });

    const paymentId = `CARD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const bookingId = booking ? booking._id.toString() : `mock_${Date.now()}`;

    const sessionToken = crypto
      .createHmac('sha256', process.env.LOCAL_PAYMENT_SECRET || 'local_secret')
      .update(`${bookingId}:${paymentId}:${property.rent}`)
      .digest('hex');

    return res.json({
      paymentId,
      bookingId,
      amount: property.rent,
      currency: 'USD',
      propertyName: property.title,
      sessionToken,
    });
  } catch (error) {
    console.error('Card payment initiate error:', error.message);
    return res.status(500).json({ message: 'Failed to initiate card payment.' });
  }
});

router.post('/card-payment/confirm', verifyToken, async (req, res) => {
  const { bookingId, paymentId, sessionToken, cardHolder, cardNumber } = req.body;

  if (!bookingId || !paymentId || !sessionToken || !cardNumber) {
    return res.status(400).json({ message: 'Missing required parameters.' });
  }

  const transactionId = `TXN-CARD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(bookingId)) {
      const booking = await Booking.findById(bookingId);
      if (booking && booking.tenantEmail === req.user.email) {
        booking.paymentStatus = 'Paid';
        booking.status = 'Pending';
        booking.transactionId = transactionId;
        booking.paidAt = new Date();
        await booking.save();

        // Update global offline list too
        if (global.offlineBookings) {
          const idx = global.offlineBookings.findIndex(b => String(b._id) === String(bookingId));
          if (idx !== -1) {
            global.offlineBookings[idx] = booking.toObject();
          }
        }

        sendInvoiceEmail(booking).catch(() => {});
        return res.json({ booking, transactionId });
      }
    }
  } catch { }

  global.offlineBookings = global.offlineBookings || [];
  const existingOffline = global.offlineBookings.find(b => String(b._id) === String(bookingId));

  const fallbackBooking = {
    _id: bookingId,
    propertyName: existingOffline ? existingOffline.propertyName : 'Rental Property',
    amount: existingOffline ? existingOffline.amount : 1000,
    paymentStatus: 'Paid',
    status: 'Pending',
    transactionId,
    tenantEmail: req.user.email,
    tenantName: req.user.name,
    paidAt: new Date(),
  };

  // Ensure it exists and is marked paid in global offline list
  const idx = global.offlineBookings.findIndex(b => String(b._id) === String(bookingId));
  let matchedBooking = fallbackBooking;
  if (idx !== -1) {
    global.offlineBookings[idx].paymentStatus = 'Paid';
    global.offlineBookings[idx].transactionId = transactionId;
    global.offlineBookings[idx].paidAt = new Date();
    matchedBooking = global.offlineBookings[idx];
  } else {
    global.offlineBookings.push(fallbackBooking);
  }

  sendInvoiceEmail(matchedBooking).catch(() => {});

  return res.json({
    booking: matchedBooking,
    transactionId,
  });
});

router.post('/local-payment/initiate', verifyToken, async (req, res) => {
  const { propertyId, moveInDate, tenantPhone, additionalNotes, paymentMethod, propertyTitle, propertyRent } = req.body;

  const allowedRoles = ['Tenant', 'User'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Only Tenants can book properties.' });
  }

  const supportedMethods = ['bkash', 'nagad', 'rocket'];
  if (!propertyId || !moveInDate || !tenantPhone || !supportedMethods.includes(paymentMethod)) {
    return res.status(400).json({ message: 'Invalid request parameters.' });
  }

  try {
    const property = await resolveProperty(propertyId, propertyTitle, propertyRent);

    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    const booking = await saveBookingSafe({
      propertyId: property.isMock ? new (require('mongoose').Types.ObjectId)() : property._id,
      mockPropertyRef: property.isMock ? String(property._id) : null,
      propertyName: property.title,
      propertyImage: '',
      ownerEmail: property.ownerEmail,
      tenantEmail: req.user.email,
      tenantName: req.user.name,
      tenantPhone,
      moveInDate: new Date(moveInDate),
      additionalNotes: additionalNotes || '',
      amount: property.rent,
      status: 'Pending',
      paymentStatus: 'Unpaid',
    });

    const amountBDT = Math.round(property.rent * 120);
    const paymentId = `${paymentMethod.toUpperCase()}-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const bookingId = booking ? booking._id.toString() : `mock_${Date.now()}`;

    const sessionToken = crypto
      .createHmac('sha256', process.env.LOCAL_PAYMENT_SECRET || 'local_secret')
      .update(`${bookingId}:${paymentId}:${amountBDT}`)
      .digest('hex');

    return res.json({
      paymentId,
      bookingId,
      amount: amountBDT,
      currency: 'BDT',
      paymentMethod,
      propertyName: property.title,
      sessionToken,
    });
  } catch (error) {
    console.error('Local payment initiate error:', error.message);
    return res.status(500).json({ message: 'Failed to initiate local payment.' });
  }
});

router.post('/local-payment/confirm', verifyToken, async (req, res) => {
  const { bookingId, paymentId, sessionToken, mobileNumber } = req.body;

  if (!bookingId || !paymentId || !sessionToken || !mobileNumber) {
    return res.status(400).json({ message: 'bookingId, paymentId, sessionToken and mobileNumber are required.' });
  }

  if (!/^01[3-9]\d{8}$/.test(mobileNumber)) {
    return res.status(400).json({ message: 'Invalid mobile number format.' });
  }

  const transactionId = `TXN${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(bookingId)) {
      const booking = await Booking.findById(bookingId);
      if (booking && booking.tenantEmail === req.user.email) {
        booking.paymentStatus = 'Paid';
        booking.status = 'Pending';
        booking.transactionId = transactionId;
        booking.paidAt = new Date();
        await booking.save();

        if (global.offlineBookings) {
          const idx = global.offlineBookings.findIndex(b => String(b._id) === String(bookingId));
          if (idx !== -1) {
            global.offlineBookings[idx] = booking.toObject();
          }
        }

        sendInvoiceEmail(booking).catch(() => {});
        return res.json({ booking, transactionId });
      }
    }
  } catch { }

  global.offlineBookings = global.offlineBookings || [];
  const existingOffline = global.offlineBookings.find(b => String(b._id) === String(bookingId));

  const fallbackBooking = {
    _id: bookingId,
    propertyName: existingOffline ? existingOffline.propertyName : 'Rental Property',
    amount: existingOffline ? existingOffline.amount : 1000,
    paymentStatus: 'Paid',
    status: 'Pending',
    transactionId,
    tenantEmail: req.user.email,
    tenantName: req.user.name,
    paidAt: new Date(),
  };

  const idx = global.offlineBookings.findIndex(b => String(b._id) === String(bookingId));
  let matchedBooking = fallbackBooking;
  if (idx !== -1) {
    global.offlineBookings[idx].paymentStatus = 'Paid';
    global.offlineBookings[idx].transactionId = transactionId;
    global.offlineBookings[idx].paidAt = new Date();
    matchedBooking = global.offlineBookings[idx];
  } else {
    global.offlineBookings.push(fallbackBooking);
  }

  sendInvoiceEmail(matchedBooking).catch(() => {});

  return res.json({
    booking: matchedBooking,
    transactionId,
  });
});

router.post('/verify-session', verifyToken, async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ message: 'Session ID is required.' });
  }

  if (sessionId.startsWith('mock_') || sessionId.startsWith('local_') || sessionId.startsWith('TXN')) {
    const mockBooking = {
      _id: 'bk_mock_' + Date.now(),
      propertyName: 'Rental Property',
      amount: 1200,
      moveInDate: new Date(),
      transactionId: sessionId,
      paymentStatus: 'Paid',
      status: 'Pending',
      tenantEmail: req.user.email,
      tenantName: req.user.name,
    };
    sendInvoiceEmail(mockBooking).catch(() => {});
    return res.json({
      booking: mockBooking
    });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const bookingId = session.metadata?.bookingId;
      let booking = null;

      try {
        const mongoose = require('mongoose');
        if (bookingId && bookingId !== 'mock' && mongoose.connection.readyState === 1) {
          booking = await Booking.findByIdAndUpdate(
            bookingId,
            { paymentStatus: 'Paid', transactionId: session.payment_intent, paidAt: new Date() },
            { new: true }
          );
        }
      } catch { }

      if (!booking) {
        booking = {
          _id: bookingId || 'bk_' + Date.now(),
          propertyName: session.metadata?.propertyName || 'Rental Property',
          amount: session.amount_total ? session.amount_total / 100 : 0,
          moveInDate: new Date(),
          transactionId: session.payment_intent || sessionId,
          paymentStatus: 'Paid',
          status: 'Pending',
          tenantEmail: req.user.email,
          tenantName: req.user.name,
        };
      }

      sendInvoiceEmail(booking).catch(() => {});

      return res.json({ booking });
    }

    return res.status(400).json({ message: 'Payment not completed yet.' });
  } catch (error) {
    console.error('Verify session error:', error.message);
    return res.status(500).json({ message: 'Failed to verify session.' });
  }
});

router.get('/admin', verifyToken, verifyRole(['Admin']), async (req, res) => {
  try {
    const paidBookings = await Booking.find({ paymentStatus: 'Paid' })
      .sort({ paidAt: -1 })
      .limit(100)
      .lean();

    const payments = paidBookings.map((b) => ({
      _id: b._id,
      bookingId: b._id,
      amount: b.amount,
      paymentStatus: 'Succeeded',
      transactionId: b.transactionId || `tx_${b._id}`,
      payerName: b.tenantName,
      payerEmail: b.tenantEmail,
      createdAt: b.paidAt || b.createdAt,
    }));

    return res.json(payments);
  } catch (err) {
    console.error('Admin payments fetch error:', err.message);
    return res.status(500).json({ message: 'Failed to fetch payment logs.' });
  }
});

module.exports = router;
