const mongoose = require('mongoose');

const FavoriteSchema = new mongoose.Schema({
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  tenantEmail: {
    type: String,
    required: true
  }
}, { timestamps: true });

// Prevent duplicate favorites
FavoriteSchema.index({ propertyId: 1, tenantEmail: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', FavoriteSchema);
