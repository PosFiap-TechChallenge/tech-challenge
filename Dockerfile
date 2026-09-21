# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
# O schema declara url = env("DATABASE_URL"); em build time basta um valor sintatico.
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/techchallenge?schema=public"

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN pnpm exec prisma generate --schema src/infrastructure/database/prisma/schema.prisma
RUN pnpm run build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY src/infrastructure/database/prisma ./src/infrastructure/database/prisma
RUN pnpm install --prod --frozen-lockfile
RUN pnpm exec prisma generate --schema src/infrastructure/database/prisma/schema.prisma

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY src/infrastructure/database/prisma ./src/infrastructure/database/prisma

EXPOSE 3000
USER node

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
