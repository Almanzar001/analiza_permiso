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
app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    // Never let the browser/CDN cache index.html: it references hashed asset
    // filenames that change on every deploy, so a stale cached copy points
    // at JS/CSS files that no longer exist after a redeploy.
    if (path.basename(filePath) === 'index.html') {
      res.setHeader('Cache-Control', 'no-store')
    }
  }
}))

app.get('*', (req, res) => {
  // A request for a real file (e.g. /assets/index-XXXX.js, /icon-192.png)
  // that express.static didn't find is a genuine 404 — serving index.html
  // for it makes the browser choke on the wrong MIME type. Only fall back
  // to the SPA shell for actual client-side routes (no file extension).
  if (path.extname(req.path)) {
    return res.status(404).end()
  }
  res.set('Cache-Control', 'no-store')
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`)
  console.log(`OPENROUTER_API_KEY detectada: ${OPENROUTER_API_KEY ? 'sí (' + OPENROUTER_API_KEY.slice(0, 10) + '...)' : 'NO — falta configurarla en el entorno'}`)
})
