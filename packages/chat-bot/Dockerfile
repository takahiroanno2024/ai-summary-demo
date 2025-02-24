FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/

ENV PORT=3030
EXPOSE 3030

CMD ["node", "dist/index.js"]