# Frontend (React Web Dashboard)

Admin/supervisor web dashboard for monitoring bins, managing handoffs, viewing analytics, and tracking drivers.

## Stack

- **React** 18.3.0 (JavaScript, JSX — no TypeScript)
- **Create React App** 5.0.1 (build tooling)
- **React Router** v6.28.0
- **TanStack React Query** v5.28.0 (data fetching + caching)
- **Tailwind CSS** 3.4.16 + PostCSS
- **Leaflet** 1.9.4 + **React-Leaflet** 4.2.1 (maps)
- **Recharts** 2.14.1 (charts/analytics)
- **Lucide React** (icons)
- **Framer Motion** 6.5.1 (animations)
- **Axios** 1.7.7 (HTTP client)
- **i18next** 23.10.1 (EN + RU)
- **react-hot-toast** 2.5.2 (notifications)
- **Capacitor** 7.4.4 (optional iOS/Android builds)

## Running

```bash
npm start       # Dev server on port 3000 (proxies API to :5000)
npm run build   # Production build
npm test        # Jest tests
```

## Directory structure

```
src/
├── App.js                # Root: QueryClient, Router, lazy routes, theme/auth providers
├── axiosInstance.js       # Axios config (not the main one)
├── i18n.js               # i18next setup with language detection
│
├── services/
│   └── api.js            # Main axios instance + interceptors (27KB)
│
├── contexts/
│   ├── AuthContext.jsx    # JWT auth, user roles, login/logout (21KB)
│   └── ThemeContext.jsx   # Dark/light mode toggle (3KB)
│
├── layouts/
│   ├── DashboardLayout.jsx  # Sidebar + header + content area (26KB)
│   └── AuthLayout.jsx       # Minimal auth page wrapper
│
├── components/
│   ├── bins/              # BinCard, BinFilters, BinStatusBadge, BinVisualization, UnassignedBins
│   ├── charts/            # Recharts wrappers for analytics
│   ├── dashboard/         # Dashboard widget components
│   ├── map/               # Leaflet map wrappers
│   ├── modals/            # Modal dialogs
│   └── ui/                # Alert, Button, ExportButton, Loader, Logo
│
├── pages/
│   ├── auth/              # Login, Register, ForgotPassword, ResetPassword
│   ├── admin/             # BinManagement, CompanyDetails, DeviceManagement, UserManagement, IncinerationPlantManagement
│   ├── driver/            # DriverRouteView
│   ├── handoffs/          # HandoffManagement, PublicConfirmation
│   ├── routes/            # RouteCreate, RouteDetail, RouteManagement
│   ├── Dashboard.jsx      # Main dashboard (82KB — largest file)
│   ├── BinList.jsx        # Bin list with filters
│   ├── BinDetails.jsx     # Single bin detail view
│   ├── BinMap.jsx         # Full-page map view
│   ├── Reports.jsx        # Analytics and reports
│   ├── Settings.jsx       # App settings
│   ├── Profile.jsx        # User profile
│   ├── DeviceHealth.jsx   # IoT device monitoring
│   └── DeviceTracking.jsx # Real-time device tracking
│
├── locales/               # i18n JSON files
│   ├── en/
│   └── ru/
│
└── utils/
    └── errorBoundary.js   # React error boundary
```

## Routing

All routes use React.lazy() + Suspense for code splitting. Protected routes check localStorage for JWT token.

```
/login, /register, /forgot-password, /reset-password/:token

/dashboard           # Main analytics dashboard
/bins                # Bin list with filters and sorting
/bins/:id            # Bin detail with charts and history
/map                 # Full-page Leaflet map
/reports             # Analytics and export
/settings            # App configuration
/profile             # User profile management

/driver              # Driver dashboard
/driver/collection   # Active collection UI
/driver/tracking     # Vehicle tracking map
/driver/route/:id    # Route detail view

/admin/users         # User CRUD
/admin/bins          # Bin management
/admin/devices       # Device management
/admin/companies     # Company details
/admin/incineration  # Incineration plant management

/handoffs            # Handoff management workflow
/handoffs/confirm/:token  # Public confirmation page (no auth)

/routes, /routes/create, /routes/:id  # Route management
```

## API integration

`services/api.js` (27KB) — axios instance with interceptors:

- **Base URL**: `/api` (proxied by CRA dev server or Nginx)
- **Timeout**: 10 seconds
- **Request interceptor**: Adds `Authorization: Bearer <token>` from localStorage
- **Response interceptor**: Handles 401 (redirect to login), 403 (permission denied), 404, 422 (validation), 429 (rate limit), 5xx

## Auth flow

`AuthContext.jsx` manages:
1. JWT token in localStorage
2. User object with role/company
3. Login/logout functions
4. Google OAuth integration
5. Token refresh on 401

## React Query config

```js
{
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: 3 (with exponential backoff),
  staleTime: 60_000,     // 1 minute
  gcTime: 300_000,       // 5 minutes
  // No retry on 404/403
}
```

## Styling

Tailwind CSS utility classes. Custom theme extensions in `tailwind.config.js`. Dark/light mode via `ThemeContext`.

## i18n

English and Russian. Keys in `src/locales/en/` and `src/locales/ru/`. Keep both in sync.

## Maps

Leaflet for all map views (bins, tracking, routes). Uses `react-leaflet` wrappers. Markers, polylines, popups.

## Common pitfalls

1. **Large files**: Dashboard.jsx is 82KB — be careful with full reads. Use targeted edits.
2. **No TypeScript**: All files are .jsx/.js. No type safety — rely on prop naming and React Query typing.
3. **API proxy**: In dev, CRA proxies `/api` to backend. In production, Nginx handles this.
4. **Lazy loading**: All pages are lazy-loaded. Don't import pages directly — use `React.lazy()` in App.js.
5. **Locale sync**: `en/` and `ru/` locale directories must stay in sync.
6. **Toast notifications**: Use `react-hot-toast` for user feedback, not `alert()`.
