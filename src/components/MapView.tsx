import { useEffect, useRef } from 'react'
import * as L from 'leaflet'
import type { GeographicCoordinates } from '../types'

interface MapViewProps {
  coordinates: GeographicCoordinates
}

const MapView = ({ coordinates }: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}&z=15`
    window.open(url, '_blank')
  }

  useEffect(() => {
    if (!mapRef.current || !coordinates.lat || !coordinates.lng) return

    // Limpiar mapa anterior si existe
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
    }

    // Crear el mapa
    const map = L.map(mapRef.current).setView([coordinates.lat, coordinates.lng], 15)

    // Agregar tiles de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map)

    // Crear icono personalizado
    const customIcon = L.icon({
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })

    // Agregar marcador
    const marker = L.marker([coordinates.lat, coordinates.lng], { icon: customIcon }).addTo(map)
    
    // Popup con información y botón
    marker.bindPopup(`
      <div style="text-align: center; padding: 8px;">
        <h5 style="font-weight: bold; margin-bottom: 8px; color: #1f2937;">Ubicación del Proyecto</h5>
        <p style="font-size: 12px; color: #6b7280; margin-bottom: 12px;">
          ${coordinates.lat.toFixed(6)}°, ${coordinates.lng.toFixed(6)}°
        </p>
        <button 
          onclick="window.open('https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}&z=15', '_blank')"
          style="
            background-color: #3b82f6;
            color: white;
            border: none;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
          "
          onmouseover="this.style.backgroundColor='#2563eb'"
          onmouseout="this.style.backgroundColor='#3b82f6'"
        >
          Abrir en Google Maps
        </button>
      </div>
    `)

    // Hacer clic en el marcador para abrir el popup
    marker.on('click', () => {
      marker.openPopup()
    })

    mapInstanceRef.current = map

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [coordinates])

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h4 className="font-semibold text-gray-800">Mapa de Ubicación</h4>
        <p className="text-sm text-gray-600">
          Centro del polígono del área autorizada - Haz clic en el marcador para abrir en Google Maps
        </p>
      </div>
      
      <div className="h-96">
        <div 
          ref={mapRef} 
          style={{ height: '100%', width: '100%' }}
          className="rounded-none"
        />
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center text-gray-600">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            Coordenadas exactas
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-gray-800 font-mono text-xs">
              {coordinates.lat.toFixed(6)}°, {coordinates.lng.toFixed(6)}°
            </div>
            <button
              onClick={openInGoogleMaps}
              className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
              title="Abrir en Google Maps"
            >
              📍 Google Maps
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MapView