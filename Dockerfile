# Imagen base Node.js 18
FROM node:18-slim

WORKDIR /app

# Copiar solo package para aprovechar caché de capas
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production

# Copiar el resto del código (sin node_modules gracias a .dockerignore)
COPY . .

# Puerto donde escucha la API
EXPOSE 3003

# Variable por defecto (en ECS se sobreescribe)
ENV NODE_ENV=production
ENV PORT=3003

# Iniciar la API
CMD ["node", "server.js"]
