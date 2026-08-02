const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    photoURL: {
      type: String,
      default: ''
    },
    activeRole: {
      type: String,
      enum: ['Farmer', 'Buyer'],
      default: 'Farmer'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', UserSchema);
