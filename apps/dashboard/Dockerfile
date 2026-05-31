FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/dashboard/package.json ./apps/dashboard/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @estlem/dashboard build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/apps/dashboard/.next/standalone ./
COPY --from=build /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
EXPOSE 3002
CMD ["node", "apps/dashboard/server.js"]
