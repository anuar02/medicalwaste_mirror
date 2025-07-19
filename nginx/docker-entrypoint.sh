#!/bin/sh
set -e

echo "Environment variables:"
echo "FRONTEND_HOST: ${FRONTEND_HOST}"
echo "BACKEND_HOST: ${BACKEND_HOST}"

envsubst '${FRONTEND_HOST} ${BACKEND_HOST}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "Generated Nginx config:"
cat /etc/nginx/conf.d/default.conf

echo "Testing Nginx configuration..."
nginx -t

exec "$@"