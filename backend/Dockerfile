build-backend:
  stage: build
  image: docker:20.10.16
  services:
    - docker:20.10.16-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY

    # Create the Dockerfile for backend - WITHOUT overwriting server.js
    - mkdir -p temp
    - |
      cat > temp/Dockerfile.backend << 'EOF'
      FROM node:18-alpine

      # Create app directory
      WORKDIR /app

      # Copy package files first for better caching
      COPY package*.json ./

      # Install dependencies
      RUN npm ci --only=production || npm install --production

      # Copy all application code INCLUDING .env file
      COPY . .

      # Make sure logs directory exists
      RUN mkdir -p logs

      # Expose the API port
      EXPOSE 5000

      # Start the application (use original server.js)
      CMD ["node", "server.js"]
      EOF

    # Copy the repo contents to our temp directory
    - mkdir -p temp/backend
    - cp -r backend/* temp/backend/ || echo "No backend files to copy"

    # Make sure .env file is copied (create one with secrets if it doesn't exist)
    - |
      if [ ! -f temp/backend/.env ]; then
        cat > temp/backend/.env << 'EOF'
      JWT_SECRET=your-jwt-secret-key-change-this-in-production
      NODE_ENV=production
      PORT=5000
      BCRYPT_ROUNDS=12
      EOF
      fi

    # Build the Docker image
    - cd temp/backend
    - docker build -t $CI_REGISTRY_IMAGE/backend:$CI_COMMIT_SHA -f ../Dockerfile.backend .
    - docker push $CI_REGISTRY_IMAGE/backend:$CI_COMMIT_SHA
    - docker tag $CI_REGISTRY_IMAGE/backend:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE/backend:latest
    - docker push $CI_REGISTRY_IMAGE/backend:latest
    - cd ../..
