# Stage 1: Build React Vite static assets
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve assets in lightweight Nginx production container
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA Routing Redirect configuration
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; index index.html; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
