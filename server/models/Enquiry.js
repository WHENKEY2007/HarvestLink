const mongoose = require('mongoose');

const EnquirySchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CropListing',
      required: true,
      index: true
    },
    farmerId: {
      type: String,
      required: true,
      index: true
    },
    farmerName: {
      type: String,
      default: 'Farmer'
    },
    farmerEmail: {
      type: String,
      default: ''
    },
    buyerId: {
      type: String,
      required: true,
      index: true
    },
    buyerName: {
      type: String,
      required: true
    },
    buyerEmail: {
      type: String,
      default: ''
    },
    buyerCompany: {
      type: String,
      default: ''
    },
    buyerPhone: {
      type: String,
      default: ''
    },
    cropName: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity requested is required'],
      min: [0.01, 'Quantity must be greater than 0']
    },
    offeredPrice: {
      type: Number,
      required: [true, 'Offered price is required'],
      min: [0.01, 'Offered price must be greater than 0']
    },
    message: {
      type: String,
      default: ''
    },
    paymentMethod: {
      type: String,
      default: 'Bank Transfer'
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected', 'Countered'],
      default: 'Pending',
      index: true
    },
    counterOffer: {
      offeredPrice: { type: Number },
      message: { type: String, default: '' },
      createdAt: { type: Date }
    }
  },
  {
    timestamps: true
  }
);

// Virtual id property for frontend compatibility
EnquirySchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    if (ret.listingId && ret.listingId._id) {
      ret.listingId = ret.listingId._id.toString();
    }
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Enquiry', EnquirySchema);
