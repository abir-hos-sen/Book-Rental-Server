const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId;
    }
  },
  photo: {
    type: String,
    default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'
  },
  role: {
    type: String,
    enum: ['User', 'Tenant', 'Owner', 'Admin'],
    default: 'Tenant'
  },
  googleId: {
    type: String
  },
  otpCode: {
    type: String
  },
  otpExpires: {
    type: Date
  }
}, { timestamps: true });

UserSchema.pre('validate', function(next) {
  if (this.role) {
    const roleMap = {
      'user': 'User',
      'tenant': 'Tenant',
      'owner': 'Owner',
      'admin': 'Admin'
    };
    const lowercaseRole = this.role.toLowerCase();
    if (roleMap[lowercaseRole]) {
      this.role = roleMap[lowercaseRole];
    }
  }
  next();
});

module.exports = mongoose.model('User', UserSchema);
