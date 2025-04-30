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
COPY --from=build /app/build ./build

# Install express (for serving)
RUN npm init -y && \
    npm install express@4.18.2

# Create server file
RUN echo 'const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 4000;

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Serve static files from the React build
app.use(express.static(path.join(__dirname, "build")));

// Handle React routing, return all requests to React app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// Make sure to listen on all interfaces
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Frontend server running on port ${PORT}`);
});' > server.js

# Expose port
EXPOSE 4000

# Start the server
CMD ["node", "server.js"]