import { useEffect, useRef, useState } from 'react'
import * as L from 'leaflet'
import type { PolygonData, GeographicCoordinates } from '../types'
import CoordinateUtils from '../utils/coordinateUtils'

interface PolygonMapViewProps {
  polygonData: PolygonData
  onNewPolygon: () => void
}

const PolygonMapView = ({ polygonData, onNewPolygon }: PolygonMapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const accuracyCircleRef = useRef<L.Circle | null>(null)

  const [userLocation, setUserLocation] = useState<GeographicCoordinates | null>(null)
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)

  const getUserLocation = () => {
    setIsLoadingLocation(true)
    setLocationError(null)

    if (!navigator.geolocation) {
      setLocationError('La geolocalización no está soportada en este navegador')
      setIsLoadingLocation(false)
      return
    }

    // Usar getCurrentPosition para actualización manual (no automática)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const accuracy = position.coords.accuracy
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }

        setUserLocation(newLocation)
        setLocationAccuracy(accuracy)
        setIsLoadingLocation(false)

        // Actualizar marcador si el mapa ya existe
        if (mapInstanceRef.current && userMarkerRef.current) {
          userMarkerRef.current.setLatLng([newLocation.lat, newLocation.lng])

          // Actualizar círculo de precisión
          if (accuracyCircleRef.current) {
            accuracyCircleRef.current.setLatLng([newLocation.lat, newLocation.lng])
            accuracyCircleRef.current.setRadius(accuracy)
          }
        }

        console.log(`📍 Ubicación actualizada manualmente - Precisión: ${accuracy.toFixed(2)}m`)
      },
      (error) => {
        let errorMessage = 'Error desconocido'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Ubicación no disponible'
            break
          case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado. Asegúrate de estar en exteriores para mejor señal GPS.'
            break
        }
        setLocationError(errorMessage)
        setIsLoadingLocation(false)
      },
      {
        enableHighAccuracy: true,  // Usar GPS de alta precisión
        timeout: 15000,             // 15 segundos para obtener ubicación
        maximumAge: 0               // SIEMPRE obtener ubicación fresca, nunca usar caché
      }
    )
  }

  useEffect(() => {
    // Obtener ubicación inicial al cargar
    getUserLocation()
  }, [])

  useEffect(() => {
    if (!mapRef.current || !polygonData.points.length) return

    // Limpiar mapa anterior si existe
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
    }

    try {
      // Convertir puntos UTM a coordenadas geográficas
      const geographicPoints = polygonData.points.map(point => {
        try {
          return CoordinateUtils.utmToGeographic({
            x: point.x,
            y: point.y,
            zone: point.zone
          })
        } catch (error) {
          console.warn(`Error convirtiendo punto UTM (${point.x}, ${point.y}, ${point.zone}):`, error)
          return null
        }
      }).filter(point => point !== null) as GeographicCoordinates[]

      if (geographicPoints.length === 0) {
        alert('Error: No se pudieron convertir las coordenadas UTM a geográficas')
        return
      }

      // Calcular centro del polígono
      const centerLat = geographicPoints.reduce((sum, point) => sum + point.lat, 0) / geographicPoints.length
      const centerLng = geographicPoints.reduce((sum, point) => sum + point.lng, 0) / geographicPoints.length

      // Crear el mapa centrado en el polígono
      const map = L.map(mapRef.current).setView([centerLat, centerLng], 15)

      // Agregar tiles de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map)

      // Crear polígono
      const polygon = L.polygon(
        geographicPoints.map(point => [point.lat, point.lng]),
        {
          color: '#059669',
          weight: 3,
          fillColor: '#10b981',
          fillOpacity: 0.2
        }
      ).addTo(map)

      // Popup para el polígono
      polygon.bindPopup(`
        <div style="text-align: center; padding: 8px;">
          <h5 style="font-weight: bold; margin-bottom: 8px; color: #1f2937;">Polígono Creado</h5>
          <p style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
            ${polygonData.points.length} vértices
          </p>
          <p style="font-size: 11px; color: #9ca3af;">
            Centro: ${centerLat.toFixed(6)}°, ${centerLng.toFixed(6)}°
          </p>
        </div>
      `)

      // Agregar marcadores en cada vértice
      geographicPoints.forEach((point, index) => {
        const originalPoint = polygonData.points[index]
        
        const marker = L.circleMarker([point.lat, point.lng], {
          radius: 6,
          color: '#dc2626',
          weight: 2,
          fillColor: '#fef2f2',
          fillOpacity: 0.8
        }).addTo(map)

        marker.bindPopup(`
          <div style="text-align: center; padding: 6px;">
            <h6 style="font-weight: bold; margin-bottom: 4px; color: #1f2937; font-size: 12px;">
              ${originalPoint.label}
            </h6>
            <p style="font-size: 10px; color: #6b7280; margin-bottom: 4px;">
              UTM: ${originalPoint.x.toLocaleString()}, ${originalPoint.y.toLocaleString()} (${originalPoint.zone})
            </p>
            <p style="font-size: 10px; color: #9ca3af;">
              Lat/Lng: ${point.lat.toFixed(6)}°, ${point.lng.toFixed(6)}°
            </p>
          </div>
        `)
      })

      // Agregar marcador de ubicación del usuario si está disponible
      if (userLocation) {
        // Agregar círculo de precisión primero (debajo del marcador)
        const accuracyCircle = L.circle([userLocation.lat, userLocation.lng], {
          radius: locationAccuracy || 10,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 1,
          opacity: 0.5
        }).addTo(map)
        accuracyCircleRef.current = accuracyCircle

        // Marcador del usuario con animación
        const userIcon = L.divIcon({
          html: `<div style="
            width: 20px;
            height: 20px;
            background-color: #3b82f6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            position: relative;
          ">
            <div style="
              position: absolute;
              top: -5px;
              left: -5px;
              right: -5px;
              bottom: -5px;
              border: 2px solid #3b82f6;
              border-radius: 50%;
              opacity: 0.3;
              animation: ping 2s infinite;
            "></div>
          </div>
          <style>
            @keyframes ping {
              0% { transform: scale(1); opacity: 0.3; }
              50% { transform: scale(1.5); opacity: 0.1; }
              100% { transform: scale(2); opacity: 0; }
            }
          </style>`,
          className: 'user-location-marker',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })

        const userMarker = L.marker([userLocation.lat, userLocation.lng], {
          icon: userIcon,
          zIndexOffset: 1000
        }).addTo(map)
        userMarkerRef.current = userMarker

        userMarker.bindPopup(`
          <div style="text-align: center; padding: 8px;">
            <h5 style="font-weight: bold; margin-bottom: 8px; color: #1f2937;">Tu Ubicación</h5>
            <p style="font-size: 12px; color: #6b7280;">
              ${userLocation.lat.toFixed(7)}°, ${userLocation.lng.toFixed(7)}°
            </p>
            ${locationAccuracy ? `<p style="font-size: 11px; color: #10b981; margin-top: 4px;">
              Precisión: ±${locationAccuracy.toFixed(1)}m
            </p>` : ''}
          </div>
        `)
      }

      // Ajustar vista para mostrar todo el polígono y la ubicación del usuario
      const bounds = polygon.getBounds()
      if (userLocation) {
        bounds.extend([userLocation.lat, userLocation.lng])
      }
      map.fitBounds(bounds, { padding: [20, 20] })

      mapInstanceRef.current = map

    } catch (error) {
      console.error('Error creando el mapa:', error)
      alert('Error creando el mapa: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [polygonData, userLocation])

  return (
    <div className="space-y-4">
      {/* Información del polígono */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Polígono Creado</h3>
            <p className="text-sm text-gray-600">
              {polygonData.points.length} vértices definidos con coordenadas UTM
            </p>
          </div>
          <button
            onClick={onNewPolygon}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🆕 Nuevo Polígono
          </button>
        </div>

        {/* Estado de ubicación del usuario */}
        <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex flex-col">
            <div className="flex items-center">
              <span className="text-sm text-gray-700">Tu ubicación:</span>
              {isLoadingLocation && (
                <span className="ml-2 text-sm text-blue-600">🔄 Obteniendo ubicación GPS...</span>
              )}
              {userLocation && !isLoadingLocation && (
                <span className="ml-2 text-xs text-green-600 font-mono">
                  {userLocation.lat.toFixed(7)}°, {userLocation.lng.toFixed(7)}°
                </span>
              )}
              {locationError && !isLoadingLocation && (
                <span className="ml-2 text-sm text-red-600">❌ {locationError}</span>
              )}
            </div>
            {locationAccuracy !== null && (
              <div className="flex items-center mt-1">
                <span className="text-xs text-gray-500">
                  Precisión GPS: <span className={`font-medium ${locationAccuracy < 10 ? 'text-green-600' : locationAccuracy < 20 ? 'text-yellow-600' : 'text-orange-600'}`}>
                    ±{locationAccuracy.toFixed(1)}m
                  </span>
                  {locationAccuracy < 10 && ' ✓ Excelente'}
                  {locationAccuracy >= 10 && locationAccuracy < 20 && ' - Buena'}
                </span>
              </div>
            )}
          </div>

          {!isLoadingLocation && (
            <button
              onClick={getUserLocation}
              className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition-colors"
            >
              📍 Actualizar Ubicación
            </button>
          )}
        </div>
      </div>

      {/* Mapa */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="h-96">
          <div 
            ref={mapRef} 
            style={{ height: '100%', width: '100%' }}
          />
        </div>
        
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center text-gray-600">
              <span className="w-4 h-4 bg-green-500 rounded mr-2 opacity-50"></span>
              Área del polígono
            </div>
            <div className="flex items-center text-gray-600">
              <div className="w-4 h-4 border-2 border-red-600 rounded-full mr-2"></div>
              Vértices del polígono
            </div>
            <div className="flex items-center text-gray-600">
              <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
              Tu ubicación actual
            </div>
          </div>
        </div>
      </div>

      {/* Lista de coordenadas */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-medium text-gray-800 mb-3">Coordenadas del Polígono</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {polygonData.points.map((point, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded-lg">
              <div className="font-medium text-gray-800 text-sm">{point.label}</div>
              <div className="text-xs text-gray-600 font-mono">
                UTM: {point.x.toLocaleString()}, {point.y.toLocaleString()} ({point.zone})
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PolygonMapView