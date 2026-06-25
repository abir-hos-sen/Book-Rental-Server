const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  propertyName: {
    type: String,
    required: true
  },
  propertyImage: {
    type: String
  },
  ownerEmail: {
    type: String,
    required: true
  },
  tenantEmail: {
    type: String,
    required: true
  },
  tenantName: {
    type: String,
    required: true
  },
  tenantPhone: {
    type: String,
    required: true
  },
  moveInDate: {
    type: Date,
    required: true
  },
  additionalNotes: {
    type: String
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Unpaid'],
    default: 'Unpaid'
  },
  transactionId: {
    type: String
  },
  paidAt: {
    type: Date
  },
  invoiceSentAt: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);
