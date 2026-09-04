# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci --workspace @discopod/api --include-workspace-root
COPY apps/api apps/api
RUN npm run build --workspace @discopod/api

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci --workspace @discopod/api --include-workspace-root --omit=dev
COPY --from=build /repo/apps/api/dist apps/api/dist
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
