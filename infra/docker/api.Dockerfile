# Imagen de la API de Kinoo (Node 22). La misma imagen sirve para cualquier nube con contenedores.
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages ./packages
RUN npm ci --no-audit --no-fund
COPY apps/api ./apps/api
ENV NODE_ENV=production
EXPOSE 8787
CMD ["npx", "tsx", "apps/api/src/server.node.ts"]
