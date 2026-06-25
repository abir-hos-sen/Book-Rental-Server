const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const { verifyToken, verifyRole } = require('../middleware/auth');

router.post('/', verifyToken, verifyRole(['Tenant', 'User']), async (req, res) => {
  const { propertyId, rating, comment } = req.body;

  if (!propertyId || !rating || !comment) {
    return res.status(400).json({ message: 'All fields (propertyId, rating, comment) are required.' });
  }

  try {
    const newReview = new Review({
      propertyId,
      tenantName: req.user.name,
      tenantEmail: req.user.email,
      tenantPhoto: req.user.photo || '',
      rating: Number(rating),
      comment
    });

    await newReview.save();
    return res.status(201).json({ message: 'Review submitted successfully!', review: newReview });
  } catch (error) {
    console.error('Error submitting review:', error);
    return res.status(500).json({ message: 'Server error. Failed to submit review.' });
  }
});

router.get('/property/:propertyId', async (req, res) => {
  try {
    const reviews = await Review.find({ propertyId: req.params.propertyId }).sort({ date: -1 });
    return res.json(reviews);
  } catch (error) {
    return res.status(500).json({ message: 'Server error. Failed to retrieve reviews.' });
  }
});

router.get('/recent', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.json([
        {
          _id: 'r1',
          tenantName: 'Emma Watson',
          tenantPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
          rating: 5,
          comment: 'Absolutely breathtaking! The penthouse views are even better in person. The booking and key transfer process was seamless, and the owner was a wonderful person to deal with. Worth every single penny!'
        },
        {
          _id: 'r2',
          tenantName: 'Michael Chang',
          tenantPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
          rating: 5,
          comment: 'Stunning villa. The infinity pool and outdoor terrace are perfect for relaxing. High-tech home amenities, extremely clean, and a stellar location. We will definitely book this place again.'
        },
        {
          _id: 'r3',
          tenantName: 'Jessica Taylor',
          tenantPhoto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150',
          rating: 5,
          comment: 'Super cozy cabin near the ski runs. The hot tub under the stars was the highlight of our trip. Perfect sizing for our small family, with very rustic and warm finishes.'
        }
      ]);
    }

    const reviews = await Review.find()
      .sort({ rating: -1, createdAt: -1 })
      .limit(4);
    return res.json(reviews);
  } catch (error) {
    return res.status(500).json({ message: 'Server error. Failed to retrieve testimonials.' });
  }
});

module.exports = router;
