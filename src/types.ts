export interface UTMCoordinates {
  x: number
  y: number
  zone: string
}

export interface GeographicCoordinates {
  lat: number
  lng: number
}

export interface CoordinatePoint {
  x: number
  y: number
}

export interface Location {
  utm: UTMCoordinates
  geographic: GeographicCoordinates
  polygon_center: GeographicCoordinates
  all_points?: CoordinatePoint[]
}

export interface PermitInfo {
  permit_number: string
  permit_type: string
  authority: string
}

export interface AnalysisResult {
  location: Location
  permit_info: PermitInfo
}

export interface DateInfo {
  emission_date: string | null // YYYY-MM-DD format
  authorized_days: number | null
  expiration_date: string | null // YYYY-MM-DD format
  days_remaining: number | null // calculated field
  is_expired: boolean
  status: 'valid' | 'expired' | 'unknown'
}

export interface DateAnalysisResult {
  date_info: DateInfo
  permit_info: PermitInfo
}