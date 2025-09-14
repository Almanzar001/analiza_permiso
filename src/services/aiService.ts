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
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        description: 'Excellent for document analysis and structured data extraction',
        pricing: { prompt: 3, completion: 15 }
      },
      {
        id: 'openai/gpt-4-vision-preview',
        name: 'GPT-4 Vision',
        description: 'Great for image and PDF analysis with vision capabilities',
        pricing: { prompt: 10, completion: 30 }
      },
      {
        id: 'google/gemini-pro-vision',
        name: 'Gemini Pro Vision',
        description: 'Google\'s multimodal model for text and image understanding',
        pricing: { prompt: 0.125, completion: 0.375 }
      },
      {
        id: 'meta-llama/llama-3.2-90b-vision-instruct',
        name: 'Llama 3.2 Vision',
        description: 'Open-source vision model with good document understanding',
        pricing: { prompt: 0.9, completion: 0.9 }
      }
    ]
  }

  async analyzePermitDocument(file: File, selectedModel = 'anthropic/claude-3.5-sonnet'): Promise<PermitAnalysisResponse> {
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
        temperature: 0.1,
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

  async analyzeMultipleFilesSeparately(files: File[], selectedModel = 'anthropic/claude-3.5-sonnet'): Promise<PermitAnalysisResponse> {
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

  async analyzeMultipleFiles(files: File[], selectedModel = 'anthropic/claude-3.5-sonnet'): Promise<PermitAnalysisResponse> {
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
        temperature: 0.1,
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
          temperature: 0.1,
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
    const systemPrompt = `Eres un EXPERTO EN CARTOGRAFÍA especializado en extraer coordenadas exactas de documentos oficiales de República Dominicana. 

🎯 **TU ÚNICA MISIÓN: ENCONTRAR COORDENADAS EXACTAS**

BUSCA ESPECÍFICAMENTE:

📍 **COORDENADAS UTM (PRIORIDAD MÁXIMA):**
- Busca TABLAS con columnas "X" e "Y" o "ESTE" y "NORTE"
- Busca números de 6-7 dígitos para X y Y
- Ejemplos típicos para República Dominicana:
  * X: 530478, Y: 2042873
  * X: 530650, Y: 2042871  
  * X: 345123, Y: 2123456
- Lee TODOS los números exactamente como aparecen
- NO aproximes ni cambies ningún dígito
- Busca múltiples puntos si están disponibles

📍 **COORDENADAS GEOGRÁFICAS (ALTERNATIVA):**
- Latitud: 17° a 20° (formato: 18.123456 o 18°12'34.5")
- Longitud: -68° a -72° (formato: -69.123456 o -69°12'34.5")
- Busca en cualquier parte del documento

📍 **ZONA UTM:**
- Para República Dominicana: "19Q", "19N", "20N"
- Busca texto como "Zona 19" o "UTM 19Q"

🔍 **ESTRATEGIA DE BÚSQUEDA:**
1. **ESCANEA** todo el documento buscando números grandes
2. **IDENTIFICA** tablas, mapas, o secciones técnicas
3. **EXTRAE** todos los puntos de coordenadas disponibles
4. **VERIFICA** que estén en rangos válidos para República Dominicana

⚠️ **CRÍTICO:**
- Copia los números EXACTAMENTE como aparecen
- NO redondees ni aproximes
- Si hay múltiples puntos, incluye el primero como principal
- Si no encuentras coordenadas, marca como null

RESPONDE SOLO CON JSON (sin explicaciones):
{
  "location": {
    "utm_coordinates": { "x": 530478, "y": 2042873, "zone": "19Q" },
    "geographic_coordinates": { "lat": null, "lng": null },
    "polygon_center": { "lat": null, "lng": null },
    "all_points": [
      { "x": 530478, "y": 2042873 },
      { "x": 530650, "y": 2042871 }
    ]
  },
  "permit_info": {
    "permit_number": "342",
    "permit_type": "Autorización para extracción",
    "authority": "MARENA"
  }
}

IMPORTANTE: 
- Números directos SIN corchetes: "x": 530478 (no "x": [530478])
- null directo SIN corchetes: "lat": null (no "lat": [null])
- Strings SIN corchetes: "zone": "19Q" (no "zone": "[19Q]")`

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
    const systemPrompt = `Eres un experto en análisis de permisos ambientales de República Dominicana. Tienes múltiples páginas/archivos del mismo permiso ambiental. Tu tarea es consolidar toda la información y extraer los datos requeridos en un formato JSON estructurado.

INFORMACIÓN CRÍTICA A EXTRAER (combinando todas las páginas):

1. **FECHAS (BUSCAR EN TODAS LAS PÁGINAS)**:
   - EMISIÓN: Busca "Santo Domingo de Guzmán, D.N." + fecha como "12 de junio de 2025"
   - AUTORIZACIÓN: Busca "Válido por noventa (90) días" o similar
   - El número entre paréntesis: (90) = 90 días
   - FORMATO: "DD de MONTH de YYYY" → YYYY-MM-DD

2. **COORDENADAS (REPÚBLICA DOMINICANA)**:
   - UTM: X (300000-800000), Y (1900000-2200000), Zona (19N/20N)
   - Geográficas: Latitud (17.5-20.0), Longitud (-72.0 a -68.0)
   - Si solo hay UTM, conviértelas a geográficas

3. **INFORMACIÓN DEL PERMISO**:
   - Número de oficio/resolución/permiso
   - Tipo (Licencia Ambiental, Autorización Ambiental, etc.)
   - Autoridad emisora (MARENA, Ministerio de Medio Ambiente, etc.)

INSTRUCCIONES PARA ANÁLISIS MULTÍPÁGINA:
- Revisa TODAS las páginas buscando fechas (pueden estar en páginas diferentes)
- Consolida información: usa la más precisa o completa
- Para fechas: busca tanto la emisión como el plazo en todas las páginas
- BUSCA ESPECÍFICAMENTE: "VÁLIDO POR X DÍAS", "se otorga plazo de X días", "vigencia de X días"
- Si ves "por X días hábiles" → multiplica por 1.4 para incluir fines de semana
- Si dice "6 meses" → convierte a ~180 días
- Si dice "1 año" → convierte a 365 días
- Prioriza coordenadas del área principal del proyecto

EJEMPLOS CRÍTICOS A DETECTAR:
- "VÁLIDO POR 90 DÍAS" → authorized_days: 90
- "se otorga un plazo de 60 días naturales" → authorized_days: 60
- "vigencia de 30 días" → authorized_days: 30

CÁLCULO DE FECHAS CRÍTICO:
1. Encuentra fecha de emisión del permiso
2. Encuentra días/plazo autorizado 
3. Suma: fecha_vencimiento = fecha_emisión + días_autorizados

FORMATO DE RESPUESTA (JSON exacto):
{
  "location": {
    "utm_coordinates": { "x": number, "y": number, "zone": "string" },
    "geographic_coordinates": { "lat": number, "lng": number },
    "polygon_center": { "lat": number, "lng": number }
  },
  "dates": {
    "emission_date": "YYYY-MM-DD",
    "authorized_days": number,
    "expiration_date": "YYYY-MM-DD"
  },
  "permit_info": {
    "permit_number": "string",
    "permit_type": "string",
    "authority": "string"
  }
}

PRIORIZA LA PRECISIÓN EN LAS FECHAS - es lo más importante para determinar vigencia.`

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

  async analyzeDateDocument(file: File, selectedModel = 'meta-llama/llama-3.2-90b-vision-instruct'): Promise<DateAnalysisResponse> {
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
        temperature: 0.1,
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
    const systemPrompt = `Eres un EXPERTO EN ANÁLISIS DE DOCUMENTOS OFICIALES especializado en extraer fechas exactas de permisos ambientales de República Dominicana.

🎯 **TU ÚNICA MISIÓN: ENCONTRAR FECHAS Y DÍAS EXACTOS**

BUSCA ESPECÍFICAMENTE:

📅 **FECHA DE EMISIÓN (PRIORIDAD MÁXIMA):**
- ⚠️ **UBICACIÓN CRÍTICA**: La fecha REAL está en la FIRMA DIGITAL con código QR
- **UBICACIÓN ESPECÍFICA**: PIE DE PÁGINA del documento, en la sección de FIRMA DIGITAL
- Busca DESPUÉS del código QR de la firma digital del ministerio
- La fecha está JUNTO/CERCA del código QR de verificación digital
- **IGNORAR**: Cualquier fecha en la cabecera del documento (son de plantilla)
- **BUSCAR ÚNICAMENTE**: La fecha que aparece con la firma digital/QR en el pie de página

📍 **PATRONES DE FECHA EN LA FIRMA DIGITAL:**
- "17/07/2025" (formato DD/MM/YYYY junto al QR)
- "7 de enero de 2025" (formato texto junto al QR)
- La fecha aparece como parte de la VALIDACIÓN/FIRMA DIGITAL

🎯 **INSTRUCCIÓN ESPECÍFICA:**
- ESCANEA solo el área del PIE DE PÁGINA donde está el código QR
- LOCALIZA la fecha que está ASOCIADA con la firma digital/QR
- IGNORA completamente cualquier fecha en otras partes del documento
- La fecha correcta está en la SECCIÓN DE AUTENTICACIÓN DIGITAL

📅 **DÍAS AUTORIZADOS (CRÍTICO):**
- Busca EXACTAMENTE las frases:
  * "VÁLIDO POR X DÍAS" 
  * "VÁLIDO POR X (X) DÍAS"
  * "se otorga un plazo de X días"
  * "vigencia de X días"
  * "autorizado por X días naturales"
- Ejemplos:
  * "VÁLIDO POR 90 DÍAS" → 90
  * "VÁLIDO POR NOVENTA (90) DÍAS" → 90
  * "plazo de 60 días naturales" → 60

🔍 **ESTRATEGIA DE BÚSQUEDA MUY ESPECÍFICA:**
1. **VE DIRECTAMENTE** al PIE DE PÁGINA (última parte del documento)
2. **BUSCA** la sección con código QR de firma digital
3. **IDENTIFICA** la fecha que está CON/JUNTO al código QR
4. **EXTRAE** solo esa fecha del área de la firma digital
5. **BUSCA** "VÁLIDO POR X DÍAS" en el cuerpo del documento (separado del QR)

🚨 **REGLAS ABSOLUTAS:**
- **SOLO** la fecha del área de FIRMA DIGITAL/QR es válida
- **IGNORA** fechas en cabecera, cuerpo, o cualquier otro lugar
- **LA FECHA CORRECTA** está específicamente en la zona del código QR
- **NO USES** fechas de otras secciones, aunque parezcan oficiales

🎯 **CONFIRMACIÓN DE UBICACIÓN:**
- ✅ Fecha en zona de firma digital con QR = CORRECTA
- ❌ Fecha en cabecera del documento = INCORRECTA
- ❌ Fecha en cuerpo del documento = INCORRECTA
- ❌ Cualquier otra fecha = INCORRECTA

⚠️ **CRÍTICO:**
- Copia las fechas EXACTAMENTE como aparecen
- Si encuentras formato DD/MM/YYYY (ej: "17/07/2025"), conviértelo correctamente:
  * 17/07/2025 = 17 de julio de 2025 = 2025-07-17
  * DD = día, MM = mes, YYYY = año
- NO aproximes los días
- Si encuentras "NOVENTA (90)", usa el número: 90  
- Si no encuentras algo, marca como null

📅 **CONVERSIÓN DE FECHAS:**
- Formato DD/MM/YYYY → YYYY-MM-DD
- Ejemplo: 17/07/2025 → 2025-07-17 (17 de julio)

🗓️ **INFORMACIÓN ADICIONAL A BUSCAR:**
- Número de permiso/resolución/oficio
- Tipo de permiso (Licencia, Autorización, etc.)
- Autoridad emisora (MARENA, Ministerio de Medio Ambiente, etc.)

RESPONDE SOLO CON JSON (sin explicaciones):
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

IMPORTANTE: 
- Fechas en formato YYYY-MM-DD: "emission_date": "2025-01-07"
- Números directos: "authorized_days": 90 (no strings)
- Los campos expiration_date, days_remaining se calculan automáticamente`

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
export type { PermitAnalysisResponse, ModelOption, DateAnalysisResponse }