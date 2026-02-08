import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { recordDriverLocation } from './collections';

const LOCATION_TASK_NAME = 'collection-location-task';
const LOCATION_UPDATE_INTERVAL_MS = 30000;

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('Location task error', error);
    return;
  }

  const payload = data as Location.LocationTaskBody;
  const latestLocation = payload.locations?.[0];

  if (!latestLocation) {
    return;
  }

  try {
    await recordDriverLocation({
      latitude: latestLocation.coords.latitude,
      longitude: latestLocation.coords.longitude,
      accuracy: latestLocation.coords.accuracy,
      altitude: latestLocation.coords.altitude ?? undefined,
      altitudeAccuracy: latestLocation.coords.altitudeAccuracy ?? undefined,
      heading: latestLocation.coords.heading ?? undefined,
      speed: latestLocation.coords.speed ?? undefined,
      timestamp: latestLocation.timestamp,
    });
  } catch (err) {
    console.warn('Failed to send driver location', err);
  }
});

export async function startCollectionLocationUpdates() {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') {
    throw new Error('Foreground location permission denied');
  }

  const background = await Location.requestBackgroundPermissionsAsync();

  const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (!hasStarted) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: LOCATION_UPDATE_INTERVAL_MS,
      distanceInterval: 20,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Collection tracking active',
        notificationBody: 'Sharing location to update your route.',
      },
      pausesUpdatesAutomatically: false,
    });
  }

  return {
    foreground: foreground.status,
    background: background.status,
  };
}

export async function stopCollectionLocationUpdates() {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}

export const locationTaskName = LOCATION_TASK_NAME;
