FROM nginx:1.25

# Install dependencies
RUN apt-get update && apt-get install -y \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

# Create nginx configuration
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    \
    # API requests \
    location /api/ { \
        proxy_pass http://${BACKEND_HOST}:5000/; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_cache_bypass $http_upgrade; \
    } \
    \
    # Frontend \
    location / { \
        proxy_pass http://${FRONTEND_HOST}:4000; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
        proxy_cache_bypass $http_upgrade; \
    } \
    \
    # Health check \
    location /health { \
        access_log off; \
        return 200 "healthy\\n"; \
    } \
}' > /etc/nginx/conf.d/default.conf.template

# Create a simple entrypoint script
RUN echo '#!/bin/sh \n\
set -e \n\
\n\
# Replace environment variables in the config \n\
envsubst "\$FRONTEND_HOST \$BACKEND_HOST" < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf \n\
\n\
# Start nginx \n\
exec "$@"' > /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

# Use our custom entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]