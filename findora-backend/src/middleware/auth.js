// src/middleware/auth.js
// Authentication & Authorization middleware

const store = require('../config/demoStore');
const firebaseConfig = require('../config/firebase');

// Demo auth tokens map (in demo mode, tokens are user IDs prefixed with 'demo-token-')
const DEMO_TOKEN_PREFIX = 'demo-token-';

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Always allow demo tokens (even in production, useful for admin testing)
    if (token.startsWith(DEMO_TOKEN_PREFIX)) {
      const uid = token.replace(DEMO_TOKEN_PREFIX, '');
      const user = store.getUser(uid);
      if (!user) return res.status(401).json({ error: 'Invalid demo token' });
      req.user = user;
      return next();
    }

    // Demo mode — no real Firebase tokens accepted
    if (firebaseConfig.isDemoMode) {
      return res.status(401).json({ error: 'Invalid demo token' });
    }

    // Production — verify real Firebase ID token
    const { auth } = firebaseConfig;
    if (!auth) {
      return res.status(503).json({ error: 'Auth service unavailable' });
    }

    const decoded = await auth.verifyIdToken(token);

    // Get or auto-create user in local store
    let user = store.getUser(decoded.uid);
    if (!user) {
      user = store.createUser({
        uid: decoded.uid,
        email: decoded.email,
        displayName: decoded.name || decoded.email?.split('@')[0] || 'User',
        role: 'user',
        rewardPoints: 0,
        badges: ['newcomer'],
        createdAt: new Date().toISOString(),
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token', details: err.message });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
    }
    next();
  };
}

function requireSelf(paramKey = 'uid') {
  return (req, res, next) => {
    const targetUid = req.params[paramKey] || req.body[paramKey];
    if (req.user.uid !== targetUid && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied. Can only access own resources.' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole, requireSelf, DEMO_TOKEN_PREFIX };
