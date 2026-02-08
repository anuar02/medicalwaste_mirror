# Backend (Express.js API)

REST API for the MedicalWaste.kz IoT platform. Handles auth, bin monitoring, collection sessions, handoff workflows, GPS tracking, and notifications.

## Stack

- **Express** 4.18.2 (JavaScript, no TypeScript)
- **Mongoose** 7.6.3 (MongoDB ODM)
- **JWT** auth with bcryptjs + Google OAuth
- **Winston** logging + Morgan HTTP logging
- **WebSockets** (ws) for real-time GPS tracking
- **Telegram/Twilio/Nodemailer** for notifications
- **Jest** 29.7.0 + **Supertest** for testing
- **PM2** for production process management

## Running

```bash
npm run dev     # nodemon (development)
npm start       # node server.js (production)
npm test        # Jest
npm run lint    # ESLint (airbnb-base)
```

Port: 5000 (default). Requires MongoDB connection (see `.env`).

## Directory structure

```
server.js              # Entry point: middleware chain → MongoDB connect → WS init
controllers/    (15)   # Business logic (one per domain)
routes/         (21)   # Express Router definitions
models/         (18)   # Mongoose schemas
middleware/     (5)    # auth, validators, errorHandlers, companyFilter, loggers
services/       (8)    # routeOptimizer, smartScheduler, SMS, tokens
utils/          (8)    # telegram bot, gpsWebSocket, email, appError, asyncHandler
jobs/                  # CRON jobs (smartSchedulerCron)
tests/                 # Jest test files
```

## API conventions

### Response format
All endpoints return:
```json
{ "success": true, "data": { ... }, "message": "..." }
{ "success": false, "message": "Error description", "errors": [...] }
```

### Authentication
- `POST /api/auth/login` → `{ token, refreshToken, user }`
- `POST /api/auth/register` → `{ token, user }`
- `POST /api/auth/google` → Google OAuth flow
- Token: JWT, 24h expiry, 7d refresh
- Header: `Authorization: Bearer <token>`
- Middleware: `auth.js` verifies JWT and attaches `req.user`

### Role-based access
Roles: `admin`, `supervisor`, `driver`, `user`. Middleware `auth.js` exposes `req.user.role`. Controller logic checks roles for authorization.

### Company scoping
`companyFilter.js` middleware auto-scopes queries to the user's company for non-admin roles. This prevents cross-company data leaks.

## Key routes

```
/api/auth/*              # Login, register, OAuth, refresh
/api/waste-bins/*        # CRUD, monitoring, alerts, fullness updates
/api/collections/*       # Session start/stop, history, mark-visited
/api/handoffs/*          # Create, confirm, dispute, resolve, status
/api/routes/*            # Route planning and optimization
/api/tracking/*          # GPS data ingestion
/api/users/*             # User CRUD, role management
/api/drivers/*           # Driver-specific operations
/api/companies/*         # Company management
/api/devices/*           # IoT device registration and health
/api/health-check/*      # System health monitoring
/api/incineration-plants/* # Plant CRUD
/api/notifications/*     # Alert delivery
/api/history/*           # Audit trail
/api/gps/*               # WebSocket GPS endpoint
```

## Key models

### WasteBin
```js
{ binId, department, wasteType, fullness (0-100), temperature,
  status, weight, location: { type: 'Point', coordinates: [lng, lat] },
  company (ref), lastUpdate, alerts }
```

### CollectionSession
```js
{ sessionId, driver (ref), route (ref), status: 'active'|'completed',
  startTime, endTime, selectedContainers: [{ container (ref), visited }],
  company (ref) }
```

### Handoff
```js
{ handoffId, type: 'facility_to_driver'|'driver_to_incinerator',
  status: 'created'|'pending'|'confirmedBySender'|'confirmedByReceiver'|'completed'|'disputed'|'resolved'|'expired',
  session (ref), sender (ref), receiver (ref),
  containers: [{ container (ref), declaredWeight, confirmedWeight, bagCount }],
  dispute: { reason, description, raisedBy, resolvedBy, resolution },
  confirmationToken, tokenExpiresAt }
```

### User
```js
{ email, username, password (hashed), role, company (ref),
  phone, vehiclePlate, isVerified, googleId }
```

## Middleware chain (server.js)

1. Morgan access logging
2. Helmet security headers (with CORS-friendly CSP)
3. CORS (configured origins: production domain, localhost, Capacitor)
4. Rate limiting (5000 req / 15 min)
5. Body parser (1MB limit)
6. Compression
7. Route mounting
8. 404 handler
9. Global error handler

## Error handling

```js
// Custom error class
throw new AppError('Not found', 404);

// Async wrapper (no try-catch needed in controllers)
router.get('/', asyncHandler(async (req, res) => { ... }));

// Global handler catches all, returns { success: false, message }
```

## WebSocket GPS

`utils/gpsWebSocket.js` initializes WS server on the same HTTP server. Handles real-time driver location broadcasts. GPS data stored in `TrackingData` and `DriverLocation` models.

## Notifications

- **Telegram**: `telegraf` bot sends alerts to configured chats
- **Email**: `nodemailer` via SMTP (smtp.mail.ru)
- **SMS**: `twilio` for verification codes
- **WhatsApp**: Twilio WhatsApp API

## Testing

```bash
npm test                    # All tests
npm test -- --coverage      # With coverage
npm test -- --watch         # Watch mode
```

Jest with node test environment, 10s timeout. Tests in `tests/` directory.

## Environment variables

Key `.env` variables:
```
MONGODB_URI, PORT, NODE_ENV
JWT_SECRET, JWT_EXPIRES_IN
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS
TELEGRAM_BOT_TOKEN
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
API_KEY
CORS_ORIGIN
```

## Common pitfalls

1. **GeoJSON order**: MongoDB uses `[longitude, latitude]`, not `[lat, lng]`.
2. **Population**: Mongoose refs need `.populate()` — forgetting this returns just ObjectIds.
3. **Company filter**: Non-admin queries are auto-scoped. Don't bypass unless intentional.
4. **Token expiry**: Handoff confirmation tokens expire. Check `tokenExpiresAt` before accepting.
5. **Rate limiting**: 5000 req/15min. WebSocket GPS data is exempt (different protocol).
