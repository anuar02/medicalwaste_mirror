# Mobile App (Expo / React Native)

Driver-facing app for medical waste collection: route navigation, container tracking, handoff confirmations.

## Stack

- **Expo** ~54.0.33 (managed workflow, new architecture enabled)
- **React Native** 0.81.5, **React** 19.1.0
- **TypeScript** strict mode (extends expo/tsconfig.base)
- **react-native-reanimated** ~4.1.1 (babel plugin in `babel.config.js`)
- **react-native-maps** 1.18.0 with Google Directions API
- **@gorhom/bottom-sheet** for bottom sheets
- **react-native-gesture-handler** wraps entire app in `App.tsx`
- **@tanstack/react-query** v5 for data fetching
- **zustand** v5 for auth state
- **i18next** v24 (EN + RU, both in `src/locales/`)
- **expo-location** + **expo-task-manager** for background GPS

## Entry point

```
index.ts → App.tsx → GestureHandlerRootView → QueryClientProvider → AppNavigator
```

AppNavigator checks auth store → routes to Login or role-based navigator (Driver/Supervisor/Admin).

## Directory layout

```
src/
├── components/           # Large feature components
│   ├── DriverRoutePanel.tsx       # Map + bottom sheet + route polyline
│   ├── DriverHandoffTimeline.tsx  # Handoff step-by-step UI
│   ├── DriverLocationTracker.tsx  # Background GPS wrapper
│   └── shared/                    # Reusable UI primitives
│       ├── AnimatedProgressBar.tsx
│       ├── ContainerCard.tsx      # Main card for bin lists
│       ├── NextStopCard.tsx
│       ├── PulsingDot.tsx
│       └── SegmentedControl.tsx
├── screens/
│   ├── auth/          # LoginScreen, RegisterScreen
│   └── driver/        # All driver screens (10 files)
├── navigation/        # React Navigation stacks + tabs
├── hooks/             # React Query wrappers (useCollections, useHandoffs, etc.)
├── services/          # API calls (axios instance + domain endpoints)
├── stores/            # Zustand auth store (expo-secure-store backed)
├── types/             # models.ts, navigation.ts
├── theme/             # dark.ts, colors.ts, typography.ts, spacing.ts
├── utils/             # formatTime, urgency, distance, constants, env
└── locales/           # en.json, ru.json
```

## Theme system

Import from `../../theme`:

```ts
import { dark, spacing, typography } from '../../theme';
```

- **dark.ts** — color tokens: `bg`, `surface`, `card`, `border`, `text`, `textSecondary`, `muted`, `teal`, `amber`, `success`, `successText`, `danger`, `dangerText`, `barTrack`, `tealGlow`, `urgencyCritical`, `urgencyWarning`, `urgencyNormal`
- **typography.ts** — `heading` (24/700), `title` (18/600), `body` (14/400), `caption` (12/400). These are spread objects (fontSize + fontWeight), NOT including color.
- **spacing.ts** — `xs=4, sm=8, md=12, lg=16, xl=24, xxl=32`

**Critical**: Typography spreads don't include `color`. Always add `color: dark.text` (or other token) explicitly. Missing color = invisible text on dark bg.

## Animation rules

All animations MUST use `react-native-reanimated`, never the old `Animated` API from react-native.

Common patterns:
```tsx
import Animated, { FadeInDown, FadeInUp, ZoomIn, SlideInUp } from 'react-native-reanimated';

// Entry animations on cards
<Animated.View entering={FadeInDown.delay(index * 60).springify()}>

// Animated styles
const style = useAnimatedStyle(() => ({
  width: withSpring(sharedValue.value),
}));
```

## Navigation structure

```
AppNavigator (auth check)
├── Auth Stack: Login, Register
└── DriverNavigator (bottom tabs)
    ├── DriverHome
    ├── DriverSession (DriverSessionScreen — swipeable Route/Handoffs pages)
    ├── DriverContainersStack
    │   ├── DriverContainers
    │   └── DriverContainerDetail
    ├── DriverHistoryStack
    │   ├── DriverHistory
    │   └── DriverSessionTimeline
    └── DriverProfile (DriverSettings)
```

Navigation types in `src/types/navigation.ts`. Always type navigation props:
```tsx
const navigation = useNavigation<NativeStackNavigationProp<DriverHistoryStackParamList>>();
```

## Data flow

1. **Auth**: Zustand store (`authStore.ts`) holds token + user. Token stored in expo-secure-store.
2. **API**: `services/api.ts` creates axios instance with base URL from `utils/env.ts`. Interceptor adds Bearer token.
3. **Queries**: `hooks/useCollections.ts`, `useHandoffs.ts`, `useWasteBins.ts` wrap React Query. Polling via `refetchInterval`.
4. **Models**: `types/models.ts` — `WasteBin`, `CollectionSession`, `Handoff`, `HandoffContainer`, `IncinerationPlant`, `User`.

## Key models

```ts
CollectionSession {
  _id, sessionId, driver, route?, status: 'active' | 'completed',
  startTime?, endTime?, selectedContainers?: { container: WasteBin, visited: boolean }[]
}

Handoff {
  _id, handoffId?, type: 'facility_to_driver' | 'driver_to_incinerator',
  status: 'created' | 'pending' | 'confirmedBySender' | 'confirmedByReceiver' | 'completed' | 'disputed' | 'resolved' | 'expired',
  session?, sender?, receiver?, containers?, createdAt?, completedAt?, dispute?
}

WasteBin {
  _id, binId, department?, wasteType?, fullness?: number (0-100),
  temperature?: number, status?, location?: { type: 'Point', coordinates: [lng, lat] },
  lastUpdate?: string
}
```

## i18n

Keys are deeply nested (e.g., `driver.history.statusCompleted`). Both `en.json` and `ru.json` MUST stay in sync.

```tsx
const { t } = useTranslation();
t('driver.history.containers', { count: 5 })  // "5 containers" / "5 конт."
```

## Shared components

- **ContainerCard** — main card for bin lists. Props: bin data, distance, visited status, onPress. Has urgency stripe, animated progress bar, PulsingDot freshness.
- **AnimatedProgressBar** — fullness bar with `withSpring`. Props: `fullness`, `color`, `height?`.
- **PulsingDot** — freshness indicator. Props: `freshness: 'fresh' | 'stale' | 'old'`.
- **SegmentedControl** — animated tab control with sliding indicator. Props: `tabs`, `activeIndex`, `onChange`.

## Utilities

- `formatTime.ts` — `formatRelativeTime(iso, t)`, `getDataFreshness(iso)` → 'fresh'|'stale'|'old'
- `urgency.ts` — `getUrgencyColor(fullness)`, `getUrgencyBg(fullness)`, `getUrgencyLevel(fullness)`
- `distance.ts` — `haversineDistance(lat1, lon1, lat2, lon2)`, `formatDistance(meters)`

## Common pitfalls

1. **Missing color on text**: `...typography.body` only gives fontSize+fontWeight. Add `color: dark.text`.
2. **Locale sync**: Forgetting to update ru.json when adding EN keys.
3. **Old Animated API**: Never use `import { Animated } from 'react-native'`. Use reanimated.
4. **GeoJSON coordinates**: MongoDB stores `[longitude, latitude]` (reversed from Google Maps convention).
5. **Bottom sheet**: Import `BottomSheetFlatList` from `@gorhom/bottom-sheet` for scrollable lists inside sheets — regular FlatList won't scroll.
6. **Padding on map overlays**: Content inside DriverRoutePanel needs explicit `paddingHorizontal: spacing.xl`.

## Type checking

```bash
npx tsc --noEmit   # From mobile/ directory
```

Pre-existing type errors in @expo/vector-icons (missing types) and some implicit-any in third-party libs. These are known and expected.
