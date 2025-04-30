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
    # Create a fixed Dockerfile that properly escapes the content
    - |
      cat > Dockerfile.frontend << 'EOF'
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

      # Install express for serving
      RUN npm init -y && \
          npm install express@4.18.2

      # Create server file
      RUN echo 'const express = require("express");\n\
      const path = require("path");\n\
      const app = express();\n\
      const PORT = process.env.PORT || 4000;\n\
      \n\
      // Health check endpoint\n\
      app.get("/health", (req, res) => {\n\
        res.status(200).send("OK");\n\
      });\n\
      \n\
      // Serve static files from the React build\n\
      app.use(express.static(path.join(__dirname, "build")));\n\
      \n\
      // Handle React routing, return all requests to React app\n\
      app.get("*", (req, res) => {\n\
        res.sendFile(path.join(__dirname, "build", "index.html"));\n\
      });\n\
      \n\
      // Make sure to listen on all interfaces\n\
      app.listen(PORT, "0.0.0.0", () => {\n\
        console.log(`Frontend server running on port ${PORT}`);\n\
      });' > server.js

      # Expose port
      EXPOSE 4000

      # Start the server
      CMD ["node", "server.js"]
      EOF
    - docker build -t $CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA -f Dockerfile.frontend .
    - docker push $CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA
    - docker tag $CI_REGISTRY_IMAGE/frontend:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE/frontend:latest
    - docker push $CI_REGISTRY_IMAGE/frontend:latest