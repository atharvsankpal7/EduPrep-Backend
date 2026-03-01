# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

# Copy package configs first (layer caching)
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (including dev) for the build step
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Compile TypeScript to JavaScript
RUN pnpm exec tsc -p tsconfig.build.json


# ---- Stage 2: Production ----
FROM node:20-alpine

RUN npm install -g pnpm

WORKDIR /app

# Copy package configs
COPY package.json pnpm-lock.yaml ./

# Install ONLY production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy compiled JS from the builder stage
COPY --from=builder /app/dist ./dist

# Set environment variable
ENV NODE_ENV=production

EXPOSE 5000

# Run compiled JavaScript directly with Node (no ts-node needed!)
CMD ["node", "dist/index.js"]
