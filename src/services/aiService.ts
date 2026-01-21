interface PermitAnalysisResponse {
  location: {
    utm_coordinates: { x: number; y: number; zone: string }
    geographic_coordinates: { lat: number; lng: number }
    polygon_center: { lat: number; lng: number }
    all_points?: Array<{ x: number; y: number }>
  }
  permit_info: {
    permit_number: string
    permit_type: string
    authority: string
  }
}

interface PolygonAnalysisResponse {
  polygon_points: Array<{ x: number; y: number; zone: string; label?: string }>
  permit_info: {
    permit_number: string
    permit_type: string
    authority: string
  }
}

interface ModelOption {
  id: string
  name: string
  description: string
  pricing: {
    prompt: number
    completion: number
  }
}

class AIService {
  private apiKey: string | null = null
  private baseURL = 'https://openrouter.ai/api/v1'

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || null
  }

  // Available models on OpenRouter for document analysis
  getAvailableModels(): ModelOption[] {
    return [
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4o (Recommended)',
        description: 'Best balance of cost/performance. Excellent OCR and document understanding',
        pricing: { prompt: 2.5, completion: 10 }
      },
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        description: 'Excellent for document analysis and structured data extraction',
        pricing: { prompt: 3, completion: 15 }
      },
      {
        id: 'google/gemini-2.0-flash-exp:free',
        name: 'Gemini 2.0 Flash (Free)',
        description: 'Free but may have rate limits during peak times',
        pricing: { prompt: 0, completion: 0 }
      },
      {
        id: 'anthropic/claude-3-opus',
        name: 'Claude 3 Opus',
        description: 'Most capable for complex documents (expensive)',
        pricing: { prompt: 15, completion: 75 }
      }
    ]
  }

  async analyzePermitDocument(file: File, selectedModel = 'openai/gpt-4o'): Promise<PermitAnalysisResponse> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured')
    }

    let content: any
    
    try {
      if (file.type === 'application/pdf') {
        content = await this.extractPDFText(file)
      } else {
        content = await this.extractImageContent(file)
      }
    } catch (error) {
      console.error('Error extracting content:', error)
      throw new Error('Error extracting content from file')
    }

    const messages = this.createAnalysisMessages(content, file.type)

    console.log('🚀 Enviando request a OpenRouter...')
    console.log('Model:', selectedModel)
    console.log('API Key presente:', !!this.apiKey)
    
    try {
      const requestBody = {
        model: selectedModel,
        messages,
        temperature: 0.05,
        max_tokens: 1500,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      }
      
      console.log('Request body:', JSON.stringify(requestBody, null, 2))
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Analiza Permiso App'
        },
        body: JSON.stringify(requestBody)
      })
      
      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('OpenRouter error response:', errorText)
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('Full OpenRouter response:', data)
      
      const result = data.choices?.[0]?.message?.content

      if (!result) {
        console.error('No content in response. Full data:', data)
        throw new Error('No response from AI service')
      }

      // Debug logging
      console.log('AI Raw Response:', result)

      try {
        // Clean the response - remove markdown formatting if present
        let cleanResult = result.trim()
        
        // Remove ```json and ``` wrappers if present
        if (cleanResult.startsWith('```json')) {
          cleanResult = cleanResult.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        } else if (cleanResult.startsWith('```')) {
          cleanResult = cleanResult.replace(/^```\s*/, '').replace(/\s*```$/, '')
        }
        
        console.log('Cleaned result:', cleanResult)
        
        const parsedResult = JSON.parse(cleanResult) as PermitAnalysisResponse
        console.log('AI Parsed Result:', parsedResult)
        
        // Validate that coordinates were found
        const hasUTMCoords = parsedResult.location.utm_coordinates.x && parsedResult.location.utm_coordinates.y
        const hasGeoCoords = parsedResult.location.geographic_coordinates.lat && parsedResult.location.geographic_coordinates.lng
        
        if (!hasUTMCoords && !hasGeoCoords) {
          console.warn('⚠️ No se encontraron coordenadas en el documento')
          throw new Error('No se pudieron encontrar coordenadas en el documento. Verifica que sea un permiso ambiental con coordenadas UTM o geográficas visibles.')
        }
        
        // Log específico para coordenadas
        console.log('📍 COORDENADAS DETECTADAS POR IA:')
        console.log('  - UTM X:', parsedResult.location.utm_coordinates.x)
        console.log('  - UTM Y:', parsedResult.location.utm_coordinates.y)
        console.log('  - Zona UTM:', parsedResult.location.utm_coordinates.zone)
        console.log('  - Geográficas:', parsedResult.location.geographic_coordinates)
        console.log('  - Todos los puntos:', parsedResult.location.all_points)
        
        return parsedResult
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError)
        console.error('Raw result that failed to parse:', result)
        
        // Check if the AI response indicates it couldn't read the document
        if (result.toLowerCase().includes('no puedo leer') || 
            result.toLowerCase().includes('no se puede leer') ||
            result.toLowerCase().includes('imagen no clara') ||
            result.toLowerCase().includes('documento ilegible')) {
          throw new Error('El documento no se puede leer claramente. Verifica que la imagen sea nítida, bien iluminada y que el texto sea legible.')
        }
        
        throw new Error('La IA no pudo procesar el documento correctamente. Verifica que sea un permiso ambiental válido con la información requerida.')
      }
    } catch (error) {
      console.error('Error calling OpenRouter:', error)
      throw new Error('Error analyzing document with AI')
    }
  }

  async analyzeMultipleFilesSeparately(files: File[], selectedModel = 'openai/gpt-4o'): Promise<PermitAnalysisResponse> {
    console.log('📋 Analizando cada archivo por separado...')
    
    const results: PermitAnalysisResponse[] = []
    
    // Analizar cada archivo individualmente
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      console.log(`🔍 Analizando archivo ${i + 1}/${files.length}: ${file.name}`)
      
      try {
        const result = await this.analyzePermitDocument(file, selectedModel)
        results.push(result)
        console.log(`✅ Archivo ${i + 1} analizado exitosamente`)
      } catch (error) {
        console.warn(`⚠️ Error analizando archivo ${i + 1}: ${error}`)
        // Continuar con los otros archivos
      }
    }
    
    if (results.length === 0) {
      throw new Error('No se pudo analizar ningún archivo')
    }
    
    console.log('🔄 Combinando resultados de', results.length, 'archivos')
    
    // Combinar los resultados de todos los archivos
    return this.combineAnalysisResults(results)
  }

  private combineAnalysisResults(results: PermitAnalysisResponse[]): PermitAnalysisResponse {
    // Usar el primer resultado como base y completar con información de otros archivos
    const combined = { ...results[0] }
    
    // Buscar la información más completa en todos los resultados
    for (const result of results) {
      // Coordenadas - priorizar las que no sean null
      if (!combined.location.utm_coordinates.x && result.location.utm_coordinates.x) {
        combined.location.utm_coordinates = result.location.utm_coordinates
      }
      if (!combined.location.geographic_coordinates.lat && result.location.geographic_coordinates.lat) {
        combined.location.geographic_coordinates = result.location.geographic_coordinates
        combined.location.polygon_center = result.location.polygon_center
      }
      
      // Combinar todos los puntos de coordenadas
      if (result.location.all_points && result.location.all_points.length > 0) {
        if (!combined.location.all_points) {
          combined.location.all_points = []
        }
        combined.location.all_points = [...combined.location.all_points, ...result.location.all_points]
      }
      
      // Información del permiso - priorizar las que no sean null
      if (!combined.permit_info.permit_number && result.permit_info.permit_number) {
        combined.permit_info.permit_number = result.permit_info.permit_number
      }
      if (!combined.permit_info.permit_type && result.permit_info.permit_type) {
        combined.permit_info.permit_type = result.permit_info.permit_type
      }
      if (!combined.permit_info.authority && result.permit_info.authority) {
        combined.permit_info.authority = result.permit_info.authority
      }
    }
    
    console.log('✅ Resultados combinados:', combined)
    return combined
  }

  async analyzeMultipleFiles(files: File[], selectedModel = 'openai/gpt-4o'): Promise<PermitAnalysisResponse> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured')
    }

    // Process all files and create a comprehensive message
    const fileContents: Array<{content: string, type: string, name: string}> = []
    
    try {
      for (const file of files) {
        let content: string
        if (file.type === 'application/pdf') {
          content = await this.extractPDFText(file)
        } else {
          content = await this.extractImageContent(file)
        }
        fileContents.push({
          content,
          type: file.type,
          name: file.name
        })
      }
    } catch (error) {
      console.error('Error extracting content from files:', error)
      throw new Error('Error extracting content from files')
    }

    const messages = this.createMultipleFilesAnalysisMessages(fileContents)

    console.log('🚀 Enviando request a OpenRouter (múltiples archivos)...')
    console.log('Model:', selectedModel)
    console.log('API Key presente:', !!this.apiKey)
    console.log('Number of files:', fileContents.length)
    
    try {
      const requestBody = {
        model: selectedModel,
        messages,
        temperature: 0.05,
        max_tokens: 2000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      }
      
      console.log('Request body (múltiples archivos):', JSON.stringify(requestBody, null, 2))
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Analiza Permiso App'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          temperature: 0.05,
          max_tokens: 2000,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        })
      })

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`)
      }

      const data = await response.json()
      const result = data.choices?.[0]?.message?.content

      if (!result) {
        throw new Error('No response from AI service')
      }

      // Debug logging for multiple files
      console.log('AI Raw Response (Multiple Files):', result)

      try {
        // Clean the response - remove markdown formatting if present
        let cleanResult = result.trim()
        
        // Remove ```json and ``` wrappers if present
        if (cleanResult.startsWith('```json')) {
          cleanResult = cleanResult.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        } else if (cleanResult.startsWith('```')) {
          cleanResult = cleanResult.replace(/^```\s*/, '').replace(/\s*```$/, '')
        }
        
        console.log('Cleaned result (Multiple Files):', cleanResult)
        
        const parsedResult = JSON.parse(cleanResult) as PermitAnalysisResponse
        console.log('AI Parsed Result (Multiple Files):', parsedResult)
        return parsedResult
      } catch (parseError) {
        console.error('JSON Parse Error (Multiple Files):', parseError)
        console.error('Raw result that failed to parse:', result)
        throw new Error('Invalid JSON response from AI service')
      }
    } catch (error) {
      console.error('Error calling OpenRouter:', error)
      throw new Error('Error analyzing documents with AI')
    }
  }

  private async extractPDFText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
          resolve(base64)
        } catch (error) {
          reject(error)
        }
      }
      reader.readAsArrayBuffer(file)
    })
  }

  private async extractImageContent(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target?.result as string
        const base64Data = base64.split(',')[1] // Remove data:image/...;base64, prefix
        resolve(base64Data)
      }
      reader.readAsDataURL(file)
    })
  }

  private createAnalysisMessages(content: string, fileType: string): any[] {
    const systemPrompt = `Eres un EXPERTO EN CARTOGRAFÍA especializado en extraer coordenadas exactas de permisos ambientales de República Dominicana.

🎯 MISIÓN: Extraer coordenadas EXACTAS (sin aproximar ni modificar dígitos)

📍 FORMATOS DE COORDENADAS A BUSCAR (en orden de prioridad):

1️⃣ FORMATO COMPACTO (MUY COMÚN en certificados oficiales):
   Patrón: [ZONA][X]UTM[Y] separados por guiones
   Ejemplo: "19Q561063UTM2066147-19Q561047UTM2066132-19Q561019UTM2066142"

   Cómo leerlo:
   - 19Q = Zona UTM
   - 561063 = X (ESTE) - 6 dígitos
   - UTM = separador literal (ignorar)
   - 2066147 = Y (NORTE) - 7 dígitos

   Busca texto como: "En las Coordenadas:" seguido de este patrón

2️⃣ TABLAS TRADICIONALES:
   - Columnas: "X" e "Y" o "ESTE" y "NORTE"
   - Formato clásico: X: 530478, Y: 2042873

3️⃣ COORDENADAS GEOGRÁFICAS (alternativa):
   - Latitud: 17.0° a 20.0°
   - Longitud: -72.0° a -68.0°
   - Formatos: 18.123456 o 18°12'34.5"

📏 RANGOS VÁLIDOS para República Dominicana:
- X (ESTE): 300,000-800,000 (6-7 dígitos)
- Y (NORTE): 1,900,000-2,200,000 (6-7 dígitos)
- Zona: "19Q", "19N", "20N"

🔍 ESTRATEGIA:
1. Busca PRIMERO el formato compacto [ZONA][X]UTM[Y]
2. Si no encuentras, busca tablas tradicionales
3. Extrae números EXACTOS sin modificar
4. Primer punto → utm_coordinates principal
5. Puntos adicionales → all_points[]
6. Sin coordenadas → marca null

⚠️ CRÍTICO:
- Copia números tal cual aparecen
- NO agregues ni quites dígitos
- Si hay múltiples puntos en formato compacto, sepáralos por los guiones

📋 INFORMACIÓN DEL PERMISO:
- Número de permiso/resolución/oficio
- Tipo (Licencia, Autorización, etc.)
- Autoridad (MARENA, Ministerio, etc.)

RESPONDE SOLO JSON (sin markdown):
{
  "location": {
    "utm_coordinates": { "x": 561063, "y": 2066147, "zone": "19Q" },
    "geographic_coordinates": { "lat": null, "lng": null },
    "polygon_center": { "lat": null, "lng": null },
    "all_points": [
      { "x": 561063, "y": 2066147 },
      { "x": 561047, "y": 2066132 }
    ]
  },
  "permit_info": {
    "permit_number": "MA-E-RG-MA-001",
    "permit_type": "Certificado de Registro de Impacto Mínimo",
    "authority": "Ministerio de Medio Ambiente"
  }
}

FORMATO: Números directos (no arrays), null directo, strings sin corchetes`

    if (fileType === 'application/pdf') {
      return [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Analiza este documento PDF de permiso ambiental (en base64): ${content}` 
        }
      ]
    } else {
      return [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: [
            {
              type: 'text',
              text: 'Analiza esta imagen de permiso ambiental y extrae la información requerida:'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${fileType};base64,${content}`,
                detail: 'high'
              }
            }
          ]
        }
      ]
    }
  }

  private createMultipleFilesAnalysisMessages(fileContents: Array<{content: string, type: string, name: string}>): any[] {
    const systemPrompt = `Eres un experto en análisis de permisos ambientales de República Dominicana con MÚLTIPLES PÁGINAS/ARCHIVOS del mismo permiso.

🎯 MISIÓN: Consolidar información de todas las páginas en un solo resultado

📄 ANÁLISIS MULTÍPÁGINA (revisa TODAS las páginas):

1️⃣ COORDENADAS:
   - UTM: X (300,000-800,000), Y (1,900,000-2,200,000), Zona (19Q/19N/20N)
   - Geográficas: Lat (17.5-20.0), Lng (-72.0 a -68.0)
   - Prioriza coordenadas del área principal del proyecto
   - Usa la información más completa/precisa entre páginas

2️⃣ FECHAS:
   - Emisión: Busca fecha en firma digital con QR (pie de página)
   - Días autorizados: "VÁLIDO POR X DÍAS", "plazo de X días"
   - Conversión: "6 meses" → 180 días, "1 año" → 365 días
   - Si hay contradicciones → usa la más reciente

3️⃣ INFORMACIÓN DEL PERMISO:
   - Número: oficio/resolución/permiso
   - Tipo: Licencia/Autorización Ambiental
   - Autoridad: MARENA, Ministerio de Medio Ambiente

🔍 ESTRATEGIA DE CONSOLIDACIÓN:
- Combina información complementaria entre páginas
- Si hay duplicados → prioriza el más completo
- Si hay contradicciones → usa el valor más específico
- Busca fechas en diferentes páginas (pueden estar separadas)

⚠️ VALIDACIÓN CRÍTICA:
- Verifica que coordenadas estén en rangos válidos para RD
- Calcula: fecha_vencimiento = fecha_emisión + días_autorizados
- Si falta información clave → marca null

RESPONDE SOLO JSON (sin markdown):
{
  "location": {
    "utm_coordinates": { "x": 530478, "y": 2042873, "zone": "19Q" },
    "geographic_coordinates": { "lat": 18.123456, "lng": -69.123456 },
    "polygon_center": { "lat": 18.123456, "lng": -69.123456 }
  },
  "dates": {
    "emission_date": "2025-01-07",
    "authorized_days": 90,
    "expiration_date": "2025-04-07"
  },
  "permit_info": {
    "permit_number": "342-2025",
    "permit_type": "Autorización Ambiental",
    "authority": "MARENA"
  }
}

PRIORIDAD: Precisión en fechas (crítico para vigencia del permiso)`

    const userContent: any[] = [
      {
        type: 'text',
        text: `Analiza las siguientes ${fileContents.length} páginas/archivos del mismo permiso ambiental y consolida la información:`
      }
    ]

    // Add each file content
    fileContents.forEach((file, index) => {
      if (file.type === 'application/pdf') {
        userContent.push({
          type: 'text',
          text: `\n\n--- ARCHIVO ${index + 1}: ${file.name} (PDF) ---\nContenido en base64: ${file.content.substring(0, 1000)}...`
        })
      } else {
        userContent.push({
          type: 'text',
          text: `\n\n--- ARCHIVO ${index + 1}: ${file.name} (Imagen) ---`
        })
        userContent.push({
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${file.content}`,
            detail: 'high'
          }
        })
      }
    })

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ]
  }

  async analyzeDateDocument(file: File, selectedModel = 'openai/gpt-4o'): Promise<DateAnalysisResponse> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured')
    }

    let content: any
    
    try {
      if (file.type === 'application/pdf') {
        content = await this.extractPDFText(file)
      } else {
        content = await this.extractImageContent(file)
      }
    } catch (error) {
      console.error('Error extracting content:', error)
      throw new Error('Error extracting content from file')
    }

    const messages = this.createDateAnalysisMessages(content, file.type)

    console.log('🚀 Enviando request para análisis de fechas a OpenRouter...')
    console.log('Model:', selectedModel)
    console.log('API Key presente:', !!this.apiKey)
    
    try {
      const requestBody = {
        model: selectedModel,
        messages,
        temperature: 0.05,
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      }
      
      console.log('Request body (fechas):', JSON.stringify(requestBody, null, 2))
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Analiza Permiso App'
        },
        body: JSON.stringify(requestBody)
      })
      
      console.log('Response status (fechas):', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('OpenRouter error response (fechas):', errorText)
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('Full OpenRouter response (fechas):', data)
      
      const result = data.choices?.[0]?.message?.content

      if (!result) {
        console.error('No content in response. Full data:', data)
        throw new Error('No response from AI service')
      }

      console.log('AI Raw Response (fechas):', result)

      try {
        // Clean the response - remove markdown formatting if present
        let cleanResult = result.trim()
        
        if (cleanResult.startsWith('```json')) {
          cleanResult = cleanResult.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        } else if (cleanResult.startsWith('```')) {
          cleanResult = cleanResult.replace(/^```\s*/, '').replace(/\s*```$/, '')
        }
        
        console.log('Cleaned result (fechas):', cleanResult)
        
        const parsedResult = JSON.parse(cleanResult) as DateAnalysisResponse
        
        // Validate that dates were found
        if (!parsedResult.date_info.emission_date && !parsedResult.date_info.authorized_days) {
          console.warn('⚠️ No se encontraron fechas ni días autorizados en el documento')
          throw new Error('No se pudieron encontrar fechas de emisión o días autorizados en el documento. Verifica que sea un permiso ambiental con fecha en la firma digital y días autorizados visibles.')
        }
        
        if (!parsedResult.date_info.emission_date) {
          console.warn('⚠️ No se encontró fecha de emisión en la firma digital')
          throw new Error('No se pudo encontrar la fecha de emisión en la zona de firma digital con código QR. Verifica que la imagen incluya el pie de página completo.')
        }
        
        if (!parsedResult.date_info.authorized_days) {
          console.warn('⚠️ No se encontraron días autorizados en el documento')
          throw new Error('No se pudo encontrar la frase "VÁLIDO POR X DÍAS" en el documento. Verifica que sea un permiso con días autorizados especificados.')
        }
        
        // Calculate additional date fields
        const today = new Date()
        
        if (parsedResult.date_info.emission_date && parsedResult.date_info.authorized_days) {
          // Calculate expiration date
          const emissionDate = new Date(parsedResult.date_info.emission_date)
          const expirationDate = new Date(emissionDate.getTime() + parsedResult.date_info.authorized_days * 24 * 60 * 60 * 1000)
          parsedResult.date_info.expiration_date = expirationDate.toISOString().split('T')[0]
          
          // Calculate days remaining
          const timeDiff = expirationDate.getTime() - today.getTime()
          parsedResult.date_info.days_remaining = Math.ceil(timeDiff / (1000 * 3600 * 24))
          
          // Determine status
          parsedResult.date_info.is_expired = parsedResult.date_info.days_remaining < 0
          parsedResult.date_info.status = parsedResult.date_info.days_remaining < 0 ? 'expired' : 'valid'
        } else {
          parsedResult.date_info.is_expired = false
          parsedResult.date_info.status = 'unknown'
        }
        
        console.log('AI Parsed Result (fechas):', parsedResult)
        
        // Log específico para fechas
        console.log('📅 FECHAS DETECTADAS POR IA:')
        console.log('  - Fecha emisión:', parsedResult.date_info.emission_date)
        console.log('  - Días autorizados:', parsedResult.date_info.authorized_days)
        console.log('  - Fecha vencimiento:', parsedResult.date_info.expiration_date)
        console.log('  - Días restantes:', parsedResult.date_info.days_remaining)
        console.log('  - Estado:', parsedResult.date_info.status)
        
        return parsedResult
      } catch (parseError) {
        console.error('JSON Parse Error (fechas):', parseError)
        console.error('Raw result that failed to parse:', result)
        
        // Check if the AI response indicates it couldn't read the document
        if (result.toLowerCase().includes('no puedo leer') || 
            result.toLowerCase().includes('no se puede leer') ||
            result.toLowerCase().includes('imagen no clara') ||
            result.toLowerCase().includes('documento ilegible')) {
          throw new Error('El documento no se puede leer claramente. Verifica que la imagen sea nítida, bien iluminada y que el texto sea legible.')
        }
        
        throw new Error('La IA no pudo procesar las fechas del documento correctamente. Verifica que sea un permiso ambiental válido con fechas visibles.')
      }
    } catch (error) {
      console.error('Error calling OpenRouter (fechas):', error)
      throw new Error('Error analyzing document dates with AI')
    }
  }

  private createDateAnalysisMessages(content: string, fileType: string): any[] {
    const systemPrompt = `Eres un EXPERTO EN ANÁLISIS DE DOCUMENTOS para permisos ambientales de República Dominicana.

🎯 MISIÓN: Extraer fecha de emisión y días autorizados con precisión

📅 FECHA DE EMISIÓN - UBICACIÓN ÚNICA:
⚠️ SOLO ES VÁLIDA la fecha en el PIE DE PÁGINA junto al código QR de firma digital
❌ IGNORAR: Fechas en cabecera, cuerpo, o cualquier otro lugar del documento

🔍 PROCESO DE EXTRACCIÓN:
1. Ve directamente al PIE DE PÁGINA (sección final)
2. Localiza el código QR de firma/autenticación digital
3. Extrae la fecha que está JUNTO/CERCA del QR
4. Esa es la única fecha válida

📋 FORMATOS DE FECHA ACEPTADOS (junto al QR):
- "17/07/2025" (DD/MM/YYYY) → convertir a "2025-07-17"
- "7 de enero de 2025" → convertir a "2025-01-07"
- "07-01-2025" (DD-MM-YYYY) → convertir a "2025-01-07"

⚠️ CONVERSIÓN CRÍTICA:
DD/MM/YYYY → YYYY-MM-DD
Ejemplo: 17/07/2025 → 2025-07-17 (julio, no enero)

📆 DÍAS AUTORIZADOS - Frases exactas a buscar:
- "VÁLIDO POR X DÍAS" o "VÁLIDO POR X (X) DÍAS"
- "plazo de X días" o "vigencia de X días"
- "autorizado por X días naturales/hábiles"

Ejemplos:
- "VÁLIDO POR 90 DÍAS" → 90
- "VÁLIDO POR NOVENTA (90) DÍAS" → 90
- "plazo de 60 días naturales" → 60

🎯 CASOS ESPECIALES:
- Número entre paréntesis: usa el número, no el texto
- "días hábiles" vs "días naturales": extrae el número tal cual
- Si no encuentras → null

📋 INFORMACIÓN DEL PERMISO:
- Número de permiso/resolución/oficio
- Tipo (Licencia, Autorización, etc.)
- Autoridad (MARENA, Ministerio, etc.)

✅ VALIDACIÓN DE UBICACIÓN:
- ✅ Fecha cerca de código QR = CORRECTA
- ❌ Fecha en cualquier otro lugar = INCORRECTA

RESPONDE SOLO JSON (sin markdown):
{
  "date_info": {
    "emission_date": "2025-01-07",
    "authorized_days": 90,
    "expiration_date": null,
    "days_remaining": null,
    "is_expired": false,
    "status": "unknown"
  },
  "permit_info": {
    "permit_number": "342-2025",
    "permit_type": "Autorización Ambiental",
    "authority": "MARENA"
  }
}

FORMATO: Fechas YYYY-MM-DD, números directos (no strings para days), null para campos calculados`

    if (fileType === 'application/pdf') {
      return [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Analiza este documento PDF de permiso ambiental y extrae las fechas (en base64): ${content}` 
        }
      ]
    } else {
      return [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: [
            {
              type: 'text',
              text: 'Analiza esta imagen de permiso ambiental y extrae las fechas de emisión y días autorizados:'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${fileType};base64,${content}`,
                detail: 'high'
              }
            }
          ]
        }
      ]
    }
  }

  async analyzePolygonDocument(file: File, selectedModel = 'openai/gpt-4o'): Promise<PolygonAnalysisResponse> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured')
    }

    let content: any
    
    try {
      if (file.type === 'application/pdf') {
        content = await this.extractPDFText(file)
      } else {
        content = await this.extractImageContent(file)
      }
    } catch (error) {
      console.error('Error extracting content:', error)
      throw new Error('Error extracting content from file')
    }

    const messages = this.createPolygonAnalysisMessages(content, file.type)

    console.log('🚀 Enviando request para análisis de polígono a OpenRouter...')
    console.log('Model:', selectedModel)
    console.log('API Key presente:', !!this.apiKey)
    
    try {
      const requestBody = {
        model: selectedModel,
        messages,
        temperature: 0.05,
        max_tokens: 1500,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      }
      
      console.log('Request body (polígono):', JSON.stringify(requestBody, null, 2))
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Analiza Permiso App'
        },
        body: JSON.stringify(requestBody)
      })
      
      console.log('Response status (polígono):', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('OpenRouter error response (polígono):', errorText)
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('Full OpenRouter response (polígono):', data)
      
      const result = data.choices?.[0]?.message?.content

      if (!result) {
        console.error('No content in response. Full data:', data)
        throw new Error('No response from AI service')
      }

      console.log('AI Raw Response (polígono):', result)

      try {
        // Clean the response - remove markdown formatting if present
        let cleanResult = result.trim()
        
        if (cleanResult.startsWith('```json')) {
          cleanResult = cleanResult.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        } else if (cleanResult.startsWith('```')) {
          cleanResult = cleanResult.replace(/^```\s*/, '').replace(/\s*```$/, '')
        }
        
        console.log('Cleaned result (polígono):', cleanResult)
        
        const parsedResult = JSON.parse(cleanResult) as PolygonAnalysisResponse
        
        // Validate that polygon points were found
        if (!parsedResult.polygon_points || parsedResult.polygon_points.length < 3) {
          console.warn('⚠️ No se encontraron suficientes puntos para crear un polígono')
          throw new Error('No se encontraron suficientes coordenadas para crear un polígono (mínimo 3 puntos). Verifica que el documento contenga múltiples coordenadas UTM de los vértices del área.')
        }
        
        console.log('AI Parsed Result (polígono):', parsedResult)
        
        // Log específico para puntos del polígono
        console.log('🗺️ PUNTOS DEL POLÍGONO DETECTADOS POR IA:')
        parsedResult.polygon_points.forEach((point, index) => {
          console.log(`  - Punto ${index + 1}: X=${point.x}, Y=${point.y}, Zona=${point.zone}, Label=${point.label}`)
        })
        
        return parsedResult
      } catch (parseError) {
        console.error('JSON Parse Error (polígono):', parseError)
        console.error('Raw result that failed to parse:', result)
        
        // Check if the AI response indicates it couldn't read the document
        if (result.toLowerCase().includes('no puedo leer') || 
            result.toLowerCase().includes('no se puede leer') ||
            result.toLowerCase().includes('imagen no clara') ||
            result.toLowerCase().includes('documento ilegible')) {
          throw new Error('El documento no se puede leer claramente. Verifica que la imagen sea nítida, bien iluminada y que el texto sea legible.')
        }
        
        throw new Error('La IA no pudo procesar las coordenadas del polígono correctamente. Verifica que sea un permiso ambiental válido con múltiples coordenadas UTM visibles.')
      }
    } catch (error) {
      console.error('Error calling OpenRouter (polígono):', error)
      throw new Error('Error analyzing polygon document with AI')
    }
  }

  private createPolygonAnalysisMessages(content: string, fileType: string): any[] {
    const systemPrompt = `Extract all coordinate points from this environmental permit to create a polygon.

COORDINATE FORMATS TO FIND:

1. COMPACT FORMAT (most common):
   Pattern: [ZONE][X]UTM[Y] separated by hyphens
   Example: "19Q561063UTM2066147-19Q561047UTM2066132-19Q561019UTM2066142"

   How to parse:
   - 19Q561063UTM2066147 = Point 1: X=561063, Y=2066147, Zone=19Q
   - Split by hyphens (-) to get each point

2. TABLE FORMAT:
   | Vertex | X (East) | Y (North) |
   | V1     | 530478   | 2042873   |

3. LIST FORMAT:
   Point 1: X=530478, Y=2042873

VALID RANGES (Dominican Republic):
- X (EAST): 300,000-800,000 (6-7 digits)
- Y (NORTH): 1,900,000-2,200,000 (6-7 digits)
- Zone: "19Q", "19N", "20N"

INSTRUCTIONS:
1. Extract ALL coordinate points in the order they appear
2. Minimum 3 points, maximum 20 points
3. Copy numbers exactly as shown
4. Assign sequential labels: "Vértice 1", "Vértice 2", etc.

RESPOND ONLY WITH JSON:
{
  "polygon_points": [
    { "x": 561063, "y": 2066147, "zone": "19Q", "label": "Vértice 1" },
    { "x": 561047, "y": 2066132, "zone": "19Q", "label": "Vértice 2" },
    { "x": 561019, "y": 2066142, "zone": "19Q", "label": "Vértice 3" }
  ],
  "permit_info": {
    "permit_number": "MA-E-RG-MA-001",
    "permit_type": "Certificado de Registro de Impacto Mínimo",
    "authority": "Ministerio de Medio Ambiente"
  }
}`

    if (fileType === 'application/pdf') {
      return [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Extract all coordinate points from this environmental permit document.`
        }
      ]
    } else {
      return [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all coordinate points from this environmental permit image to create a polygon.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${fileType};base64,${content}`,
                detail: 'high'
              }
            }
          ]
        }
      ]
    }
  }
}

// Add interface for date analysis
interface DateAnalysisResponse {
  date_info: {
    emission_date: string | null
    authorized_days: number | null
    expiration_date: string | null
    days_remaining: number | null
    is_expired: boolean
    status: 'valid' | 'expired' | 'unknown'
  }
  permit_info: {
    permit_number: string
    permit_type: string
    authority: string
  }
}

// Add interface for date analysis
interface DateAnalysisResponse {
  date_info: {
    emission_date: string | null
    authorized_days: number | null
    expiration_date: string | null
    days_remaining: number | null
    is_expired: boolean
    status: 'valid' | 'expired' | 'unknown'
  }
  permit_info: {
    permit_number: string
    permit_type: string
    authority: string
  }
}

export default AIService
export type { PermitAnalysisResponse, ModelOption, DateAnalysisResponse, PolygonAnalysisResponse }
