FROM nginx:1.25-alpine

# Install dependencies
RUN apk add --no-cache gettext bash

# Copy our configuration files
COPY default.conf.template /etc/nginx/conf.d/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh

# Make entrypoint executable
RUN chmod +x /docker-entrypoint.sh

# Add debugging
RUN echo "NGINX_VERSION: $NGINX_VERSION" > /debug_info.txt

# Use our custom entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]