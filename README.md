# 🔍 Findora — AI-Powered Smart Lost & Found Ecosystem

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-5-000000.svg)](https://expressjs.com/)
[![ESP32](https://img.shields.io/badge/ESP32-PlatformIO-orange.svg)](https://platformio.org/)
[![Status](https://img.shields.io/badge/Status-Production_Ready-success.svg)]()

**Findora** is a full-stack lost and found platform with AI-powered item matching, ESP32 smart lockers, Telegram OTP delivery, fraud detection, gamification, and a comprehensive admin dashboard.

---

## 🌟 Features

### 🤖 AI Matching Engine
- **91% match accuracy** — TF-IDF text similarity, Jaccard keywords, Haversine geolocation, color families
- Auto-runs on every new report submission
- Confidence scoring with per-factor breakdown

### 🔐 Smart Locker System
- **Per-user OTP** — only the rightful claimer ever sees their code
- Full session lifecycle: Assign → Insert → Deposit → Generate OTP → Verify → Collect
- ESP32 firmware with 4×4 keypad + I2C LCD via PlatformIO
- Dual-port server: port 3001 (web app) + port 8000 (ESP32 HTTP)
- MQTT bridge for real-time locker state sync
- Software simulator for hardware-free testing

### 📱 Telegram OTP Bot
- Send `/otp` to **[@smartLostandFoundbot](https://t.me/smartLostandFoundbot)** to receive your locker code
- Auto-register new OTPs when sessions are created
- Native Node.js bot — no Python or extra process needed

### 🛡️ Fraud Detection
- 4 algorithms: duplicate reports, rapid submission, location anomaly, pattern analysis
- Risk score 0–100, auto-flags above 80
- Runs automatically on every report creation

### 🎮 Rewards & Gamification
- Points awarded per action (10–50 pts)
- 10 achievement badges (Finder, Hero, Legend…)
- Global leaderboard with rankings
- Milestones and transaction history

### 📊 Admin Dashboard
- Real-time analytics: trends, categories, geography, timing, brands
- Case management with bulk flag/archive/delete
- Fraud monitoring and manual scan
- User management with role control
- Full audit log

### 💬 Chat
- Per-match secure messaging between finder and owner
- Notifications for new messages

---

## 🏗️ Project Structure

```
FINDORA/
├── findora-backend/           # Node.js + Express 5 API
│   ├── src/
│   │   ├── config/
│   │   │   ├── demoStore.js   # In-memory store (demo mode)
│   │   │   └── firebase.js    # Firebase admin (production)
│   │   ├── middleware/
│   │   │   └── auth.js        # JWT + demo token auth, RBAC
│   │   ├── routes/
│   │   │   ├── auth.js        # Login, profile, Telegram link
│   │   │   ├── reports.js     # CRUD + AI match trigger
│   │   │   ├── matches.js     # Accept, reject, verify
│   │   │   ├── lockers.js     # Full session lifecycle + OTP
│   │   │   ├── chat.js        # Messaging
│   │   │   ├── notifications.js
│   │   │   ├── rewards.js     # Points, badges, leaderboard
│   │   │   ├── admin.js       # Dashboard, fraud, analytics
│   │   │   ├── iot.js         # MQTT-based ESP32 routes
│   │   │   ├── box.js         # Direct HTTP ESP32 endpoint (port 8000)
│   │   │   └── demo.js        # POST /api/demo/reset
│   │   └── services/
│   │       ├── aiMatcher.js   # TF-IDF, Jaccard, Haversine
│   │       ├── fraudDetection.js
│   │       ├── rewardsSystem.js
│   │       ├── analytics.js
│   │       ├── otpService.js  # Crypto OTP, rate limiting
│   │       ├── mqttBridge.js  # ESP32 ↔ backend MQTT
│   │       └── telegramService.js
│   ├── locker-simulator.js    # Software locker simulator
│   └── test-all-endpoints.js  # API test suite (19 tests)
│
├── findora-frontend/          # React 19 + Vite 8
│   └── src/
│       ├── components/ui/     # Button, Card, Input, Modal, Select…
│       ├── context/           # AuthContext
│       ├── lib/
│       │   ├── api.js         # Axios client for all endpoints
│       │   └── utils.js
│       └── pages/
│           ├── auth/          # LoginPage
│           ├── dashboard/     # Home, Reports, Matches, Lockers,
│           │                  # Chat, Rewards, Profile, LockerSession
│           └── admin/         # AdminDashboard, EnhancedDashboard,
│                              # CaseManagement
│
├── esp32-locker/              # PlatformIO firmware
│   ├── src/main.cpp           # Keypad + LCD + HTTP OTP verify
│   └── platformio.ini
│
└── telegram_otp_bot/          # Python bot (legacy — native bot preferred)
    ├── bot.py
    └── requirements.txt
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm

### 1. Clone
```bash
git clone https://github.com/SAICHARAN1189/FINDORA.git
cd FINDORA
```

### 2. Backend
```bash
cd findora-backend
npm install
cp .env.example .env      # demo mode works out of the box
npm start
```

Starts on **port 3001** (web API) and **port 8000** (ESP32 hardware endpoint).

### 3. Frontend
```bash
cd ../findora-frontend
npm install
npm run dev
```

Starts on **http://localhost:5173**.

### 4. Open the app
| Service | URL |
|---------|-----|
| Web App | http://localhost:5173 |
| API | http://localhost:3001 |
| Health | http://localhost:3001/api/health |
| ESP32 endpoint | http://localhost:8000/api/v1/box/verify-otp |

---

## 🔑 Demo Accounts

| Role | Login ID | Token |
|------|----------|-------|
| Alice — finder (inserts items) | `demo-user-1` | `demo-token-demo-user-1` |
| Bob — owner (collects with OTP) | `demo-user-2` | `demo-token-demo-user-2` |
| Admin | `demo-admin-1` | `demo-token-demo-admin-1` |
| Police | `demo-police-1` | `demo-token-demo-police-1` |

---

## 🔒 Locker Flow (step by step)

The locker system enforces strict per-user OTP privacy — no one sees another user's code.

```
1. Alice (finder) → Lockers → Insert Item → pick a match → locker reserved
2. Alice → View Full Session → "I've Deposited the Item" → state: ITEM_DEPOSITED
3. Bob (owner) → Lockers → Your Active Sessions → Generate OTP → 6-digit code appears
4. Bob → View Full Session → enter OTP → locker unlocks → item collected ✅
5. Anyone → click "Reset Demo" button to run the flow again
```

**Security rules enforced:**
- OTP is masked as `******` for everyone except the exact `claimedBy` user
- Only the finder (`depositedBy`) can mark an item as deposited
- Only the claimer (`claimedBy`) can generate or verify an OTP
- Rate limited: 5 wrong OTP attempts → 15-minute lockout

---

## 📡 API Reference

### Authentication
```
Authorization: Bearer <token>
```

### Core endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/demo-login` | Login with demo user ID |
| GET | `/api/reports` | List reports (paginated) |
| POST | `/api/reports` | Create report + auto AI match + fraud scan |
| GET | `/api/matches` | Get matches for current user |
| POST | `/api/matches/:id/accept` | Accept a match |
| GET | `/api/lockers` | All lockers (OTP masked per user) |
| POST | `/api/lockers/assign` | Assign locker to a match |
| POST | `/api/lockers/sessions/:id/deposit` | Confirm item deposited |
| POST | `/api/lockers/sessions/:id/resend-otp` | Generate / refresh OTP |
| POST | `/api/lockers/sessions/:id/verify-otp` | Verify OTP → unlock |
| GET | `/api/rewards/profile` | Points, badges, rank |
| GET | `/api/rewards/leaderboard` | Global leaderboard |
| POST | `/api/demo/reset` | Reset all sessions + lockers for re-testing |
| GET | `/api/admin/dashboard` | Full dashboard (admin only) |
| GET | `/api/admin/fraud/stats` | Fraud statistics (admin only) |
| POST | `/api/v1/box/verify-otp` | ESP32 hardware OTP check (no auth) |

---

## 🔧 ESP32 Hardware Setup

### Components
- ESP32 DevKit v1
- 4×4 matrix keypad
- I2C 16×2 LCD display
- 5V relay (door solenoid)

### Flash firmware
```bash
cd esp32-locker
pip install platformio
pio run --target upload
pio device monitor
```

Update `SERVER_IP` in `main.cpp` to your machine's local IP (shown at backend startup).

### Drivers
- Windows: use `CP210x_Universal_Windows_Driver.zip` (included)
- macOS/Linux: driver built-in

See [ESP32_SETUP.md](./ESP32_SETUP.md) for full wiring diagram and config.

---

## 🤖 Telegram Bot

The native Node.js Telegram bot starts automatically with the backend if `TELEGRAM_BOT_TOKEN` is set in `.env`.

```env
TELEGRAM_BOT_TOKEN=your_token_here
```

Commands:
- `/start` — register your Telegram account
- `/otp` — receive the current locker OTP
- `/status` — check locker state

Without a token the bot is silently disabled — everything else still works.

---

## 🧪 Testing

```bash
cd findora-backend
node test-all-endpoints.js
```

**19/19 tests pass** — covers auth, RBAC, reports, matches, lockers, OTP, rewards, admin, analytics, fraud detection.

---

## 🔒 Security

- JWT / demo-token authentication on all routes
- Role-based access control: `user`, `institution_admin`, `police`, `super_admin`
- Helmet security headers
- CORS locked to localhost origins (configurable via `FRONTEND_URL`)
- Global rate limiter: 500 req / 15 min
- Per-session OTP rate limit: 5 attempts then 15-min lockout
- Audit log on every sensitive action

---

## 🌍 Deployment

### Backend
Set in `.env`:
```env
NODE_ENV=production
DEMO_MODE=false
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
FRONTEND_URL=https://your-domain.com
TELEGRAM_BOT_TOKEN=...
```
Deploy to Railway, Render, Heroku, or any Node-compatible host.

### Frontend
```bash
cd findora-frontend
npm run build       # outputs to dist/
```
Deploy `dist/` to Vercel, Netlify, or any static host. Set `VITE_API_URL` to your backend URL.

---

## 📝 License

MIT — see [LICENSE](./LICENSE).

---

## 👤 Authors

- **Sai Charan** — [@SAICHARAN1189](https://github.com/SAICHARAN1189)
- **Srinidhi Vishal** — [@SRINIDHI-VISHAL1493](https://github.com/SRINIDHI-VISHAL1493)

---

<div align="center">

**Built with ❤️ — making lost items findable again**

[Report a Bug](https://github.com/SAICHARAN1189/FINDORA/issues) · [Request a Feature](https://github.com/SAICHARAN1189/FINDORA/issues)

</div>
