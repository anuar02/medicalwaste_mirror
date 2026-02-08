# MedicalWaste.kz - Monorepo

Medical waste IoT management system: monitors smart bins, tracks collection drivers, manages handoff workflows, and provides analytics dashboards.

## Architecture

```
backend/    → Express.js REST API (JavaScript, MongoDB/Mongoose)
frontend/   → React 18 web dashboard (JavaScript, Tailwind CSS, Leaflet maps)
mobile/     → Expo React Native driver app (TypeScript, react-native-maps)
```

All three share: i18next (EN/RU), role-based auth (JWT), TanStack React Query.

## Running locally

```bash
# All services via Docker
docker-compose -f docker-compose.local.yml up
# Frontend: localhost:4000, Backend: localhost:5000, Mongo Express: localhost:8081

# Individual
cd backend  && npm run dev     # nodemon, port 5000
cd frontend && npm start       # CRA, port 3000 (proxies to 5000)
cd mobile   && npm start       # Expo dev server
```

Node version: 22 (see .nvmrc)

## Key domains

| Domain | Backend model | Frontend page | Mobile screen |
|--------|--------------|---------------|---------------|
| Bins | WasteBin | BinList, BinDetails, BinMap | DriverContainersScreen, DriverContainerDetailScreen |
| Collections | CollectionSession | DriverCollection | DriverSessionScreen, DriverRoutePanel |
| Handoffs | Handoff | HandoffManagement | DriverHandoffsScreen, DriverHandoffTimeline |
| Routes | Route | RouteManagement | DriverRoutePanel (map + directions) |
| Users | User, Driver | UserManagement, Profile | LoginScreen, DriverSettings |
| Companies | MedicalCompany | CompanyDetails | — |
| Devices | Device, HealthCheck | DeviceHealth | — |
| Incineration | IncinerationPlant | IncinerationPlantManagement | (in handoff flow) |

## Roles

- **admin** — full CRUD on all resources, user management
- **supervisor** — creates handoffs, manages company bins and drivers
- **driver** — starts collection sessions, confirms handoffs, navigates routes
- **user** — read-only dashboard access

## API patterns

All endpoints return `{ success, data, message, errors? }`. Auth via `Authorization: Bearer <jwt>`. Company-scoped filtering middleware auto-applies for non-admin roles.

## Database

MongoDB 5.0+ with Mongoose 7. GeoJSON for bin/plant locations. Key collections: users, wastebins, collectionsessions, handoffs, routes, devices, healthchecks, history.

## i18n

Both `en.json` and `ru.json` must stay in sync in both frontend and mobile. Keys are namespaced (e.g., `driver.history.title`). Always update both files when adding/changing text.

## CI/CD

GitLab CI builds Docker images and pushes to registry. Production uses `docker-compose.prod.yml` with Nginx reverse proxy.

## Testing

```bash
cd backend && npm test       # Jest + Supertest
cd frontend && npm test      # CRA Jest
cd mobile && npx tsc --noEmit  # TypeScript check (no Jest yet)
```
