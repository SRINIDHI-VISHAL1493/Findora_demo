// src/routes/demo.js — Demo reset endpoint (dev/demo mode only)
const express = require('express');
const router = express.Router();
const store = require('../config/demoStore');

// POST /api/demo/reset
// Wipes all locker sessions, resets lockers to AVAILABLE, resets match-001 to pending
router.post('/reset', (req, res) => {
  // Clear every locker session
  Object.keys(store.lockerSessions).forEach(k => delete store.lockerSessions[k]);

  // Reset every locker back to AVAILABLE (keep OFFLINE lockers offline)
  Object.values(store.lockers).forEach(locker => {
    if (locker.state !== 'OFFLINE') {
      store.lockers[locker.id].state = 'AVAILABLE';
      store.lockers[locker.id].sessionId = null;
    }
  });

  // Reset all matches back to pending so they can be reused
  Object.values(store.matches).forEach(match => {
    store.matches[match.id].status = 'pending';
    delete store.matches[match.id].completedAt;
  });

  // Reset matching reports back to active
  Object.values(store.reports).forEach(report => {
    if (report.status === 'collected' || report.status === 'matched') {
      store.reports[report.id].status = 'active';
    }
  });

  console.log('🔄 Demo state reset — all sessions cleared, lockers available');
  res.json({ ok: true, message: 'Demo reset. All lockers available, matches reset to pending.' });
});

module.exports = router;
