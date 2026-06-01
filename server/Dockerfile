# Lightweight Node.js alpine runtime environment
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./

# Production dependency install only to optimize build image size
RUN npm install --only=production

COPY . .

EXPOSE 5000
ENV NODE_ENV=production

CMD ["node", "server.js"]
