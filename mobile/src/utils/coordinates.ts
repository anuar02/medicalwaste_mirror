/**
 * Converts a GeoJSON [longitude, latitude] coordinate pair to a React Native Maps
 * { latitude, longitude } object, with bounds validation.
 * Returns null if the input is invalid.
 */
export function toValidCoordinate(
  coords: unknown,
): { latitude: number; longitude: number } | null {
  if (!Array.isArray(coords) || coords.length !== 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { latitude: lat, longitude: lng };
}
