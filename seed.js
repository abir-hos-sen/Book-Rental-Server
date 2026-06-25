const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Property = require('./models/Property');
const Review = require('./models/Review');
const Booking = require('./models/Booking');
const Favorite = require('./models/Favorite');

const seed = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/booking-platform';
  console.log('Connecting to MongoDB for seeding...');
  await mongoose.connect(mongoURI);
  console.log('Connected.');

  // Clear existing collections
  await User.deleteMany({});
  await Property.deleteMany({});
  await Review.deleteMany({});
  await Booking.deleteMany({});
  await Favorite.deleteMany({});
  console.log('Cleared existing data.');

  // Seed Users
  const salt = await bcrypt.genSalt(10);
  const passwordAdmin = await bcrypt.hash('admin123', salt);
  const passwordOwner = await bcrypt.hash('owner123', salt);
  const passwordTenant = await bcrypt.hash('tenant123', salt);

  const admin = new User({
    name: 'Sarah Jenkins',
    email: 'admin@rental.com',
    password: passwordAdmin,
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
    role: 'Admin'
  });

  const owner = new User({
    name: 'Robert Davis',
    email: 'owner@rental.com',
    password: passwordOwner,
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    role: 'Owner'
  });

  const tenant = new User({
    name: 'Alex Mercer',
    email: 'tenant@rental.com',
    password: passwordTenant,
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
    role: 'Tenant'
  });

  await admin.save();
  await owner.save();
  await tenant.save();
  console.log('Users seeded.');

  // Seed Properties (Approved status)
  const properties = [
    {
      title: 'Luxury Penthouse with Skyline Views',
      description: 'Stunning luxury penthouse in the heart of downtown. Features floor-to-ceiling windows, modern kitchen appliances, private terrace, and 24/7 concierge services. Ideal for urban professionals seeking an upscale lifestyle.',
      location: 'Dhaka, Dhaka Division',
      propertyType: 'Apartment',
      rent: 4200,
      rentType: 'Monthly',
      bedrooms: 3,
      bathrooms: 2.5,
      propertySize: 1850,
      amenities: ['Private Terrace', 'Gym', 'Concierge', 'High-Speed Wi-Fi', 'Smart TV', 'Air Conditioning'],
      images: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=600'
      ],
      extraFeatures: ['Walk-in Closets', 'Wine Cooler', 'Heated Floors'],
      status: 'Approved',
      ownerEmail: 'owner@rental.com',
      ownerName: 'Robert Davis'
    },
    {
      title: 'Modern Minimalist Villa with Infinity Pool',
      description: 'Escape to this architectural masterpiece. Nestled in the hills, this villa offers absolute privacy, a magnificent infinity pool overlooking the ocean, open-plan living, and state-of-the-art automation systems.',
      location: 'Chattogram, Chattogram Division',
      propertyType: 'Villa',
      rent: 8500,
      rentType: 'Monthly',
      bedrooms: 4,
      bathrooms: 4,
      propertySize: 3200,
      amenities: ['Infinity Pool', 'Home Theater', 'Garage', 'Garden', 'Security System', 'Solar Power'],
      images: [
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&q=80&w=600'
      ],
      extraFeatures: ['Ocean Front', 'Private Chef Available', 'Smart Home System'],
      status: 'Approved',
      ownerEmail: 'owner@rental.com',
      ownerName: 'Robert Davis'
    },
    {
      title: 'Cozy Alpine Cabin near Ski Slopes',
      description: 'A charming wooden cabin perfect for winter getaways or summer hiking trips. Enjoy a warm fireplace, outdoor hot tub, rustic design elements, and easy ski-in/ski-out access to the main resort routes.',
      location: 'Sylhet, Sylhet Division',
      propertyType: 'Cabin',
      rent: 350,
      rentType: 'Daily',
      bedrooms: 2,
      bathrooms: 1.5,
      propertySize: 1100,
      amenities: ['Hot Tub', 'Fireplace', 'Ski Access', 'Pet Friendly', 'Fire Pit', 'Barbecue Grill'],
      images: [
        'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&q=80&w=600'
      ],
      extraFeatures: ['Mountain Views', 'Firewood Provided', 'Heated Mudroom'],
      status: 'Approved',
      ownerEmail: 'owner@rental.com',
      ownerName: 'Robert Davis'
    },
    {
      title: 'Mid-Century Modern Suburban House',
      description: 'Beautifully restored mid-century modern home. Offers a spacious green backyard, newly renovated kitchen, high-beamed ceilings, and is located in a quiet family-friendly neighborhood with top-rated schools.',
      location: 'Rajshahi, Rajshahi Division',
      propertyType: 'House',
      rent: 3600,
      rentType: 'Monthly',
      bedrooms: 3,
      bathrooms: 2,
      propertySize: 1650,
      amenities: ['Backyard', 'Garage', 'Playground Near', 'Laundry Room', 'Office Space', 'Dishwasher'],
      images: [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=600'
      ],
      extraFeatures: ['Renovated Kitchen', 'Fruit Trees', 'Attic Storage'],
      status: 'Approved',
      ownerEmail: 'owner@rental.com',
      ownerName: 'Robert Davis'
    },
    {
      title: 'Sleek Waterfront Studio Apartment',
      description: 'Chic waterfront studio apartment with breathtaking harbor views. Includes floor heating, stylish minimalist furniture, rooftop terrace access, and secure building access. Close to public transit.',
      location: 'Khulna, Khulna Division',
      propertyType: 'Apartment',
      rent: 2100,
      rentType: 'Monthly',
      bedrooms: 1,
      bathrooms: 1,
      propertySize: 650,
      amenities: ['Waterfront View', 'Rooftop Terrace', 'Elevator', 'Air Conditioning', 'Laundry Access', 'Internet'],
      images: [
        'https://images.unsplash.com/photo-1502672090847-032d766ef4b3?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=600'
      ],
      extraFeatures: ['Water Access', 'Rooftop BBQ', 'Bike Storage'],
      status: 'Approved',
      ownerEmail: 'owner@rental.com',
      ownerName: 'Robert Davis'
    },
    {
      title: 'Elegant Historic Townhouse',
      description: 'Exquisite historic townhouse featuring original brick walls, multiple fireplaces, library space, and a private courtyard. Lovingly maintained and situated in a cultural heritage district near boutiques.',
      location: 'Barishal, Barishal Division',
      propertyType: 'House',
      rent: 4800,
      rentType: 'Monthly',
      bedrooms: 4,
      bathrooms: 3.5,
      propertySize: 2200,
      amenities: ['Private Courtyard', 'Fireplaces', 'Library', 'Basement', 'Hardwood Floors', 'Parking Spot'],
      images: [
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&q=80&w=600'
      ],
      extraFeatures: ['Historic Plaque', 'Exposed Brick', 'Skylights'],
      status: 'Approved',
      ownerEmail: 'owner@rental.com',
      ownerName: 'Robert Davis'
    }
  ];

  const savedProperties = [];
  for (const propData of properties) {
    const p = new Property(propData);
    const saved = await p.save();
    savedProperties.push(saved);
  }
  console.log('Properties seeded.');

  // Seed Reviews (at least 4 good reviews)
  const reviews = [
    {
      propertyId: savedProperties[0]._id,
      tenantName: 'Emma Watson',
      tenantEmail: 'emma@tenant.com',
      tenantPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
      rating: 5,
      comment: 'Absolutely breathtaking! The penthouse views are even better in person. The booking and key transfer process was seamless, and Robert was a wonderful owner to deal with. Worth every single penny!'
    },
    {
      propertyId: savedProperties[1]._id,
      tenantName: 'Michael Chang',
      tenantEmail: 'michael@tenant.com',
      tenantPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
      rating: 5,
      comment: 'Stunning villa. The infinity pool and outdoor terrace are perfect for relaxing. High-tech home amenities, extremely clean, and a stellar location. We will definitely book this place again.'
    },
    {
      propertyId: savedProperties[2]._id,
      tenantName: 'Jessica Taylor',
      tenantEmail: 'jessica@tenant.com',
      tenantPhoto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150',
      rating: 4,
      comment: 'Super cozy cabin near the ski runs. The hot tub under the stars was the highlight of our trip. Perfect sizing for our small family, with very rustic and warm finishes.'
    },
    {
      propertyId: savedProperties[4]._id,
      tenantName: 'David Miller',
      tenantEmail: 'david@tenant.com',
      tenantPhoto: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150',
      rating: 5,
      comment: 'Perfect waterfront studio! Waking up to the view was pure bliss. Clean layout, excellent smart amenities, and close to everything in Khulna. Strongly recommend!'
    }
  ];

  for (const revData of reviews) {
    const r = new Review(revData);
    await r.save();
  }
  console.log('Reviews seeded.');

  console.log('Disconnecting database...');
  await mongoose.disconnect();
  console.log('Seeding finished successfully.');
};

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
