# ---------- Dépendances ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Développement (Vite + HMR) ----------
FROM node:22-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# ---------- Build de production ----------
FROM deps AS build
ARG VITE_API_MODE=http
ARG VITE_API_URL=/api
ARG VITE_WHATSAPP_NUMBER=242064455563
ENV VITE_API_MODE=$VITE_API_MODE VITE_API_URL=$VITE_API_URL VITE_WHATSAPP_NUMBER=$VITE_WHATSAPP_NUMBER
COPY . .
RUN npm run build

# ---------- Service statique (prod) ----------
FROM nginx:1.27-alpine AS prod
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
