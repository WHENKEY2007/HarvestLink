const CropListing = require('../models/CropListing');

const getListings = async (req, res, next) => {
  try {
    const { search, category, status } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { cropName: { $regex: search, $options: 'i' } },
        { variety: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { farmerName: { $regex: search, $options: 'i' } }
      ];
    }

    const listings = await CropListing.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: listings.length,
      data: listings
    });
  } catch (error) {
    next(error);
  }
};

const getMyListings = async (req, res, next) => {
  try {
    const farmerId = req.user.firebaseUid;
    const listings = await CropListing.find({ farmerId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: listings.length,
      data: listings
    });
  } catch (error) {
    next(error);
  }
};

const getListingById = async (req, res, next) => {
  try {
    const listing = await CropListing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Crop listing not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: listing
    });
  } catch (error) {
    next(error);
  }
};

const createListing = async (req, res, next) => {
  try {
    const { cropName, category, variety, quantity, unit, price, location, harvestDate, description } = req.body;

    // Validation
    if (!cropName || cropName.trim() === '') {
      return res.status(400).json({ success: false, error: 'Crop name is required' });
    }
    if (!category || category.trim() === '') {
      return res.status(400).json({ success: false, error: 'Category is required' });
    }
    if (quantity === undefined || quantity <= 0) {
      return res.status(400).json({ success: false, error: 'Quantity must be greater than 0' });
    }
    if (price === undefined || price <= 0) {
      return res.status(400).json({ success: false, error: 'Price must be greater than 0' });
    }
    if (!location || location.trim() === '') {
      return res.status(400).json({ success: false, error: 'Location is required' });
    }
    if (!harvestDate) {
      return res.status(400).json({ success: false, error: 'Harvest date is required' });
    }

    const listing = await CropListing.create({
      farmerId: req.user.firebaseUid,
      farmerName: req.user.name || 'Ramesh Patel',
      farmerEmail: req.user.email || '',
      cropName: cropName.trim(),
      category: category.trim(),
      variety: variety ? variety.trim() : 'Standard',
      quantity: Number(quantity),
      unit: unit ? unit.trim() : 'kg',
      price: Number(price),
      location: location.trim(),
      harvestDate,
      description: description ? description.trim() : '',
      status: 'Available'
    });

    return res.status(201).json({
      success: true,
      message: 'Crop listing created successfully',
      data: listing
    });
  } catch (error) {
    next(error);
  }
};

const updateListing = async (req, res, next) => {
  try {
    const listing = await CropListing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, error: 'Crop listing not found' });
    }

    // Ownership check
    if (listing.farmerId !== req.user.firebaseUid) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only edit your own crop listings'
      });
    }

    const { cropName, category, variety, quantity, unit, price, location, harvestDate, description, status } = req.body;

    if (cropName !== undefined && cropName.trim() === '') {
      return res.status(400).json({ success: false, error: 'Crop name cannot be empty' });
    }
    if (quantity !== undefined && quantity <= 0) {
      return res.status(400).json({ success: false, error: 'Quantity must be greater than 0' });
    }
    if (price !== undefined && price <= 0) {
      return res.status(400).json({ success: false, error: 'Price must be greater than 0' });
    }

    if (cropName) listing.cropName = cropName.trim();
    if (category) listing.category = category.trim();
    if (variety !== undefined) listing.variety = variety.trim();
    if (quantity !== undefined) listing.quantity = Number(quantity);
    if (unit) listing.unit = unit.trim();
    if (price !== undefined) listing.price = Number(price);
    if (location) listing.location = location.trim();
    if (harvestDate) listing.harvestDate = harvestDate;
    if (description !== undefined) listing.description = description.trim();
    if (status && ['Available', 'Reserved', 'Sold'].includes(status)) listing.status = status;

    await listing.save();

    return res.status(200).json({
      success: true,
      message: 'Crop listing updated successfully',
      data: listing
    });
  } catch (error) {
    next(error);
  }
};

const deleteListing = async (req, res, next) => {
  try {
    const listing = await CropListing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, error: 'Crop listing not found' });
    }

    // Ownership check
    if (listing.farmerId !== req.user.firebaseUid) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only delete your own crop listings'
      });
    }

    await CropListing.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Crop listing deleted successfully',
      id: req.params.id
    });
  } catch (error) {
    next(error);
  }
};

const updateListingStatus = async (req, res, next) => {
  try {
    const listing = await CropListing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, error: 'Crop listing not found' });
    }

    // Ownership check
    if (listing.farmerId !== req.user.firebaseUid) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You can only update status for your own crop listings'
      });
    }

    const { status } = req.body;
    if (!status || !['Available', 'Reserved', 'Sold'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be Available, Reserved, or Sold'
      });
    }

    listing.status = status;
    await listing.save();

    return res.status(200).json({
      success: true,
      message: `Crop status updated to ${status}`,
      data: listing
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getListings,
  getMyListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  updateListingStatus
};
