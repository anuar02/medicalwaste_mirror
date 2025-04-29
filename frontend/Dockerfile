# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Build the application
RUN CI=false npm run build

# Create server.js file for serving the app
RUN echo 'const express = require("express"); \
  const path = require("path"); \
  \
  const app = express(); \
  const PORT = process.env.PORT || 4000; \
  \
  // Serve static files from the React app \
  app.use(express.static(__dirname)); \
  \
  // Handle React routing, return all requests to React app \
  app.get("*", (req, res) => { \
    res.sendFile(path.join(__dirname, "index.html")); \
  }); \
  \
  app.listen(PORT, () => { \
    console.log(`Frontend server running on port ${PORT}`); \
  });' > build/server.js

# Create package.json for the production build
RUN echo '{ \
  "name": "frontend-server", \
  "version": "1.0.0", \
  "main": "server.js", \
  "dependencies": { \
    "express": "^4.18.2" \
  } \
}' > build/package.json

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy build files and server resources
COPY --from=build /app/build ./
COPY --from=build /app/build/server.js ./
COPY --from=build /app/build/package.json ./

# Install production dependencies
RUN npm install --production

# Expose port
EXPOSE 4000

# Start the application
CMD ["node", "server.js"]