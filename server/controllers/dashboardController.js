const CropListing = require('../models/CropListing');
const Enquiry = require('../models/Enquiry');

const getDashboardData = async (req, res, next) => {
  try {
    const uid = req.user.firebaseUid;
    const role = req.user.activeRole || 'Farmer';

    if (role === 'Farmer') {
      const myListings = await CropListing.find({ farmerId: uid }).sort({ createdAt: -1 });
      const myEnquiries = await Enquiry.find({ farmerId: uid }).sort({ createdAt: -1 });

      const activeListings = myListings.filter(l => l.status === 'Available' || l.status === 'Reserved');
      const pendingEnquiries = myEnquiries.filter(e => e.status === 'Pending');

      const totalSalesValue = myListings.reduce((sum, l) => sum + (l.price * l.quantity), 0);
      const activeInventory = activeListings.reduce((sum, l) => sum + l.quantity, 0);

      const recentActivity = [
        ...myListings.slice(0, 3).map(l => ({
          type: 'listing',
          text: `Listed ${l.cropName} (${l.quantity} ${l.unit}) at Rs. ${l.price}/${l.unit}`,
          date: l.createdAt
        })),
        ...myEnquiries.slice(0, 3).map(e => ({
          type: 'enquiry',
          text: `Received offer from ${e.buyerName} for ${e.cropName} at Rs. ${e.offeredPrice}/kg`,
          date: e.createdAt
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

      return res.status(200).json({
        success: true,
        role: 'Farmer',
        metrics: {
          activeListingsCount: activeListings.length,
          pendingEnquiriesCount: pendingEnquiries.length,
          salesValueEst: totalSalesValue,
          activeInventory: activeInventory
        },
        recentActivity
      });
    } else {
      // Buyer Dashboard
      const availableListings = await CropListing.find({ status: 'Available' }).sort({ createdAt: -1 });
      const mySentEnquiries = await Enquiry.find({ buyerId: uid }).sort({ createdAt: -1 });

      const pendingOffers = mySentEnquiries.filter(e => e.status === 'Pending');
      const acceptedEnquiries = mySentEnquiries.filter(e => e.status === 'Accepted');

      const acceptedValue = acceptedEnquiries.reduce((sum, e) => sum + (e.offeredPrice * e.quantity), 0);
      const activePurchaseQty = mySentEnquiries.reduce((sum, e) => sum + e.quantity, 0);

      const recentActivity = mySentEnquiries.slice(0, 5).map(e => ({
        type: 'enquiry',
        text: `Sent enquiry for ${e.cropName} (${e.quantity} kg) - Status: ${e.status}`,
        date: e.createdAt
      }));

      return res.status(200).json({
        success: true,
        role: 'Buyer',
        metrics: {
          availableCropsCount: availableListings.length,
          pendingOffersCount: pendingOffers.length,
          acceptedPurchaseValue: acceptedValue,
          activePurchaseQuantity: activePurchaseQty
        },
        recentActivity
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardData };
