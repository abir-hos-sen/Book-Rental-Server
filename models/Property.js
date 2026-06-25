const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  propertyType: {
    type: String,
    required: true
  },
  rent: {
    type: Number,
    required: true
  },
  rentType: {
    type: String,
    enum: ['Daily', 'Weekly', 'Monthly'],
    default: 'Monthly'
  },
  bedrooms: {
    type: Number,
    required: true
  },
  bathrooms: {
    type: Number,
    required: true
  },
  propertySize: {
    type: Number, // In square feet
    required: true
  },
  amenities: {
    type: [String],
    default: []
  },
  images: {
    type: [String],
    default: []
  },
  extraFeatures: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  rejectionFeedback: {
    type: String,
    default: ''
  },
  ownerEmail: {
    type: String,
    required: true
  },
  ownerName: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Property', PropertySchema);
