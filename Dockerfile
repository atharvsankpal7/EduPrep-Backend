# Use Node.js Alpine image for a smaller footprint
FROM node:20-alpine

# Install pnpm correctly without requiring corepack if it's disabled by default
RUN npm install -g pnpm

# Set the working directory
WORKDIR /app

# Copy package configurations
COPY package.json pnpm-lock.yaml ./

# Install dependencies (including devDependencies required for ts-node)
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Set environment variable to indicate production build
ENV NODE_ENV=production

# Expose the application port (matching the default port in src/index.ts)
EXPOSE 5000

# Start the application using ts-node
CMD ["pnpm", "exec", "ts-node", "src/index.ts"]
