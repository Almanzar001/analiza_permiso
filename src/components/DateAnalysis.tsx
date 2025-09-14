import { useState } from 'react'
import type { DateAnalysisResult } from '../types'

interface DateAnalysisProps {
  result: DateAnalysisResult
  onNewAnalysis: () => void
}

const DateAnalysis = ({ result, onNewAnalysis }: DateAnalysisProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview')

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No disponible'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'text-green-600 bg-green-50'
      case 'expired': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusText = (status: string, daysRemaining: number | null) => {
    switch (status) {
      case 'valid':
        if (daysRemaining !== null) {
          if (daysRemaining <= 7) return `⚠️ Vence en ${daysRemaining} días`
          if (daysRemaining <= 30) return `🟡 Vence en ${daysRemaining} días`
          return `✅ Válido por ${daysRemaining} días más`
        }
        return '✅ Válido'
      case 'expired':
        if (daysRemaining !== null) {
          return `❌ Vencido hace ${Math.abs(daysRemaining)} días`
        }
        return '❌ Vencido'
      default: return '❓ Estado desconocido'
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">Análisis de Fechas Completado</h2>
              <p className="text-green-100">
                Permiso #{result.permit_info.permit_number} - {result.permit_info.permit_type}
              </p>
            </div>
            <div className="text-right">
              <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(result.date_info.status)}`}>
                {getStatusText(result.date_info.status, result.date_info.days_remaining)}
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
              Resumen de Fechas
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Detalles del Permiso
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Status Alert */}
              <div className={`p-4 rounded-lg border-l-4 ${
                result.date_info.status === 'valid' 
                  ? 'bg-green-50 border-green-400' 
                  : result.date_info.status === 'expired'
                  ? 'bg-red-50 border-red-400'
                  : 'bg-gray-50 border-gray-400'
              }`}>
                <div className="flex">
                  <div className="ml-3">
                    <h3 className={`text-sm font-medium ${
                      result.date_info.status === 'valid' 
                        ? 'text-green-800' 
                        : result.date_info.status === 'expired'
                        ? 'text-red-800'
                        : 'text-gray-800'
                    }`}>
                      {getStatusText(result.date_info.status, result.date_info.days_remaining)}
                    </h3>
                    {result.date_info.expiration_date && (
                      <p className={`mt-1 text-sm ${
                        result.date_info.status === 'valid' 
                          ? 'text-green-700' 
                          : result.date_info.status === 'expired'
                          ? 'text-red-700'
                          : 'text-gray-700'
                      }`}>
                        Fecha de vencimiento: {formatDate(result.date_info.expiration_date)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Date Information Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-3">📅 Fecha de Emisión</h3>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatDate(result.date_info.emission_date)}
                    </p>
                    {result.date_info.emission_date && (
                      <p className="text-sm text-blue-600 mt-1">
                        {result.date_info.emission_date}
                      </p>
                    )}
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-purple-800 mb-3">⏰ Días Autorizados</h3>
                    <p className="text-2xl font-bold text-purple-900">
                      {result.date_info.authorized_days !== null ? 
                        `${result.date_info.authorized_days} días` : 
                        'No especificado'
                      }
                    </p>
                    {result.date_info.authorized_days && (
                      <p className="text-sm text-purple-600 mt-1">
                        {result.date_info.authorized_days > 30 ? 
                          `Aproximadamente ${Math.round(result.date_info.authorized_days / 30)} meses` :
                          'Menos de un mes'
                        }
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-orange-800 mb-3">🎯 Fecha de Vencimiento</h3>
                    <p className="text-2xl font-bold text-orange-900">
                      {formatDate(result.date_info.expiration_date)}
                    </p>
                    {result.date_info.expiration_date && (
                      <p className="text-sm text-orange-600 mt-1">
                        {result.date_info.expiration_date}
                      </p>
                    )}
                  </div>

                  <div className={`p-4 rounded-lg ${
                    result.date_info.status === 'valid' ? 'bg-green-50' :
                    result.date_info.status === 'expired' ? 'bg-red-50' : 'bg-gray-50'
                  }`}>
                    <h3 className={`font-semibold mb-3 ${
                      result.date_info.status === 'valid' ? 'text-green-800' :
                      result.date_info.status === 'expired' ? 'text-red-800' : 'text-gray-800'
                    }`}>
                      📊 Estado Actual
                    </h3>
                    <p className={`text-2xl font-bold ${
                      result.date_info.status === 'valid' ? 'text-green-900' :
                      result.date_info.status === 'expired' ? 'text-red-900' : 'text-gray-900'
                    }`}>
                      {result.date_info.days_remaining !== null ? 
                        `${result.date_info.days_remaining} días` : 
                        'Calculando...'
                      }
                    </p>
                    <p className={`text-sm mt-1 ${
                      result.date_info.status === 'valid' ? 'text-green-600' :
                      result.date_info.status === 'expired' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {result.date_info.days_remaining !== null ? 
                        (result.date_info.days_remaining >= 0 ? 'restantes' : 'vencido') :
                        'desde hoy'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-4">Información del Permiso</h4>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Número de Permiso</label>
                      <p className="font-mono text-lg text-gray-900">{result.permit_info.permit_number}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Tipo de Permiso</label>
                      <p className="text-gray-900">{result.permit_info.permit_type || 'No especificado'}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Autoridad Emisora</label>
                      <p className="text-gray-900">{result.permit_info.authority || 'No especificado'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Estado del Permiso</label>
                      <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(result.date_info.status)}`}>
                        {result.date_info.status === 'valid' ? 'Válido' : 
                         result.date_info.status === 'expired' ? 'Vencido' : 'Desconocido'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Visual */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-4">Línea de Tiempo del Permiso</h4>
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <div className="w-4 h-4 bg-blue-500 rounded-full mx-auto mb-2"></div>
                      <p className="text-xs font-medium text-gray-600">Emisión</p>
                      <p className="text-sm text-gray-800">{formatDate(result.date_info.emission_date)}</p>
                    </div>
                    <div className="flex-1 h-1 bg-gradient-to-r from-blue-500 to-orange-500 mx-4"></div>
                    <div className="text-center">
                      <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${
                        result.date_info.status === 'expired' ? 'bg-red-500' : 'bg-orange-500'
                      }`}></div>
                      <p className="text-xs font-medium text-gray-600">Vencimiento</p>
                      <p className="text-sm text-gray-800">{formatDate(result.date_info.expiration_date)}</p>
                    </div>
                  </div>
                  {/* Today indicator */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full border-2 border-white"></div>
                    <p className="text-xs text-center text-yellow-600 mt-1">Hoy</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
          <button
            onClick={onNewAnalysis}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Nuevo Análisis
          </button>
          
          <div className="flex space-x-3">
            <button className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
              Copiar Fechas
            </button>
            <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
              Exportar Reporte
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DateAnalysis