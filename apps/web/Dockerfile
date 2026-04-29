FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN npm install --workspace=apps/web --workspace=packages/shared-types

COPY packages/shared-types ./packages/shared-types
COPY apps/web ./apps/web

WORKDIR /app/apps/web

EXPOSE 5173

CMD ["npx", "vite", "--host", "0.0.0.0"]
