const Enquiry = require('../models/Enquiry');
const CropListing = require('../models/CropListing');

const getSentEnquiries = async (req, res, next) => {
  try {
    const buyerId = req.user.firebaseUid;
    const enquiries = await Enquiry.find({ buyerId }).populate('listingId').sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: enquiries.length,
      data: enquiries
    });
  } catch (error) {
    next(error);
  }
};

const getReceivedEnquiries = async (req, res, next) => {
  try {
    const farmerId = req.user.firebaseUid;
    const enquiries = await Enquiry.find({ farmerId }).populate('listingId').sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: enquiries.length,
      data: enquiries
    });
  } catch (error) {
    next(error);
  }
};

const createEnquiry = async (req, res, next) => {
  try {
    const { listingId, quantity, offeredPrice, message, paymentMethod, buyerCompany, buyerPhone } = req.body;

    if (!listingId) {
      return res.status(400).json({ success: false, error: 'Listing ID is required' });
    }
    if (quantity === undefined || quantity <= 0) {
      return res.status(400).json({ success: false, error: 'Quantity must be greater than 0' });
    }
    if (offeredPrice === undefined || offeredPrice <= 0) {
      return res.status(400).json({ success: false, error: 'Offered price must be greater than 0' });
    }

    const listing = await CropListing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ success: false, error: 'Target crop listing not found' });
    }

    const enquiry = await Enquiry.create({
      listingId: listing._id,
      farmerId: listing.farmerId,
      farmerName: listing.farmerName,
      farmerEmail: listing.farmerEmail,
      buyerId: req.user.firebaseUid,
      buyerName: req.user.name || 'Buyer',
      buyerEmail: req.user.email || '',
      buyerCompany: buyerCompany || 'BigBasket Procurement',
      buyerPhone: buyerPhone || '+91 98877 66554',
      cropName: listing.cropName,
      quantity: Number(quantity),
      offeredPrice: Number(offeredPrice),
      message: message ? message.trim() : '',
      paymentMethod: paymentMethod || 'Bank Transfer',
      status: 'Pending'
    });

    return res.status(201).json({
      success: true,
      message: 'Enquiry sent successfully to farmer',
      data: enquiry
    });
  } catch (error) {
    next(error);
  }
};

const updateEnquiryStatus = async (req, res, next) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ success: false, error: 'Enquiry not found' });
    }

    // Ownership check: Farmer receiving enquiry
    if (enquiry.farmerId !== req.user.firebaseUid) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only respond to enquiries sent for your listings'
      });
    }

    const { status } = req.body;
    if (!status || !['Accepted', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be Accepted, Rejected, or Pending'
      });
    }

    enquiry.status = status;
    await enquiry.save();

    // If accepted, option to reserve listing
    if (status === 'Accepted') {
      await CropListing.findByIdAndUpdate(enquiry.listingId, { status: 'Reserved' });
    }

    return res.status(200).json({
      success: true,
      message: `Enquiry ${status.toLowerCase()} successfully`,
      data: enquiry
    });
  } catch (error) {
    next(error);
  }
};

const counterEnquiry = async (req, res, next) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ success: false, error: 'Enquiry not found' });
    }

    // Ownership check: Farmer receiving enquiry
    if (enquiry.farmerId !== req.user.firebaseUid) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only counter offer enquiries sent for your listings'
      });
    }

    const { offeredPrice, message } = req.body;
    if (offeredPrice === undefined || offeredPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Counter offered price must be greater than 0'
      });
    }

    enquiry.status = 'Countered';
    enquiry.counterOffer = {
      offeredPrice: Number(offeredPrice),
      message: message ? message.trim() : '',
      createdAt: new Date()
    };

    await enquiry.save();

    return res.status(200).json({
      success: true,
      message: 'Counter offer submitted successfully',
      data: enquiry
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSentEnquiries,
  getReceivedEnquiries,
  createEnquiry,
  updateEnquiryStatus,
  counterEnquiry
};
