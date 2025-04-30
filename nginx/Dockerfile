FROM nginx:1.25

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    bash \
    netcat-openbsd \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

# Copy wait-for script to wait for other services
COPY ./nginx/wait-for.sh /wait-for.sh
RUN chmod +x /wait-for.sh

# Copy configuration
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf

# Create an entrypoint script
COPY ./nginx/docker-entrypoint.sh /docker-entrypoint-custom.sh
RUN chmod +x /docker-entrypoint-custom.sh

ENTRYPOINT ["/docker-entrypoint-custom.sh"]
CMD ["nginx", "-g", "daemon off;"]