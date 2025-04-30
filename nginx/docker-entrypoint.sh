#!/bin/sh
set -e

# Debug - print environment variables
echo "Environment variables:"
echo "FRONTEND_HOST: ${FRONTEND_HOST}"
echo "BACKEND_HOST: ${BACKEND_HOST}"

# Replace environment variables in the config
# Use the dollar sign with curly braces to properly match variables
envsubst '${FRONTEND_HOST} ${BACKEND_HOST}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Debug - print the generated config
echo "Generated Nginx config:"
cat /etc/nginx/conf.d/default.conf

# Test nginx configuration
echo "Testing Nginx configuration..."
nginx -t

# Start nginx
exec "$@"