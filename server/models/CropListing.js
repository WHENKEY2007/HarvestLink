const mongoose = require('mongoose');

const CropListingSchema = new mongoose.Schema(
  {
    farmerId: {
      type: String,
      required: true,
      index: true
    },
    farmerName: {
      type: String,
      required: true,
      default: 'Farmer'
    },
    farmerEmail: {
      type: String,
      default: ''
    },
    cropName: {
      type: String,
      required: [true, 'Crop name is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true
    },
    variety: {
      type: String,
      default: 'Standard',
      trim: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.01, 'Quantity must be greater than 0']
    },
    unit: {
      type: String,
      default: 'kg',
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0.01, 'Price must be greater than 0']
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true
    },
    harvestDate: {
      type: String,
      required: [true, 'Harvest date is required']
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: ['Available', 'Reserved', 'Sold'],
      default: 'Available',
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Virtual id property for frontend compatibility
CropListingSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('CropListing', CropListingSchema);
