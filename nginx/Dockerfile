FROM nginx:1.25

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    bash \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Add wait-for script to wait for other services
COPY wait-for.sh /wait-for.sh
RUN chmod +x /wait-for.sh

# Copy configuration
COPY default.conf /etc/nginx/conf.d/default.conf

# Create an entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint-custom.sh
RUN chmod +x /docker-entrypoint-custom.sh

ENTRYPOINT ["/docker-entrypoint-custom.sh"]
CMD ["nginx", "-g", "daemon off;"]