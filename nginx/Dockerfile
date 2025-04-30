build-nginx:
  stage: build
  image: docker:20.10.16
  services:
    - docker:20.10.16-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY

    # Create Nginx config file
    - mkdir -p temp/nginx
    - |
      cat > temp/nginx/default.conf.template << 'EOF'
      server {
          listen 8080;
          server_name localhost;

          # API requests
          location /api/ {
              proxy_pass http://${BACKEND_HOST}:5000/;
              proxy_http_version 1.1;
              proxy_set_header Upgrade $http_upgrade;
              proxy_set_header Connection "upgrade";
              proxy_set_header Host $host;
              proxy_set_header X-Real-IP $remote_addr;
              proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
              proxy_set_header X-Forwarded-Proto $scheme;
              proxy_cache_bypass $http_upgrade;
          }

          # Frontend
          location / {
              proxy_pass http://${FRONTEND_HOST}:4000;
              proxy_http_version 1.1;
              proxy_set_header Upgrade $http_upgrade;
              proxy_set_header Connection "upgrade";
              proxy_set_header Host $host;
              proxy_set_header X-Real-IP $remote_addr;
              proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
              proxy_set_header X-Forwarded-Proto $scheme;
              proxy_cache_bypass $http_upgrade;
          }

          # Health check
          location /health {
              access_log off;
              return 200 "healthy\n";
          }
      }
      EOF

    # Create entrypoint script
    - |
      cat > temp/nginx/docker-entrypoint.sh << 'EOF'
      #!/bin/sh
      set -e

      # Replace environment variables in the config
      envsubst "$FRONTEND_HOST $BACKEND_HOST" < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

      # Start nginx
      exec "$@"
      EOF

    # Create Dockerfile for Nginx
    - |
      cat > temp/nginx/Dockerfile << 'EOF'
      FROM nginx:1.25-alpine

      # Install dependencies
      RUN apk add --no-cache gettext

      # Copy our configuration files
      COPY default.conf.template /etc/nginx/conf.d/default.conf.template
      COPY docker-entrypoint.sh /docker-entrypoint.sh

      # Make entrypoint executable
      RUN chmod +x /docker-entrypoint.sh

      # Use our custom entrypoint
      ENTRYPOINT ["/docker-entrypoint.sh"]
      CMD ["nginx", "-g", "daemon off;"]
      EOF

    # Build the Docker image
    - cd temp/nginx
    - docker build -t $CI_REGISTRY_IMAGE/nginx:$CI_COMMIT_SHA -f Dockerfile .
    - docker push $CI_REGISTRY_IMAGE/nginx:$CI_COMMIT_SHA
    - docker tag $CI_REGISTRY_IMAGE/nginx:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE/nginx:latest
    - docker push $CI_REGISTRY_IMAGE/nginx:latest
    - cd ../..