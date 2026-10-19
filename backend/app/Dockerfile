FROM node:20-alpine

WORKDIR /usr/src/app

# Install dependencies first (better layer caching)
COPY code/package*.json ./
RUN npm install --omit=dev

# Copy the backend source code
COPY code/ ./

EXPOSE 5000

CMD ["node", "server.js"]
