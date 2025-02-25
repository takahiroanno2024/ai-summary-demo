FROM node:18-slim

WORKDIR /app

# Copy package files and lockfile
COPY package.json package-lock.json ./

# Install ALL dependencies (including dev dependencies)
RUN npm ci

# Copy source code and TypeScript config
COPY tsconfig.json .
COPY src/ src/

# Build TypeScript code
RUN npm run build && \
    npm prune --production && \
    rm -rf src tsconfig.json

# Expose the port
EXPOSE 3030

# Start the application
CMD ["npm", "start"]