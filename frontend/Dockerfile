# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies - simple, no flags needed
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy application code
COPY . .

# Build arguments for React environment variables
ARG REACT_APP_GOOGLE_CLIENT_ID
ARG REACT_APP_API_URL

# Set as environment variables for build
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV CI=false
ENV GENERATE_SOURCEMAP=false

# Build the application
RUN npm run build