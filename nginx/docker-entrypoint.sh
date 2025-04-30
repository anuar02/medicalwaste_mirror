#!/bin/bash
set -e

# Replace environment variables in the nginx config
envsubst '${FRONTEND_HOST} ${BACKEND_HOST}' < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf.tmp
mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf

# Wait for frontend and backend services to be available
echo "Waiting for frontend service..."
/wait-for.sh ${FRONTEND_HOST} 4000 -t 60

echo "Waiting for backend service..."
/wait-for.sh ${BACKEND_HOST} 5000 -t 60

# Start nginx
echo "Starting Nginx..."
exec "$@"