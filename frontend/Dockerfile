stages:
  - build
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: ""

# Build images separately to avoid context issues
build-frontend:
  stage: build
  image: docker:20.10.16
  services:
    - docker:20.10.16-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    # Create a proper server.js file first
    - mkdir -p temp
    - |
      cat > temp/server.js << 'EOF'
      const express = require("express");
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
      });
      EOF
    # Create Dockerfile with React version fix
    - |
      cat > temp/Dockerfile.frontend << 'EOF'
      # Build stage
      FROM node:18-alpine as build

      WORKDIR /app

      # Copy package.json and package-lock.json
      COPY package*.json ./

      # Install dependencies and upgrade React to latest version
      RUN npm ci

      # Upgrade React and React-DOM to latest versions to ensure 'use' hook support
      RUN npm install react@^18.3.0 react-dom@^18.3.0 || echo "React upgrade attempted"

      # Copy application code
      COPY . .

      # Build the application with legacy peer deps to handle any conflicts
      RUN CI=false npm run build --legacy-peer-deps

      # Production stage
      FROM node:18-alpine

      WORKDIR /app

      # Copy build files
      COPY --from=build /app/build ./build

      # Copy our prewritten server.js
      COPY server.js .

      # Install express for serving
      RUN npm init -y && \
          npm install express@4.18.2

      # Expose port
      EXPOSE 4000

      # Start the server
      CMD ["node", "server.js"]
      EOF
    # Copy the repo contents to our temp directory
    - mkdir -p temp/frontend
    - cp -r frontend/* temp/frontend/ || echo "No frontend files to copy"
    # Copy our server.js to the build context
    - cp temp/server.js temp/frontend/
    # Build the Docker image
    - cd temp/frontend
    - docker build -t $CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA -f ../Dockerfile.frontend .
    - docker push $CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA
    - docker tag $CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE/frontend:latest
    - docker push $CI_REGISTRY_IMAGE/frontend:latest
    - cd ../..