# Usa Node.js 20 Alpine (más liviano)
FROM node:20-alpine

# Instala un servidor HTTP simple
RUN npm install -g serve

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

# Comando para servir la aplicación usando serve
CMD ["serve", "-s", "dist", "-l", "4173", "-n"]