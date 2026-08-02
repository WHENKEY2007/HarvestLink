const { admin, isFirebaseInitialized } = require('../config/firebase');
const User = require('../models/User');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: No Bearer token provided'
      });
    }

    const token = authHeader.split('Bearer ')[1].trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Empty token'
      });
    }

    let decodedToken = null;

    if (isFirebaseInitialized()) {
      try {
        decodedToken = await admin.auth().verifyIdToken(token);
      } catch (err) {
        console.error('[Auth Middleware] Firebase Admin verification error:', err.message);
        return res.status(401).json({
          success: false,
          error: `Unauthorized: Invalid token (${err.message})`
        });
      }
    } else {
      // Dev mode fallback when FIREBASE_SERVICE_ACCOUNT is not configured
      // Parse unverified JWT payload for development purposes
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          decodedToken = {
            uid: payload.user_id || payload.sub || payload.uid || 'demo-user-123',
            name: payload.name || 'Demo User',
            email: payload.email || 'user@harvestlink.com',
            picture: payload.picture || ''
          };
        } else {
          decodedToken = {
            uid: 'demo-user-123',
            name: 'Demo User',
            email: 'user@harvestlink.com'
          };
        }
      } catch (e) {
        decodedToken = {
          uid: 'demo-user-123',
          name: 'Demo User',
          email: 'user@harvestlink.com'
        };
      }
    }

    if (!decodedToken || !decodedToken.uid) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Could not extract valid user identification from token'
      });
    }

    // Find or create User in MongoDB
    let dbUser = await User.findOne({ firebaseUid: decodedToken.uid });
    if (!dbUser) {
      dbUser = await User.create({
        firebaseUid: decodedToken.uid,
        name: decodedToken.name || 'HarvestLink User',
        email: decodedToken.email || `${decodedToken.uid}@harvestlink.com`,
        photoURL: decodedToken.picture || '',
        activeRole: 'Farmer'
      });
    }

    req.user = {
      firebaseUid: decodedToken.uid,
      dbUser,
      email: dbUser.email,
      name: dbUser.name,
      activeRole: dbUser.activeRole
    };

    next();
  } catch (error) {
    console.error('[Auth Middleware Exception]', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed due to an internal server error'
    });
  }
};

module.exports = { verifyToken };
