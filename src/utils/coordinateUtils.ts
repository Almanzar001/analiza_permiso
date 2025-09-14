// UTM to Geographic coordinate conversion utilities

interface UTMCoordinates {
  x: number
  y: number
  zone: string
}

interface GeographicCoordinates {
  lat: number
  lng: number
}

interface PolygonPoint {
  lat: number
  lng: number
}

class CoordinateUtils {
  // Convert UTM coordinates to Geographic (WGS84) - Optimized for Dominican Republic
  static utmToGeographic(utm: UTMCoordinates): GeographicCoordinates {
    // Handle Dominican Republic specific zones (19Q, 19N, 20N)
    let zoneNumber: number
    let isNorthern: boolean = true // Dominican Republic is always northern hemisphere

    if (utm.zone === '19Q' || utm.zone === '19N') {
      zoneNumber = 19
    } else if (utm.zone === '20N') {
      zoneNumber = 20
    } else {
      // Try to extract from standard format (e.g., "19N", "20N")
      const zoneMatch = utm.zone.match(/(\d+)([NS])/i)
      if (!zoneMatch) {
        // Default to zone 19 for Dominican Republic if unclear
        zoneNumber = 19
      } else {
        zoneNumber = parseInt(zoneMatch[1])
        isNorthern = zoneMatch[2].toUpperCase() === 'N'
      }
    }

    // UTM constants
    const k0 = 0.9996 // UTM scale factor
    const e = 0.00669438 // First eccentricity squared for WGS84
    const e1sq = 0.00673949674228 // e1sq = e/(1-e)
    const n = (1 - Math.sqrt(1 - e)) / (1 + Math.sqrt(1 - e))
    const a = 6378137 // Semi-major axis for WGS84
    // Removed unused variables rho1 and nu1

    // Remove false easting and northing
    const x = utm.x - 500000.0 // Remove false easting
    let y = utm.y
    if (!isNorthern) {
      y = y - 10000000.0 // Remove false northing for southern hemisphere
    }

    // Calculate longitude
    const lonOrigin = (zoneNumber - 1) * 6 - 180 + 3 // Central meridian

    // Calculate latitude using series approximation
    const M = y / k0
    const mu = M / (a * (1 - e / 4 - 3 * e * e / 64 - 5 * Math.pow(e, 3) / 256))

    const phi1Rad = mu + 
      (3 * n / 2 - 27 * Math.pow(n, 3) / 32) * Math.sin(2 * mu) +
      (21 * n * n / 16 - 55 * Math.pow(n, 4) / 32) * Math.sin(4 * mu) +
      (151 * Math.pow(n, 3) / 96) * Math.sin(6 * mu)

    const phi1 = phi1Rad
    const rho1Calc = a * (1 - e) / Math.pow(1 - e * Math.sin(phi1) * Math.sin(phi1), 1.5)
    const nu1Calc = a / Math.sqrt(1 - e * Math.sin(phi1) * Math.sin(phi1))

    const T1 = Math.tan(phi1) * Math.tan(phi1)
    const C1 = e1sq * Math.cos(phi1) * Math.cos(phi1)
    // Removed unused variable R1
    const D = x / (nu1Calc * k0)

    // Calculate latitude
    const lat = phi1Rad - (nu1Calc * Math.tan(phi1) / rho1Calc) *
      (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * e1sq) * Math.pow(D, 4) / 24 +
       (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * e1sq - 3 * C1 * C1) * Math.pow(D, 6) / 720)

    // Calculate longitude
    const lng = (lonOrigin * Math.PI / 180) + 
      (D - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 +
       (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * e1sq + 24 * T1 * T1) * Math.pow(D, 5) / 120) / Math.cos(phi1)

    return {
      lat: lat * 180 / Math.PI,
      lng: lng * 180 / Math.PI
    }
  }

  // Convert Geographic coordinates to UTM
  static geographicToUtm(coords: GeographicCoordinates): UTMCoordinates {
    const lat = coords.lat * Math.PI / 180
    const lon = coords.lng * Math.PI / 180

    // UTM zone calculation
    const zoneNumber = Math.floor((coords.lng + 180) / 6) + 1
    const lonOrigin = (zoneNumber - 1) * 6 - 180 + 3
    const lonOriginRad = lonOrigin * Math.PI / 180

    // WGS84 constants
    const a = 6378137
    const eccSquared = 0.00669438
    const k0 = 0.9996

    const eccPrimeSquared = eccSquared / (1 - eccSquared)
    const N = a / Math.sqrt(1 - eccSquared * Math.sin(lat) * Math.sin(lat))
    const T = Math.tan(lat) * Math.tan(lat)
    const C = eccPrimeSquared * Math.cos(lat) * Math.cos(lat)
    const A = Math.cos(lat) * (lon - lonOriginRad)

    const M = a * ((1 - eccSquared / 4 - 3 * eccSquared * eccSquared / 64 - 5 * Math.pow(eccSquared, 3) / 256) * lat -
      (3 * eccSquared / 8 + 3 * eccSquared * eccSquared / 32 + 45 * Math.pow(eccSquared, 3) / 1024) * Math.sin(2 * lat) +
      (15 * eccSquared * eccSquared / 256 + 45 * Math.pow(eccSquared, 3) / 1024) * Math.sin(4 * lat) -
      (35 * Math.pow(eccSquared, 3) / 3072) * Math.sin(6 * lat))

    const utmEasting = k0 * N * (A + (1 - T + C) * Math.pow(A, 3) / 6 +
      (5 - 18 * T + T * T + 72 * C - 58 * eccPrimeSquared) * Math.pow(A, 5) / 120) + 500000.0

    let utmNorthing = k0 * (M + N * Math.tan(lat) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4) / 24 +
      (61 - 58 * T + T * T + 600 * C - 330 * eccPrimeSquared) * Math.pow(A, 6) / 720))

    const hemisphere = coords.lat >= 0 ? 'N' : 'S'
    if (hemisphere === 'S') {
      utmNorthing += 10000000.0
    }

    return {
      x: Math.round(utmEasting),
      y: Math.round(utmNorthing),
      zone: `${zoneNumber}${hemisphere}`
    }
  }

  // Calculate the centroid (center point) of a polygon
  static calculatePolygonCentroid(polygon: PolygonPoint[]): GeographicCoordinates {
    if (polygon.length === 0) {
      throw new Error('Polygon must have at least one point')
    }

    if (polygon.length === 1) {
      return polygon[0]
    }

    let area = 0
    let centroidLat = 0
    let centroidLng = 0

    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length
      const xi = polygon[i].lng
      const yi = polygon[i].lat
      const xj = polygon[j].lng
      const yj = polygon[j].lat
      
      const a = xi * yj - xj * yi
      area += a
      centroidLat += (yi + yj) * a
      centroidLng += (xi + xj) * a
    }

    area *= 0.5
    centroidLat /= (6 * area)
    centroidLng /= (6 * area)

    return {
      lat: centroidLat,
      lng: centroidLng
    }
  }

  // Calculate distance between two geographic points (Haversine formula)
  static calculateDistance(point1: GeographicCoordinates, point2: GeographicCoordinates): number {
    const R = 6371000 // Earth's radius in meters
    const lat1Rad = point1.lat * Math.PI / 180
    const lat2Rad = point2.lat * Math.PI / 180
    const deltaLat = (point2.lat - point1.lat) * Math.PI / 180
    const deltaLng = (point2.lng - point1.lng) * Math.PI / 180

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
  }

  // Validate UTM coordinates
  static validateUtmCoordinates(utm: UTMCoordinates): boolean {
    // Check zone format
    const zoneMatch = utm.zone.match(/^(\d{1,2})[NS]$/i)
    if (!zoneMatch) return false

    const zoneNumber = parseInt(zoneMatch[1])
    if (zoneNumber < 1 || zoneNumber > 60) return false

    // Check easting (X coordinate)
    if (utm.x < 160000 || utm.x > 840000) return false

    // Check northing (Y coordinate)
    // Northern hemisphere: 0 to 10,000,000
    // Southern hemisphere: 0 to 10,000,000 (but offset by 10,000,000 in UTM)
    if (utm.y < 0 || utm.y > 10000000) return false

    return true
  }

  // Validate geographic coordinates
  static validateGeographicCoordinates(coords: GeographicCoordinates): boolean {
    return coords.lat >= -90 && coords.lat <= 90 && 
           coords.lng >= -180 && coords.lng <= 180
  }
}

export default CoordinateUtils
export type { UTMCoordinates, GeographicCoordinates, PolygonPoint }