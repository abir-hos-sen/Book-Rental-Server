const express = require('express');
const router = express.Router();
const Favorite = require('../models/Favorite');
const Property = require('../models/Property');
const { verifyToken, verifyRole } = require('../middleware/auth');

router.post('/', verifyToken, verifyRole(['Tenant', 'User']), async (req, res) => {
  const { propertyId } = req.body;

  if (!propertyId) {
    return res.status(400).json({ message: 'Property ID is required.' });
  }

  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    global.offlineFavorites = global.offlineFavorites || [];

    const mockProps = [
      {
        _id: '1',
        title: 'Luxury Penthouse with Skyline Views',
        rent: 4200,
        ownerEmail: 'owner@rental.com',
        images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=600']
      },
      {
        _id: '2',
        title: 'Modern Minimalist Villa with Infinity Pool',
        rent: 8500,
        ownerEmail: 'owner@rental.com',
        images: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&q=80&w=600']
      },
      {
        _id: '3',
        title: 'Cozy Alpine Cabin near Ski Slopes',
        rent: 350,
        ownerEmail: 'owner@rental.com',
        images: ['https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=600']
      }
    ];

    const property = mockProps.find(p => p._id === propertyId) || mockProps[0];
    const exists = global.offlineFavorites.find(
      fav => fav.propertyId._id === property._id && fav.tenantEmail === req.user.email
    );

    if (exists) {
      return res.status(400).json({ message: 'Property is already in your favorites.' });
    }

    const favorite = {
      _id: 'mock_fav_' + Date.now(),
      propertyId: property,
      tenantEmail: req.user.email,
      createdAt: new Date()
    };

    global.offlineFavorites.push(favorite);
    return res.status(201).json({ message: 'Property added to favorites (offline mode)!', favorite });
  }

  try {
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    const existingFavorite = await Favorite.findOne({
      propertyId,
      tenantEmail: req.user.email
    });

    if (existingFavorite) {
      return res.status(400).json({ message: 'Property is already in your favorites.' });
    }

    const favorite = new Favorite({
      propertyId,
      tenantEmail: req.user.email
    });

    await favorite.save();
    return res.status(201).json({ message: 'Property added to favorites!', favorite });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return res.status(500).json({ message: 'Server error. Failed to add favorite.' });
  }
});

router.get('/tenant', verifyToken, verifyRole(['Tenant', 'User']), async (req, res) => {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    const list = (global.offlineFavorites || []).filter(fav => fav.tenantEmail === req.user.email);
    return res.json(list);
  }

  try {
    const favorites = await Favorite.find({ tenantEmail: req.user.email })
      .populate('propertyId')
      .sort({ createdAt: -1 });
    
    const validFavorites = favorites.filter(fav => fav.propertyId !== null);
    
    const offlineList = (global.offlineFavorites || []).filter(fav => fav.tenantEmail === req.user.email);
    const merged = [...offlineList, ...validFavorites];
    
    return res.json(merged);
  } catch (error) {
    console.error('Error getting favorites:', error);
    return res.status(500).json({ message: 'Server error. Failed to get favorites.' });
  }
});

router.delete('/:propertyId', verifyToken, verifyRole(['Tenant', 'User']), async (req, res) => {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1 || req.params.propertyId.length < 5) {
    global.offlineFavorites = global.offlineFavorites || [];
    const index = global.offlineFavorites.findIndex(
      fav => fav.propertyId._id === req.params.propertyId && fav.tenantEmail === req.user.email
    );
    if (index === -1) {
      return res.status(404).json({ message: 'Property not found in your favorites.' });
    }
    global.offlineFavorites.splice(index, 1);
    return res.json({ message: 'Property removed from favorites!' });
  }

  try {
    const favorite = await Favorite.findOneAndDelete({
      propertyId: req.params.propertyId,
      tenantEmail: req.user.email
    });

    if (!favorite) {
      return res.status(404).json({ message: 'Property not found in your favorites.' });
    }

    return res.json({ message: 'Property removed from favorites!' });
  } catch (error) {
    console.error('Error removing favorite:', error);
    return res.status(500).json({ message: 'Server error. Failed to remove favorite.' });
  }
});

module.exports = router;
