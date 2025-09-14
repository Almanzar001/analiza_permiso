import { useState } from 'react'
import type { AnalysisResult } from '../types'
import MapView from './MapView'

interface PermitAnalysisProps {
  result: AnalysisResult
  onNewAnalysis: () => void
}

const PermitAnalysis = ({ result, onNewAnalysis }: PermitAnalysisProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'location' | 'coordinates'>('overview')

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">Análisis Completado</h2>
              <p className="text-green-100">
                Permiso #{result.permit_info.permit_number} - {result.permit_info.permit_type}
              </p>
            </div>
            <div className="text-right">
              <div className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-green-500 text-white">
                📍 Coordenadas Extraídas
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Resumen General
            </button>
            <button
              onClick={() => setActiveTab('location')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'location'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Ubicación y Mapa
            </button>
            <button
              onClick={() => setActiveTab('coordinates')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'coordinates'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Puntos de Coordenadas
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">Información del Permiso</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Número:</span>
                      <span className="font-medium">{result.permit_info.permit_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tipo:</span>
                      <span className="font-medium">{result.permit_info.permit_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Autoridad:</span>
                      <span className="font-medium">{result.permit_info.authority}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">Coordenadas UTM</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">X:</span>
                      <span className="font-mono">{result.location.utm.x.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Y:</span>
                      <span className="font-mono">{result.location.utm.y.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Zona:</span>
                      <span className="font-mono">{result.location.utm.zone}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">Coordenadas Geográficas</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Latitud:</span>
                      <span className="font-mono">
                        {result.location.geographic.lat !== null ? 
                          `${result.location.geographic.lat.toFixed(6)}°` : 
                          'No disponible'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Longitud:</span>
                      <span className="font-mono">
                        {result.location.geographic.lng !== null ? 
                          `${result.location.geographic.lng.toFixed(6)}°` : 
                          'No disponible'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">Centro del Polígono</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Latitud:</span>
                      <span className="font-mono">
                        {result.location.polygon_center.lat !== null ? 
                          `${result.location.polygon_center.lat.toFixed(6)}°` : 
                          'Calculando...'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Longitud:</span>
                      <span className="font-mono">
                        {result.location.polygon_center.lng !== null ? 
                          `${result.location.polygon_center.lng.toFixed(6)}°` : 
                          'Calculando...'
                        }
                      </span>
                    </div>
                    {result.location.all_points && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Puntos totales:</span>
                        <span className="font-medium">{result.location.all_points.length}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'location' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Ubicación del Proyecto</h3>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">Centro del Polígono</h4>
                    <p className="text-sm text-green-600">
                      {result.location.polygon_center.lat !== null && result.location.polygon_center.lng !== null ? 
                        `${result.location.polygon_center.lat.toFixed(6)}°, ${result.location.polygon_center.lng.toFixed(6)}°` : 
                        'Calculando desde coordenadas UTM...'
                      }
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">Coordenadas UTM</h4>
                    <p className="text-sm text-green-600">
                      {result.location.utm.x.toLocaleString()}, {result.location.utm.y.toLocaleString()} ({result.location.utm.zone})
                    </p>
                  </div>
                </div>
              </div>
              <MapView coordinates={result.location.polygon_center} />
            </div>
          )}

          {activeTab === 'coordinates' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Coordenadas Principales</h4>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h5 className="font-medium text-blue-800 mb-2">UTM (Zona {result.location.utm.zone})</h5>
                    <div className="space-y-1 text-sm">
                      <div>X: <span className="font-mono text-blue-600">{result.location.utm.x.toLocaleString()}</span></div>
                      <div>Y: <span className="font-mono text-blue-600">{result.location.utm.y.toLocaleString()}</span></div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h5 className="font-medium text-green-800 mb-2">Geográficas (WGS84)</h5>
                    <div className="space-y-1 text-sm">
                      <div>Lat: <span className="font-mono text-green-600">
                        {result.location.geographic.lat !== null ? 
                          `${result.location.geographic.lat.toFixed(6)}°` : 
                          'Convirtiendo UTM...'
                        }
                      </span></div>
                      <div>Lng: <span className="font-mono text-green-600">
                        {result.location.geographic.lng !== null ? 
                          `${result.location.geographic.lng.toFixed(6)}°` : 
                          'Convirtiendo UTM...'
                        }
                      </span></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {result.location.all_points && result.location.all_points.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-800 mb-4">Todos los Puntos Detectados ({result.location.all_points.length})</h4>
                  <div className="grid md:grid-cols-3 gap-4 max-h-60 overflow-y-auto">
                    {result.location.all_points.map((point, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded text-sm">
                        <div className="font-medium text-gray-700 mb-1">Punto {index + 1}</div>
                        <div className="font-mono text-xs">
                          <div>X: {point.x.toLocaleString()}</div>
                          <div>Y: {point.y.toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
          <button
            onClick={onNewAnalysis}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Nuevo Análisis
          </button>
          
          <div className="flex space-x-3">
            <button className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
              Copiar Coordenadas
            </button>
            <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
              Exportar KML
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PermitAnalysis