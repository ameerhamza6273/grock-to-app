# Nuxt frontend. The backend lives in backend/ with its own Dockerfile.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# postinstall (nuxt prepare) needs the full source; `nuxt build` runs it anyway
RUN npm ci --ignore-scripts
COPY . .
# Baked into the proxy routeRules at build time (see nuxt.config.ts)
ARG BACKEND_URL=http://backend:8000
ENV BACKEND_URL=$BACKEND_URL
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/.output ./.output
ENV HOST=0.0.0.0 PORT=3000 NODE_ENV=production
EXPOSE 3000
USER node
CMD ["node", ".output/server/index.mjs"]
