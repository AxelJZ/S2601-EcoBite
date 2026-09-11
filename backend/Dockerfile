FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --include=dev

ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/prisma_dummy

COPY . .

RUN npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

RUN chown -R node:node /app
USER node

EXPOSE 8080
CMD ["node", "dist/src/main.js"]
