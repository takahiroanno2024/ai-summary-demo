FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source code and TypeScript config
COPY tsconfig.json .
COPY src/ src/

# Install dev dependencies for build
RUN npm install typescript @types/node @types/express @types/ws @types/uuid

# Build TypeScript code
RUN npm run build && \
    npm prune --production && \
    rm -rf src tsconfig.json

# Expose the port
EXPOSE 3030

# Start the application
CMD ["npm", "start"]