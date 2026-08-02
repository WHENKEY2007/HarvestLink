const Profile = require('../models/Profile');
const User = require('../models/User');

const getProfile = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    
    let profile = await Profile.findOne({ firebaseUid });
    if (!profile) {
      profile = await Profile.create({
        firebaseUid,
        farmer: {
          name: req.user.name || 'Ramesh Patel',
          email: req.user.email || 'ramesh.patel@greenvalley.com',
          location: 'Nashik, Maharashtra',
          phone: '+91 98765 43210',
          farmName: 'Green Valley Farm',
          farmSize: '12 Acres',
          mainCrops: 'Wheat, Tomatoes, Onion'
        },
        buyer: {
          name: req.user.name || 'Sourcing Officer',
          email: req.user.email || 'sourcing@bigbasket.in',
          location: 'Mumbai, Maharashtra',
          phone: '+91 98877 66554',
          companyName: 'BigBasket Procurement',
          businessType: 'Retail & Wholesale',
          preferredCrops: 'Fruits, Vegetables, Grains'
        }
      });
    }

    const user = req.user.dbUser;

    return res.status(200).json({
      success: true,
      data: {
        activeRole: user.activeRole || 'Farmer',
        farmer: profile.farmer,
        buyer: profile.buyer
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { activeRole, farmer, buyer } = req.body;

    // Update activeRole on User if provided
    if (activeRole && ['Farmer', 'Buyer'].includes(activeRole)) {
      await User.findOneAndUpdate({ firebaseUid }, { activeRole });
    }

    let profile = await Profile.findOne({ firebaseUid });
    if (!profile) {
      profile = new Profile({ firebaseUid });
    }

    if (farmer) {
      profile.farmer = { ...profile.farmer, ...farmer };
    }
    if (buyer) {
      profile.buyer = { ...profile.buyer, ...buyer };
    }

    await profile.save();

    const updatedUser = await User.findOne({ firebaseUid });

    return res.status(200).json({
      success: true,
      data: {
        activeRole: updatedUser.activeRole,
        farmer: profile.farmer,
        buyer: profile.buyer
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, updateProfile };
