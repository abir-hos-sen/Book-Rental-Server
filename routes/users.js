const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken, verifyRole } = require('../middleware/auth');

router.get('/', verifyToken, verifyRole(['Admin']), async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      // Return mock users if DB not ready
      return res.json([
        { _id: 'u_1', name: 'Sarah Jenkins', email: 'admin@rental.com', role: 'Admin', photo: '' },
        { _id: 'u_2', name: 'Robert Davis', email: 'owner@rental.com', role: 'Owner', photo: '' },
        { _id: 'u_3', name: 'Alex Mercer', email: 'tenant@rental.com', role: 'Tenant', photo: '' },
      ]);
    }
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error.message);
    return res.status(500).json({ message: 'Server error. Failed to retrieve users.' });
  }
});

router.patch('/:id/role', verifyToken, verifyRole(['Admin']), async (req, res) => {
  const { role } = req.body;
  if (!['Tenant', 'Owner', 'Admin', 'User'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role.' });
  }

  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.json({ message: `Role updated to ${role} successfully!`, mock: true });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.role = role;
    await user.save();
    return res.json({ message: `User role updated to ${role} successfully!`, user });
  } catch (error) {
    console.error('Error updating user role:', error.message);
    return res.status(500).json({ message: 'Server error. Failed to update user role.' });
  }
});

router.delete('/:id', verifyToken, verifyRole(['Admin']), async (req, res) => {
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.json({ message: 'User removed successfully!', mock: true });
  }
  try {
    await User.findByIdAndDelete(req.params.id);
    return res.json({ message: 'User deleted successfully!' });
  } catch (error) {
    console.error('Error deleting user:', error.message);
    return res.status(500).json({ message: 'Server error. Failed to delete user.' });
  }
});

module.exports = router;
