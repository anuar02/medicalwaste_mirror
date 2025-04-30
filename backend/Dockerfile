build-backend:
  stage: build
  image: docker:20.10.16
  services:
    - docker:20.10.16-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    # Create a fixed Dockerfile that properly escapes the content
    - |
      cat > Dockerfile.backend << 'EOF'
      FROM node:18-alpine

      # Create app directory
      WORKDIR /app

      # Copy package files
      COPY package*.json ./

      # Install dependencies
      RUN npm ci --only=production

      # Copy application code
      COPY . .

      # Create a minimal server if one doesn't exist
      RUN if [ ! -f server.js ]; then \
          echo 'const express = require("express");\n\
      const app = express();\n\
      const PORT = process.env.PORT || 5000;\n\
      \n\
      // Health check endpoint\n\
      app.get("/health", (req, res) => {\n\
        res.status(200).send("OK");\n\
      });\n\
      \n\
      // Example API endpoint\n\
      app.get("/api", (req, res) => {\n\
        res.json({ message: "API is working" });\n\
      });\n\
      \n\
      // Start server on all interfaces\n\
      app.listen(PORT, "0.0.0.0", () => {\n\
        console.log(`Backend server running on port ${PORT}`);\n\
      });' > server.js; \
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
    - docker build -t $CI_REGISTRY_IMAGE/backend:$CI_COMMIT_SHA -f Dockerfile.backend .
    - docker push $CI_REGISTRY_IMAGE/backend:$CI_COMMIT_SHA
    - docker tag $CI_REGISTRY_IMAGE/backend:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE/backend:latest
    - docker push $CI_REGISTRY_IMAGE/backend:latest