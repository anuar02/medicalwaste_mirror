FROM nginx:1.25-alpine

# Install dependencies
RUN apk add --no-cache gettext bash curl

# Copy configuration template
COPY default.conf.template /etc/nginx/conf.d/default.conf.template

# Create entrypoint script directly in Dockerfile (avoids Windows line ending issues)
# Create entrypoint script using echo commands (most reliable)
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'set -e' >> /docker-entrypoint.sh && \
    echo 'echo "Environment variables:"' >> /docker-entrypoint.sh && \
    echo 'echo "FRONTEND_HOST: ${FRONTEND_HOST}"' >> /docker-entrypoint.sh && \
    echo 'echo "BACKEND_HOST: ${BACKEND_HOST}"' >> /docker-entrypoint.sh && \
    echo 'envsubst '"'"'${FRONTEND_HOST} ${BACKEND_HOST}'"'"' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf' >> /docker-entrypoint.sh && \
    echo 'echo "Generated Nginx config:"' >> /docker-entrypoint.sh && \
    echo 'cat /etc/nginx/conf.d/default.conf' >> /docker-entrypoint.sh && \
    echo 'echo "Testing Nginx configuration..."' >> /docker-entrypoint.sh && \
    echo 'nginx -t' >> /docker-entrypoint.sh && \
    echo 'exec "$@"' >> /docker-entrypoint.sh

# Make script executable
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]