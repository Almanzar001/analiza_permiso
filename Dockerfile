# Usa Node.js 20 Alpine (más liviano)
FROM node:20-alpine

# Directorio de trabajo en el contenedor
WORKDIR /app

# Copia archivos de dependencias primero (para cachear)
COPY package*.json ./

# Instala dependencias
RUN npm ci

# Copia todo el código fuente
COPY . .

# Construye la aplicación para producción
RUN npm run build

# Expone el puerto 4173
EXPOSE 4173

# Comando para servir la aplicación
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173", "--strictPort"]