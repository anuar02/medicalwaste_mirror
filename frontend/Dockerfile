# Fix TanStack Query compatibility issues
      RUN find . -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
        -e 's/\.defaultQueryOptions(/\.setDefaultOptions(/g' \
        -e 's/\.setDefaultQueryOptions(/\.setDefaultOptions(/g' \
        -e "s/queryKey: '\([^']*\)'/queryKey: ['\1']/g" \
        -e "s/queryKey: \"\([^\"]*\)\"/queryKey: ['\1']/g" \
        {} \;

      # Debug: Check React version and package-lock
      RUN echo "=== React version ===" && \
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
      FROM node:20-alpine as build

      WORKDIR /app

      # Copy package.json and package-lock.json first
      COPY package*.json ./

      # Clear npm cache and force fresh install with React 19 testing library compatibility
      RUN npm cache clean --force

      # Force install with legacy peer deps to handle React 19 testing library conflicts
      RUN npm install --legacy-peer-deps

      # Copy application code
      COPY . .

      # Find and remove problematic use hook imports
      RUN echo "Searching for 'use' hook imports..." && \
          find . -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -exec grep -l "import.*use.*from.*react" {} \; | head -10 && \
          find . -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
            -e 's/import { use,/import {/g' \
            -e 's/import { use }/\/\/ use hook not available in React 18/g' \
            -e 's/, use,/,/g' \
            -e 's/, use }/}/g' \
            -e 's/{ use,/{ /g' \
            -e 's/{ use }/{ }/g' \
            -e 's/React\.use(/\/\/ React.use(/g' \
            -e 's/\buse(/\/\/ use(/g' {} \;

      # Debug: Check React version and package-lock
      RUN echo "=== React version ===" && \
          npm list react react-dom && \
          echo "=== Checking for use hook imports ===" && \
          find . -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -exec grep -H "import.*use.*from.*react" {} \; | head -10 || echo "No use imports found" && \
          echo "=== Checking package.json ===" && \
          cat package.json | grep -A2 -B2 react

      # Set CI to false to treat warnings as warnings, not errors
      ENV CI=false
      ENV GENERATE_SOURCEMAP=false

      # Build the application
      RUN npm run build

      # Production stage
      FROM node:20-alpine

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

      # Health check
      HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
        CMD curl -f http://localhost:4000/health || exit 1

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