FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Add a health check endpoint if it doesn't exist
RUN grep -q "app.get('/health'" server.js || \
    echo "\n// Health check endpoint\napp.get('/health', (req, res) => { res.status(200).send('OK'); });\n" >> server.js

# Make sure server listens on all interfaces
RUN grep -q "app.listen.*0.0.0.0" server.js || \
    sed -i "s/app.listen(PORT)/app.listen(PORT, '0.0.0.0')/g" server.js || \
    echo "Warning: Could not update listen binding. Please check manually."

# Expose the API port
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]