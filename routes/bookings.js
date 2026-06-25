const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const { verifyToken, verifyRole } = require('../middleware/auth');

const uniqueById = (items = []) => {
  const seen = new Map();
  items.forEach(item => {
    if (!item?._id) return;
    seen.set(String(item._id), item);
  });
  return Array.from(seen.values());
};

router.get('/tenant', verifyToken, verifyRole(['Tenant', 'User']), async (req, res) => {
  const mongoose = require('mongoose');
  const userEmailLower = req.user.email?.toLowerCase();

  if (mongoose.connection.readyState !== 1) {
    const list = (global.offlineBookings || []).filter(b => b.tenantEmail?.toLowerCase() === userEmailLower);
    return res.json(list);
  }

  try {
    const bookings = await Booking.find({ 
      tenantEmail: { $regex: new RegExp(`^${req.user.email}$`, 'i') } 
    }).sort({ createdAt: -1 });

    const offlineList = (global.offlineBookings || []).filter(b => b.tenantEmail?.toLowerCase() === userEmailLower);
    const merged = uniqueById([...offlineList, ...bookings]);
    return res.json(merged);
  } catch (error) {
    return res.status(500).json({ message: 'Server error. Failed to get bookings.' });
  }
});

router.get('/owner', verifyToken, verifyRole(['Owner']), async (req, res) => {
  const mongoose = require('mongoose');
  const userEmailLower = req.user.email?.toLowerCase();

  if (mongoose.connection.readyState !== 1) {
    const list = (global.offlineBookings || []).filter(b => b.ownerEmail?.toLowerCase() === userEmailLower && b.status === 'Pending');
    return res.json(list);
  }

  try {
    const bookings = await Booking.find({ 
      ownerEmail: { $regex: new RegExp(`^${req.user.email}$`, 'i') }, 
      status: 'Pending' 
    }).sort({ createdAt: -1 });

    const offlineList = (global.offlineBookings || []).filter(b => b.ownerEmail?.toLowerCase() === userEmailLower && b.status === 'Pending');
    const merged = uniqueById([...offlineList, ...bookings]);
    return res.json(merged);
  } catch (error) {
    return res.status(500).json({ message: 'Server error. Failed to get booking requests.' });
  }
});

router.get('/admin', verifyToken, verifyRole(['Admin']), async (req, res) => {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    return res.json(uniqueById(global.offlineBookings || []));
  }

  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    const merged = uniqueById([...(global.offlineBookings || []), ...bookings]);
    return res.json(merged);
  } catch (error) {
    return res.status(500).json({ message: 'Server error. Failed to get bookings.' });
  }
});

router.patch('/:id/status', verifyToken, verifyRole(['Owner', 'Admin']), async (req, res) => {
  const { status } = req.body;

  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status update. Must be Approved or Rejected.' });
  }

  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1 || req.params.id.startsWith('mock_b_')) {
    global.offlineBookings = global.offlineBookings || [];
    const booking = global.offlineBookings.find(b => b._id === req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking request not found.' });
    }
    booking.status = status;
    return res.json({ message: `Booking request status updated to ${status}!`, booking });
  }

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking request not found.' });
    }

    if (req.user.role !== 'Admin' && booking.ownerEmail?.toLowerCase() !== req.user.email?.toLowerCase()) {
      return res.status(403).json({ message: 'Access denied. You do not own this property.' });
    }

    booking.status = status;
    await booking.save();

    // Update offline booking too
    if (global.offlineBookings) {
      const idx = global.offlineBookings.findIndex(b => String(b._id) === String(req.params.id));
      if (idx !== -1) {
        global.offlineBookings[idx].status = status;
      }
    }

    return res.json({ message: `Booking request status updated to ${status}!`, booking });
  } catch (error) {
    return res.status(500).json({ message: 'Server error. Failed to update booking status.' });
  }
});

module.exports = router;
