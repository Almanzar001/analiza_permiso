import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 4173
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

app.use(express.json({ limit: '50mb' }))

// Proxy: the OpenRouter key stays on the server and is never sent to the browser.
app.post('/api/openrouter/chat-completions', async (req, res) => {
  if (!OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY no está configurada en el servidor')
    return res.status(500).json({ error: 'AI service not configured' })
  }

  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': req.headers.origin || 'https://analiza-permiso',
        'X-Title': 'Analiza Permiso App'
      },
      body: JSON.stringify(req.body)
    })

    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch (error) {
    console.error('Error proxying request to OpenRouter:', error)
    res.status(502).json({ error: 'Error contacting AI service' })
  }
})

const distPath = path.join(__dirname, 'dist')
app.use(express.static(distPath))

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`)
})
