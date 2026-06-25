const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');
const reviewRoutes = require('./routes/reviews');
const favoriteRoutes = require('./routes/favorites');
const analyticsRoutes = require('./routes/analytics');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;
app.locals.dbReady = false;

app.use(morgan('dev'));

const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    let event;

    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === 'checkout.session.completed') {
      const Booking = require('./models/Booking');
      const { sendInvoiceEmail } = require('./services/paymentService');
      
      const session = event.data.object;
      const bookingId = session.metadata.bookingId;

      const booking = await Booking.findByIdAndUpdate(
        bookingId,
        {
          paymentStatus: 'Paid',
          status: 'Pending',
          transactionId: session.payment_intent,
          paidAt: new Date(),
        },
        { new: true }
      );

      if (booking) {
        await sendInvoiceEmail(booking);
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/booking-platform';

let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }
  
  // Set timeout so Vercel function doesn't hang forever if Atlas is unreachable
  cachedConnection = await mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 5000 
  });
  console.log('Successfully connected to MongoDB Database.');
  return cachedConnection;
};

// Middleware to run DB connection on demand for serverless requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    app.locals.dbReady = true;
    next();
  } catch (err) {
    app.locals.dbReady = false;
    console.error('Database connection error in request middleware:', err.message);
    // Do not fail the request; let the app continue in offline/mock fallback mode
    next();
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Property Rental & Booking Platform Backend Server is active.',
    version: '1.0.0'
  });
});

app.use((req, res, next) => {
  res.status(404).json({ message: 'Requested API endpoint not found.' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error occurred.' });
});

app.listen(PORT, () => {
  console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
