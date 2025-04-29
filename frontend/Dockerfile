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

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy build files
COPY --from=build /app/build ./

# Create server.js for serving the React app
RUN echo 'const express = require("express"); \
    const path = require("path"); \
    const app = express(); \
    const PORT = process.env.PORT || 4000; \
    app.use(express.static(__dirname)); \
    app.get("*", (req, res) => { \
      res.sendFile(path.join(__dirname, "index.html")); \
    }); \
    app.listen(PORT, () => { \
      console.log(`Frontend server running on port ${PORT}`); \
    });' > server.js

# Create package.json for the production server
RUN echo '{ \
  "name": "frontend-server", \
  "version": "1.0.0", \
  "main": "server.js", \
  "dependencies": { \
    "express": "^4.18.2" \
  } \
}' > package.json

# Install production dependencies
RUN npm install --production

# Expose port
EXPOSE 4000

# Start the application
CMD ["node", "server.js"]
