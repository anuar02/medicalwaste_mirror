build-backend:
  stage: build
  image: docker:20.10.16
  services:
    - docker:20.10.16-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    # Create a proper minimal server.js file first
    - mkdir -p temp
    - |
      cat > temp/minimal-server.js << 'EOF'
      const express = require("express");
      const app = express();
      const PORT = process.env.PORT || 5000;

      // Health check endpoint
      app.get("/health", (req, res) => {
        res.status(200).send("OK");
      });

      // Example API endpoint
      app.get("/api", (req, res) => {
        res.json({ message: "API is working" });
      });

      // Start server on all interfaces
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Backend server running on port ${PORT}`);
      });
      EOF
    # Create Dockerfile without the problematic RUN echo part
    - |
      cat > temp/Dockerfile.backend << 'EOF'
      FROM node:18-alpine

      # Create app directory
      WORKDIR /app

      # Copy package files
      COPY package*.json ./

      # Install dependencies
      RUN npm ci --only=production

      # Copy application code
      COPY . .

      # Use the pre-created server.js if none exists in the repo
      RUN if [ ! -f server.js ]; then \
          cp minimal-server.js server.js; \
      fi

      # Add a health check endpoint if it doesn't exist
      RUN grep -q "app.get('/health'" server.js || \
          echo "\n// Health check endpoint\napp.get('/health', (req, res) => { res.status(200).send('OK'); });\n" >> server.js

      # Make sure server listens on all interfaces
      RUN grep -q "app.listen.*0.0.0.0" server.js || \
          sed -i "s/app.listen(PORT)/app.listen(PORT, '0.0.0.0')/g" server.js || \
          echo "Warning: Could not update listen binding. Please check manually."

      # Expose the API port
      EXPOSE 5000

      # Start the application
      CMD ["node", "server.js"]
      EOF
    # Copy the repo contents to our temp directory
    - mkdir -p temp/backend
    - cp -r backend/* temp/backend/ || echo "No backend files to copy"
    # Copy our minimal server.js to the build context
    - cp temp/minimal-server.js temp/backend/
    # Build the Docker image
    - cd temp/backend
    - docker build -t $CI_REGISTRY_IMAGE/backend:$CI_COMMIT_SHA -f ../Dockerfile.backend .
    - docker push $CI_REGISTRY_IMAGE/backend:$CI_COMMIT_SHA
    - docker tag $CI_REGISTRY_IMAGE/backend:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE/backend:latest
    - docker push $CI_REGISTRY_IMAGE/backend:latest
    - cd ../..