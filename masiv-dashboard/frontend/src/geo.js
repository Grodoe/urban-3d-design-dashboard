// Simple equirectangular projection: converts lon/lat to local X/Z meters
// around an origin point. Accurate enough for a 3-4 block area (a few
// hundred meters), which is all this dashboard needs.
const EARTH_RADIUS_M = 6378137;

export function makeProjector(originLat, originLon) {
  const originLatRad = (originLat * Math.PI) / 180;
  return function project(lon, lat) {
    const x = ((lon - originLon) * Math.PI) / 180 * EARTH_RADIUS_M * Math.cos(originLatRad);
    const z = -(((lat - originLat) * Math.PI) / 180 * EARTH_RADIUS_M); // -z so north is "up" on screen
    return [x, z];
  };
}
