FROM node:20-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

# Install dependencies
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy backend code and root catalogue
COPY backend/ ./
COPY products.json /products.json
COPY products.json ./products.json

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["npx", "tsx", "src/server.ts"]
