const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    farmer: {
      name: { type: String, default: '' },
      location: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      farmName: { type: String, default: '' },
      farmSize: { type: String, default: '' },
      mainCrops: { type: String, default: '' }
    },
    buyer: {
      name: { type: String, default: '' },
      location: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      companyName: { type: String, default: '' },
      businessType: { type: String, default: '' },
      preferredCrops: { type: String, default: '' }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Profile', ProfileSchema);
