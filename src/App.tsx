import { useState } from 'react'
import FileUpload from './components/FileUpload'
import PermitAnalysis from './components/PermitAnalysis'
import DateAnalysis from './components/DateAnalysis'
import PolygonCreator from './components/PolygonCreator'
import PolygonMapView from './components/PolygonMapView'
import AIService from './services/aiService'
import CoordinateUtils from './utils/coordinateUtils'
import type { AnalysisResult, DateAnalysisResult, PolygonData } from './types'

type AnalysisType = 'location' | 'dates' | 'polygon'

function App() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [dateAnalysisResult, setDateAnalysisResult] = useState<DateAnalysisResult | null>(null)
  const [polygonData, setPolygonData] = useState<PolygonData | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisType, setAnalysisType] = useState<AnalysisType>('location')
  const selectedModel = 'meta-llama/llama-3.2-90b-vision-instruct'

  const handleFileAnalysis = async (files: File[]) => {
    setIsAnalyzing(true)
    try {
      const aiService = new AIService()
      
      // Single file analysis only
      console.log('Analizando archivo:', files[0].name)
      const response = await aiService.analyzePermitDocument(files[0], selectedModel)
      
      // Convert UTM to geographic coordinates if not provided by AI
      let geographic = response.location.geographic_coordinates
      let polygonCenter = response.location.polygon_center
      
      if ((geographic.lat === null || geographic.lng === null) && response.location.utm_coordinates.x && response.location.utm_coordinates.y) {
        console.log('🔄 Convirtiendo coordenadas UTM a geográficas...')
        try {
          geographic = CoordinateUtils.utmToGeographic(response.location.utm_coordinates)
          console.log('✅ Coordenadas convertidas:', geographic)
        } catch (error) {
          console.warn('⚠️ Error convirtiendo UTM a geográficas:', error)
        }
      }
      
      // Use geographic coordinates as polygon center if not provided
      if ((polygonCenter.lat === null || polygonCenter.lng === null) && geographic.lat !== null && geographic.lng !== null) {
        polygonCenter = { lat: geographic.lat, lng: geographic.lng }
      }

      const result: AnalysisResult = {
        location: {
          utm: response.location.utm_coordinates,
          geographic: geographic,
          polygon_center: polygonCenter,
          all_points: response.location.all_points
        },
        permit_info: response.permit_info
      }
      
      setAnalysisResult(result)
    } catch (error) {
      console.error('Error analyzing file(s):', error)
      
      let errorMessage = 'Error desconocido'
      let suggestions = []
      
      if (error instanceof Error) {
        errorMessage = error.message
        
        if (error.message.includes('API key not configured')) {
          suggestions.push('❌ Falta configurar la API Key de OpenRouter')
          suggestions.push('💡 Agrega VITE_OPENROUTER_API_KEY en un archivo .env')
        } else if (error.message.includes('OpenRouter API error')) {
          suggestions.push('❌ Error en la API de OpenRouter')
          suggestions.push('💡 Verifica tu API Key y saldo')
        } else if (error.message.includes('No se pudieron encontrar coordenadas')) {
          suggestions.push('❌ No se encontraron coordenadas en el documento')
          suggestions.push('💡 Asegúrate que el documento contenga coordenadas UTM o geográficas')
          suggestions.push('💡 Verifica que la imagen sea clara y legible')
          suggestions.push('💡 Revisa que sea un permiso ambiental válido')
        } else if (error.message.includes('Invalid JSON')) {
          suggestions.push('❌ La IA no devolvió un formato válido')
          suggestions.push('💡 Intenta con una imagen más clara')
          suggestions.push('💡 Verifica que el documento sea un permiso ambiental')
        } else if (error.message.includes('El documento no se puede leer claramente')) {
          suggestions.push('❌ Documento no legible')
          suggestions.push('💡 Mejora la calidad de la imagen (mayor resolución)')
          suggestions.push('💡 Asegúrate que el texto esté bien enfocado')
          suggestions.push('💡 Verifica que haya buena iluminación')
          suggestions.push('💡 Evita sombras o reflejos en el documento')
        } else if (error.message.includes('extracting content')) {
          suggestions.push('❌ Error procesando el archivo')
          suggestions.push('💡 Verifica que sea un JPG, PNG, WEBP o PDF válido')
          suggestions.push('💡 Asegúrate que el archivo no esté corrupto')
        }
      }
      
      const suggestionText = suggestions.length > 0 ? '\n\n' + suggestions.join('\n') : ''
      
      alert(`Error analizando el permiso: ${errorMessage}${suggestionText}
      
📋 Información técnica:
- Archivo: ${files[0]?.name || 'Desconocido'}  
- Tamaño: ${files[0] ? (files[0].size / 1024 / 1024).toFixed(2) + ' MB' : 'Desconocido'}
- Tipo: ${files[0]?.type || 'Desconocido'}

🔍 Para más detalles, abre la consola (F12 > Console)`)
      
      return
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDateAnalysis = async (files: File[]) => {
    setIsAnalyzing(true)
    try {
      const aiService = new AIService()
      
      console.log('Analizando fechas del archivo:', files[0].name)
      const response = await aiService.analyzeDateDocument(files[0], selectedModel)
      
      setDateAnalysisResult(response)
    } catch (error) {
      console.error('Error analyzing file dates:', error)
      
      let errorMessage = 'Error desconocido'
      let suggestions = []
      
      if (error instanceof Error) {
        errorMessage = error.message
        
        if (error.message.includes('API key not configured')) {
          suggestions.push('❌ Falta configurar la API Key de OpenRouter')
          suggestions.push('💡 Agrega VITE_OPENROUTER_API_KEY en un archivo .env')
        } else if (error.message.includes('OpenRouter API error')) {
          suggestions.push('❌ Error en la API de OpenRouter')
          suggestions.push('💡 Verifica tu API Key y saldo')
        } else if (error.message.includes('No se pudo encontrar la fecha de emisión')) {
          suggestions.push('❌ No se encontró la fecha en la firma digital')
          suggestions.push('💡 Asegúrate que la imagen incluya el PIE DE PÁGINA completo')
          suggestions.push('💡 Verifica que el código QR y la fecha estén visibles')
          suggestions.push('💡 La fecha debe estar en la zona de firma digital')
        } else if (error.message.includes('No se pudo encontrar la frase')) {
          suggestions.push('❌ No se encontró "VÁLIDO POR X DÍAS" en el documento')
          suggestions.push('💡 Asegúrate que el documento contenga días autorizados')
          suggestions.push('💡 Verifica que sea un permiso con validez temporal')
          suggestions.push('💡 La frase debe ser visible y clara en la imagen')
        } else if (error.message.includes('No se pudieron encontrar fechas')) {
          suggestions.push('❌ No se encontraron fechas ni días autorizados')
          suggestions.push('💡 Verifica que sea un permiso ambiental válido')
          suggestions.push('💡 Asegúrate que la imagen incluya toda la información')
          suggestions.push('💡 Revisa que el documento esté completo')
        } else if (error.message.includes('El documento no se puede leer claramente')) {
          suggestions.push('❌ Documento no legible')
          suggestions.push('💡 Mejora la calidad de la imagen (mayor resolución)')
          suggestions.push('💡 Asegúrate que el texto esté bien enfocado')
          suggestions.push('💡 Verifica que haya buena iluminación en el pie de página')
          suggestions.push('💡 La zona del código QR debe estar clara y visible')
        } else if (error.message.includes('Invalid JSON')) {
          suggestions.push('❌ La IA no devolvió un formato válido')
          suggestions.push('💡 Intenta con una imagen más clara de las fechas')
          suggestions.push('💡 Verifica que el documento sea legible')
        }
      }
      
      const suggestionText = suggestions.length > 0 ? '\n\n' + suggestions.join('\n') : ''
      
      alert(`Error analizando fechas del permiso: ${errorMessage}${suggestionText}
      
📋 Información técnica:
- Archivo: ${files[0]?.name || 'Desconocido'}  
- Tamaño: ${files[0] ? (files[0].size / 1024 / 1024).toFixed(2) + ' MB' : 'Desconocido'}
- Tipo: ${files[0]?.type || 'Desconocido'}

🔍 Para más detalles, abre la consola (F12 > Console)`)
      
      return
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handlePolygonCreate = (data: PolygonData) => {
    setPolygonData(data)
  }

  const handleNewPolygon = () => {
    setPolygonData(null)
  }

  const handleNewAnalysis = () => {
    setAnalysisResult(null)
    setDateAnalysisResult(null)
    setPolygonData(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Analiza Permiso SENPA
          </h1>
          <p className="text-gray-600 text-lg">
            Análisis automatizado de permisos ambientales
          </p>
        </header>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow-sm p-1 flex flex-wrap">
            <button
              onClick={() => setAnalysisType('location')}
              className={`px-4 py-3 rounded-md font-medium transition-colors ${
                analysisType === 'location'
                  ? 'bg-green-500 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📍 Análisis de Ubicación
            </button>
            <button
              onClick={() => setAnalysisType('dates')}
              className={`px-4 py-3 rounded-md font-medium transition-colors ${
                analysisType === 'dates'
                  ? 'bg-green-500 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📅 Análisis de Fechas
            </button>
            <button
              onClick={() => setAnalysisType('polygon')}
              className={`px-4 py-3 rounded-md font-medium transition-colors ${
                analysisType === 'polygon'
                  ? 'bg-green-500 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🗺️ Crear Polígono
            </button>
          </div>
        </div>

        {/* Location Analysis Section */}
        {analysisType === 'location' && (
          <>
            {!analysisResult ? (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                    Análisis de Coordenadas
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Sube una imagen del permiso que contenga coordenadas UTM o geográficas
                  </p>
                </div>
                <FileUpload 
                  onFileSelect={handleFileAnalysis}
                  isAnalyzing={isAnalyzing}
                />
              </div>
            ) : (
              <PermitAnalysis 
                result={analysisResult}
                onNewAnalysis={handleNewAnalysis}
              />
            )}
          </>
        )}

        {/* Date Analysis Section */}
        {analysisType === 'dates' && (
          <>
            {!dateAnalysisResult ? (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                    Análisis de Fechas
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Sube una imagen del permiso que contenga fecha de emisión y días autorizados
                  </p>
                </div>
                <FileUpload 
                  onFileSelect={handleDateAnalysis}
                  isAnalyzing={isAnalyzing}
                />
              </div>
            ) : (
              <DateAnalysis 
                result={dateAnalysisResult}
                onNewAnalysis={handleNewAnalysis}
              />
            )}
          </>
        )}

        {/* Polygon Creation Section */}
        {analysisType === 'polygon' && (
          <>
            {!polygonData ? (
              <PolygonCreator onPolygonCreate={handlePolygonCreate} />
            ) : (
              <PolygonMapView 
                polygonData={polygonData}
                onNewPolygon={handleNewPolygon}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default App