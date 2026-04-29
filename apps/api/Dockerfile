FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN npm install --workspace=apps/api --workspace=packages/shared-types

COPY packages/shared-types ./packages/shared-types
COPY apps/api ./apps/api

WORKDIR /app/apps/api

CMD ["npx", "ts-node", "-r", "tsconfig-paths/register", "src/main.ts"]
