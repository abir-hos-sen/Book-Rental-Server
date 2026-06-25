const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const User = require('../models/User');
const { verifyToken, verifyRole } = require('../middleware/auth');

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

router.get('/admin-overview', verifyToken, verifyRole(['Admin']), async (req, res) => {
  // Always include offline bookings
  const offlineBookings = global.offlineBookings || [];
  const offlineRevenue = offlineBookings
    .filter(b => b.paymentStatus === 'Paid')
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  let totalUsers = 0, totalProperties = 0, pendingProperties = 0, dbBookings = 0, dbRevenue = 0;
  let chartData = [];

  try {
    totalUsers = await User.countDocuments();
    totalProperties = await Property.countDocuments();
    pendingProperties = await Property.countDocuments({ status: 'Pending' });
    dbBookings = await Booking.countDocuments();

    const revenueAgg = await Booking.aggregate([
      { $match: { paymentStatus: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    dbRevenue = revenueAgg[0]?.total || 0;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyAgg = await Booking.aggregate([
      { $match: { paymentStatus: 'Paid', paidAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } }, revenue: { $sum: '$amount' }, bookings: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    chartData = monthlyAgg.map(m => ({
      name: `${MONTH_NAMES[m._id.month - 1]} ${String(m._id.year).slice(-2)}`,
      revenue: m.revenue,
      bookings: m.bookings
    }));
  } catch { /* DB offline — use offline data only */ }

  return res.json({
    totalUsers,
    totalProperties,
    pendingProperties,
    totalBookings: dbBookings + offlineBookings.length,
    totalRevenue: dbRevenue + offlineRevenue,
    chartData,
    monthlyRevenue: chartData
  });
});

router.get('/owner-overview', verifyToken, verifyRole(['Owner']), async (req, res) => {
  const ownerEmail = req.user.email;

  // Always include offline bookings (works even if DB is offline)
  const offlineBookings = (global.offlineBookings || []).filter(
    b => b.ownerEmail?.toLowerCase() === ownerEmail.toLowerCase() && b.paymentStatus === 'Paid'
  );

  let totalProperties = 0;
  let dbPaidBookings = [];

  try {
    totalProperties = await Property.countDocuments({ ownerEmail });
    dbPaidBookings = await Booking.find({ ownerEmail, paymentStatus: 'Paid' });
  } catch { /* DB offline — use offline data only */ }

  const paidBookings = [...dbPaidBookings, ...offlineBookings];
  const totalEarnings = paidBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalBookings = paidBookings.length;

  const monthlyEarnings = Array(12).fill(0).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - index);
    return { month: date.toLocaleString('default', { month: 'short' }), year: date.getFullYear(), monthIndex: date.getMonth(), revenue: 0, bookings: 0 };
  }).reverse();

  paidBookings.forEach(booking => {
    if (booking.paidAt) {
      const paidDate = new Date(booking.paidAt);
      const match = monthlyEarnings.find(m => m.monthIndex === paidDate.getMonth() && m.year === paidDate.getFullYear());
      if (match) { match.revenue += booking.amount || 0; match.bookings += 1; }
    }
  });

  const chartData = monthlyEarnings.map(m => ({
    name: `${m.month} ${String(m.year).slice(-2)}`,
    revenue: m.revenue,
    bookings: m.bookings
  }));

  return res.json({
    totalProperties,
    totalBookings,
    totalRevenue: totalEarnings,
    chartData,
    monthlyRevenue: chartData
  });
});

router.get('/transactions', verifyToken, verifyRole(['Admin']), async (req, res) => {
  try {
    const transactions = await Booking.find({ paymentStatus: 'Paid' })
      .select('transactionId propertyName tenantName ownerEmail tenantEmail amount paidAt')
      .sort({ paidAt: -1 });

    const formatted = transactions.map(tx => ({
      id: tx.transactionId,
      propertyName: tx.propertyName,
      tenantName: tx.tenantName,
      tenantEmail: tx.tenantEmail,
      ownerEmail: tx.ownerEmail,
      amount: tx.amount,
      date: tx.paidAt
    }));

    return res.json(formatted);
  } catch (error) {
    console.error('Transactions fetch error:', error);
    return res.status(500).json({ message: 'Server error fetching transactions.' });
  }
});

module.exports = router;
