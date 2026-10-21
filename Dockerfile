# syntax=docker/dockerfile:1

# The Node version matches .nvmrc.
FROM node:22.19.0-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: the husky `prepare` hook has no git repository to install into.
RUN npm ci --ignore-scripts

FROM deps AS build
COPY tsconfig.json tsconfig.build.json codegen.ts drizzle.config.ts ./
COPY src ./src
RUN npm run codegen && npm run build

# One-shot: applies the migrations with drizzle-kit, a dev dependency, then exits.
FROM build AS migrate
CMD ["npx", "drizzle-kit", "migrate"]

# api, and the worker once Refresh is built: the same image, started with a different entrypoint.
FROM node:22.19.0-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/dist ./dist
RUN mkdir logs && chown node:node logs
USER node
EXPOSE 4000
CMD ["node", "dist/api.js"]
