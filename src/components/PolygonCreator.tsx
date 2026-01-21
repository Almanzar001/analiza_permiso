import { useState } from 'react'
import FileUpload from './FileUpload'
import AIService from '../services/aiService'
import type { PolygonData } from '../types'
import type { PolygonAnalysisResponse } from '../services/aiService'

interface PolygonCreatorProps {
  onPolygonCreate: (polygonData: PolygonData) => void
}

const PolygonCreator = ({ onPolygonCreate }: PolygonCreatorProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const selectedModel = 'openai/gpt-4o'

  const handleFileAnalysis = async (files: File[]) => {
    setIsAnalyzing(true)
    try {
      const aiService = new AIService()
      
      console.log('Analizando archivo para polígono:', files[0].name)
      const response: PolygonAnalysisResponse = await aiService.analyzePolygonDocument(files[0], selectedModel)
      
      // Convert to PolygonData format
      const polygonData: PolygonData = {
        points: response.polygon_points
      }
      
      onPolygonCreate(polygonData)
    } catch (error) {
      console.error('Error analyzing polygon file:', error)
      
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
        } else if (error.message.includes('No se encontraron suficientes coordenadas')) {
          suggestions.push('❌ No se encontraron suficientes coordenadas para crear un polígono')
          suggestions.push('💡 Asegúrate que el documento contenga múltiples coordenadas UTM (mínimo 3)')
          suggestions.push('💡 Busca secciones como "vértices del polígono" o "coordenadas del área"')
          suggestions.push('💡 Verifica que la imagen sea clara y legible')
        } else if (error.message.includes('Invalid JSON')) {
          suggestions.push('❌ La IA no devolvió un formato válido')
          suggestions.push('💡 Intenta con una imagen más clara del área de coordenadas')
          suggestions.push('💡 Verifica que el documento contenga una tabla o lista de coordenadas')
        } else if (error.message.includes('El documento no se puede leer claramente')) {
          suggestions.push('❌ Documento no legible')
          suggestions.push('💡 Mejora la calidad de la imagen (mayor resolución)')
          suggestions.push('💡 Asegúrate que el texto esté bien enfocado')
          suggestions.push('💡 Verifica que haya buena iluminación')
          suggestions.push('💡 La sección de coordenadas debe estar clara y visible')
        } else if (error.message.includes('extracting content')) {
          suggestions.push('❌ Error procesando el archivo')
          suggestions.push('💡 Verifica que sea un JPG, PNG, WEBP o PDF válido')
          suggestions.push('💡 Asegúrate que el archivo no esté corrupto')
        }
      }
      
      const suggestionText = suggestions.length > 0 ? '\n\n' + suggestions.join('\n') : ''
      
      alert(`Error analizando las coordenadas del polígono: ${errorMessage}${suggestionText}
      
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


  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Crear Polígono desde Permiso
        </h2>
        <p className="text-gray-600 mb-6">
          Sube una imagen del permiso que contenga múltiples coordenadas UTM de los vértices del polígono
        </p>
      </div>
      
      <FileUpload 
        onFileSelect={handleFileAnalysis}
        isAnalyzing={isAnalyzing}
      />

      {/* Información sobre qué buscar */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">🔍 ¿Qué debe contener el documento?</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Tabla o lista con múltiples coordenadas UTM (mínimo 3 puntos)</li>
          <li>• Secciones como "Vértices del polígono", "Coordenadas del área", "Puntos límite"</li>
          <li>• Coordenadas en formato: X: 530478, Y: 2042873</li>
          <li>• Para República Dominicana: X (300000-800000), Y (1900000-2200000)</li>
          <li>• Zona UTM típicamente 19N, 19Q o 20N</li>
        </ul>
      </div>

      {/* Ejemplo visual */}
      <div className="bg-green-50 rounded-lg p-4">
        <h4 className="font-medium text-green-800 mb-2">✅ Ejemplo de coordenadas buscadas:</h4>
        <div className="text-sm text-green-700 font-mono bg-white p-3 rounded border">
          <div>COORDENADAS DE LOS VÉRTICES:</div>
          <div>Punto 1: X=530478, Y=2042873</div>
          <div>Punto 2: X=530650, Y=2042871</div>
          <div>Punto 3: X=530890, Y=2043100</div>
          <div>Punto 4: X=530720, Y=2043250</div>
        </div>
      </div>
    </div>
  )
}

export default PolygonCreator