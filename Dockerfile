# Usa Node.js 20 Alpine (más liviano)
FROM node:20-alpine

# Directorio de trabajo en el contenedor
WORKDIR /app

# Copia archivos de dependencias primero (para cachear)
COPY package*.json ./

# Instala dependencias (incluye express, usado por server.js)
RUN npm ci

# Copia todo el código fuente
COPY . .

# Construye la aplicación para producción
RUN npm run build

# Expone el puerto 4173
EXPOSE 4173

# Sirve el frontend y hace de proxy hacia OpenRouter (la API key vive solo aquí,
# como variable de entorno del contenedor: OPENROUTER_API_KEY)
CMD ["node", "server.js"]