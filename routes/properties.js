const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const { verifyToken, verifyRole } = require('../middleware/auth');

const MOCK_PROPERTIES = [
  {
    _id: '1',
    title: 'Luxury Penthouse with Skyline Views',
    description: 'Stunning luxury penthouse in the heart of downtown. Features floor-to-ceiling windows, modern kitchen appliances, private terrace, and 24/7 concierge.',
    location: 'Dhaka, Dhaka Division',
    propertyType: 'Apartment',
    rent: 4200,
    rentType: 'Monthly',
    bedrooms: 3,
    bathrooms: 2.5,
    propertySize: 1850,
    images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=600'],
    status: 'Approved',
    ownerName: 'Robert Davis',
    ownerEmail: 'owner@rental.com',
    amenities: ['Wifi', 'Pool', 'Gym', 'Parking']
  },
  {
    _id: '2',
    title: 'Modern Minimalist Villa with Infinity Pool',
    description: 'Escape to this architectural masterpiece. Nestled in the hills, this villa offers absolute privacy, a magnificent infinity pool overlooking the ocean, open-plan living.',
    location: 'Chattogram, Chattogram Division',
    propertyType: 'Villa',
    rent: 8500,
    rentType: 'Monthly',
    bedrooms: 4,
    bathrooms: 4,
    propertySize: 3200,
    images: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&q=80&w=600'],
    status: 'Approved',
    ownerName: 'Robert Davis',
    ownerEmail: 'owner@rental.com',
    amenities: ['Wifi', 'Pool', 'Gym', 'Kitchen']
  },
  {
    _id: '3',
    title: 'Cozy Alpine Cabin near Ski Slopes',
    description: 'A charming wooden cabin perfect for winter getaways. Enjoy a warm fireplace, outdoor hot tub, rustic design elements, and easy ski-in/ski-out access.',
    location: 'Sylhet, Sylhet Division',
    propertyType: 'Cabin',
    rent: 350,
    rentType: 'Daily',
    bedrooms: 2,
    bathrooms: 1.5,
    images: ['https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=600'],
    status: 'Approved',
    ownerName: 'Robert Davis',
    ownerEmail: 'owner@rental.com',
    amenities: ['Fireplace', 'Hot Tub', 'Wifi']
  },
  {
    _id: '4',
    title: 'Mid-Century Modern Suburban House',
    description: 'Beautifully restored mid-century modern home. Offers a spacious green backyard, newly renovated kitchen, high-beamed ceilings, and is located in a family-friendly area.',
    location: 'Rajshahi, Rajshahi Division',
    propertyType: 'House',
    rent: 3600,
    rentType: 'Monthly',
    bedrooms: 3,
    bathrooms: 2,
    images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=600'],
    status: 'Approved',
    ownerName: 'Robert Davis',
    ownerEmail: 'owner@rental.com',
    amenities: ['Backyard', 'Kitchen', 'Garage']
  },
  {
    _id: '5',
    title: 'Sleek Waterfront Studio Apartment',
    description: 'Chic waterfront studio apartment with breathtaking harbor views. Includes floor heating, stylish minimalist furniture, rooftop terrace access, and secure access.',
    location: 'Khulna, Khulna Division',
    propertyType: 'Apartment',
    rent: 2100,
    rentType: 'Monthly',
    bedrooms: 1,
    bathrooms: 1,
    images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=600'],
    status: 'Approved',
    ownerName: 'Robert Davis',
    ownerEmail: 'owner@rental.com',
    amenities: ['Waterfront', 'Heating', 'Rooftop']
  },
  {
    _id: '6',
    title: 'Elegant Historic Townhouse',
    description: 'Exquisite historic townhouse featuring original brick walls, multiple fireplaces, library space, and a private courtyard. Lovingly maintained.',
    location: 'Barishal, Barishal Division',
    propertyType: 'House',
    rent: 4800,
    rentType: 'Monthly',
    bedrooms: 4,
    bathrooms: 3.5,
    images: ['https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=600'],
    status: 'Approved',
    ownerName: 'Robert Davis',
    ownerEmail: 'owner@rental.com',
    amenities: ['Fireplace', 'Courtyard', 'Library']
  },
  {
    _id: '7',
    title: 'Beach Front Luxury Resort',
    description: 'A beautiful luxury resort right on the beach. Great for vacations, features premium suites and beachfront access.',
    location: 'Dhaka, Dhaka Division',
    propertyType: 'Villa',
    rent: 6500,
    rentType: 'Monthly',
    bedrooms: 5,
    bathrooms: 4,
    images: ['https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=600'],
    status: 'Approved',
    ownerName: 'Robert Davis',
    ownerEmail: 'owner@rental.com',
    amenities: ['Beachfront', 'Pool', 'Wifi']
  },
  {
    _id: '8',
    title: 'Urban Loft Downtown',
    description: 'Modern loft in downtown with top-tier finishes and design.',
    location: 'Chattogram, Chattogram Division',
    propertyType: 'Apartment',
    rent: 2800,
    rentType: 'Monthly',
    bedrooms: 2,
    bathrooms: 1.5,
    images: ['https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&q=80&w=600'],
    status: 'Approved',
    ownerName: 'Robert Davis',
    ownerEmail: 'owner@rental.com',
    amenities: ['Downtown', 'Modern', 'Parking']
  }
];

router.post('/', verifyToken, verifyRole(['Owner', 'Admin', 'Tenant']), async (req, res) => {
  const {
    title,
    description,
    location,
    propertyType,
    rent,
    rentType,
    bedrooms,
    bathrooms,
    propertySize,
    amenities,
    images,
    extraFeatures
  } = req.body;

  try {
    const newProperty = new Property({
      title,
      description,
      location,
      propertyType,
      rent: Number(rent),
      rentType,
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
      propertySize: Number(propertySize),
      amenities,
      images,
      extraFeatures,
      status: 'Pending',
      ownerEmail: req.user.email,
      ownerName: req.user.name
    });

    await newProperty.save();
    return res.status(201).json({ message: 'Property created and is pending approval!', property: newProperty });
  } catch (error) {
    console.error('Error creating property:', error);
    return res.status(500).json({ message: 'Server error. Failed to create property.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const Booking = require('../models/Booking');
    let propertiesList = [];
    let isOffline = mongoose.connection.readyState !== 1;

    if (isOffline) {
      const { search, propertyType, minPrice, maxPrice, sort, page = 1, limit = 9 } = req.query;
      let filtered = [...MOCK_PROPERTIES];

      if (search) {
        const searchLower = decodeURIComponent(search).toLowerCase();
        filtered = filtered.filter(p => 
          p.location.toLowerCase().includes(searchLower) || 
          p.title.toLowerCase().includes(searchLower)
        );
      }

      if (propertyType && propertyType !== 'All') {
        filtered = filtered.filter(p => p.propertyType === propertyType);
      }

      if (minPrice) {
        filtered = filtered.filter(p => p.rent >= Number(minPrice));
      }
      if (maxPrice) {
        filtered = filtered.filter(p => p.rent <= Number(maxPrice));
      }

      if (sort === 'price_asc') {
        filtered.sort((a, b) => a.rent - b.rent);
      } else if (sort === 'price_desc') {
        filtered.sort((a, b) => b.rent - a.rent);
      } else {
        filtered.sort((a, b) => b._id.localeCompare(a._id));
      }

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const startIndex = (pageNum - 1) * limitNum;
      const paginated = filtered.slice(startIndex, startIndex + limitNum);

      propertiesList = paginated.map(p => ({ ...p }));

      // Inject isBooked from offline bookings
      propertiesList.forEach(p => {
        p.isBooked = !!(global.offlineBookings && global.offlineBookings.some(b => String(b.propertyId) === String(p._id) && b.paymentStatus === 'Paid'));
      });

      return res.json({
        properties: propertiesList,
        currentPage: pageNum,
        totalPages: Math.ceil(filtered.length / limitNum),
        totalProperties: filtered.length
      });
    }

    const { search, propertyType, minPrice, maxPrice, sort, page = 1, limit = 9 } = req.query;
    const query = { status: 'Approved' };

    if (search) {
      query.$or = [
        { location: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }

    if (propertyType && propertyType !== 'All') {
      query.propertyType = propertyType;
    }

    if (minPrice || maxPrice) {
      query.rent = {};
      if (minPrice) query.rent.$gte = Number(minPrice);
      if (maxPrice) query.rent.$lte = Number(maxPrice);
    }

    let sortOptions = { createdAt: -1 };
    if (sort === 'price_asc') {
      sortOptions = { rent: 1 };
    } else if (sort === 'price_desc') {
      sortOptions = { rent: -1 };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const totalProperties = await Property.countDocuments(query);
    const dbProperties = await Property.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    propertiesList = dbProperties.map(p => p.toObject());

    // Check bookings for each property in parallel
    for (let p of propertiesList) {
      let isBooked = false;
      const dbBooking = await Booking.findOne({ propertyId: p._id, paymentStatus: 'Paid' });
      if (dbBooking) isBooked = true;
      if (!isBooked && global.offlineBookings) {
        const offBooking = global.offlineBookings.find(b => 
          (String(b.propertyId) === String(p._id) || b.mockPropertyRef === String(p._id)) && 
          b.paymentStatus === 'Paid'
        );
        if (offBooking) isBooked = true;
      }
      p.isBooked = isBooked;
    }

    return res.json({
      properties: propertiesList,
      currentPage: Number(page),
      totalPages: Math.ceil(totalProperties / Number(limit)),
      totalProperties
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    return res.status(500).json({ message: 'Server error. Failed to fetch properties.' });
  }
});

router.get('/featured', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.json(MOCK_PROPERTIES.slice(0, 3));
    }

    const properties = await Property.find({ status: 'Approved' })
      .sort({ createdAt: -1 })
      .limit(6);
    return res.json(properties);
  } catch (error) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

router.get('/owner', verifyToken, verifyRole(['Owner', 'Tenant']), async (req, res) => {
  try {
    const properties = await Property.find({ ownerEmail: req.user.email }).sort({ createdAt: -1 });
    return res.json(properties);
  } catch (error) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

router.get('/admin', verifyToken, verifyRole(['Admin']), async (req, res) => {
  try {
    const properties = await Property.find().sort({ createdAt: -1 });
    return res.json(properties);
  } catch (error) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

router.get('/admin/pending', verifyToken, verifyRole(['Admin']), async (req, res) => {
  try {
    const properties = await Property.find({ status: 'Pending' }).sort({ createdAt: -1 });
    return res.json(properties);
  } catch (error) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

router.put('/admin/verify/:id', verifyToken, verifyRole(['Admin']), async (req, res) => {
  const { status, rejectionFeedback } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value.' });
  }
  if (status === 'Rejected' && !rejectionFeedback) {
    return res.status(400).json({ message: 'Rejection feedback is required when rejecting.' });
  }

  const mongoose = require('mongoose');

  // Mock property IDs (p1, p2, p3 etc.) — not real DB entries, just return success
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.json({ message: `Property ${status.toLowerCase()} successfully!`, mock: true });
  }

  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found.' });
    property.status = status;
    property.rejectionFeedback = status === 'Rejected' ? rejectionFeedback : '';
    await property.save();
    return res.json({ message: `Property ${status.toLowerCase()} successfully!`, property });
  } catch (error) {
    console.error('Property verify error:', error.message);
    return res.status(500).json({ message: 'Server error.' });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const Booking = require('../models/Booking');
    let property = null;

    if (mongoose.connection.readyState !== 1) {
      const found = MOCK_PROPERTIES.find(p => p._id === req.params.id);
      if (found) property = { ...found };
    } else {
      const found = await Property.findById(req.params.id);
      if (found) property = found.toObject();
    }

    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    // Dynamic isBooked check
    let isBooked = false;
    if (mongoose.connection.readyState === 1) {
      const activeBooking = await Booking.findOne({ propertyId: req.params.id, paymentStatus: 'Paid' });
      if (activeBooking) isBooked = true;
    }
    if (!isBooked && global.offlineBookings) {
      const offBooking = global.offlineBookings.find(b => 
        (String(b.propertyId) === String(req.params.id) || b.mockPropertyRef === String(req.params.id)) && 
        b.paymentStatus === 'Paid'
      );
      if (offBooking) isBooked = true;
    }

    property.isBooked = isBooked;
    return res.json(property);
  } catch (error) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

router.put('/:id', verifyToken, verifyRole(['Owner', 'Admin', 'Tenant']), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    if (req.user.role !== 'Admin' && property.ownerEmail !== req.user.email) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    const updates = req.body;
    
    if (req.user.role !== 'Admin') {
      updates.status = 'Pending';
      updates.rejectionFeedback = '';
    }

    const updatedProperty = await Property.findByIdAndUpdate(req.params.id, updates, { new: true });
    return res.json({ message: 'Property updated successfully!', property: updatedProperty });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

router.delete('/:id', verifyToken, verifyRole(['Owner', 'Admin', 'Tenant']), async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    if (req.user.role !== 'Admin' && property.ownerEmail !== req.user.email) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    await Property.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Property deleted successfully!' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

router.patch('/:id/status', verifyToken, verifyRole(['Admin']), async (req, res) => {
  const { status, rejectionFeedback } = req.body;

  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status update value.' });
  }

  if (status === 'Rejected' && !rejectionFeedback) {
    return res.status(400).json({ message: 'Rejection feedback is required.' });
  }

  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }

    property.status = status;
    property.rejectionFeedback = status === 'Rejected' ? rejectionFeedback : '';

    await property.save();
    return res.json({ message: `Property status updated to ${status}!`, property });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
