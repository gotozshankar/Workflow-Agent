# Stage 1: Build the React app
FROM node:20-slim AS builder

WORKDIR /app

# Install build tools (if needed for native modules)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=optional || npm install
RUN npm install @rollup/rollup-linux-x64-gnu --save-optional
RUN npm install lightningcss-linux-x64-gnu --save-optional

# Copy source code
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
# Build the project (creates dist/public/)
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy built files from builder to nginx serve directory
# Your build outputs to dist/public/
COPY --from=builder /app/dist/public /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (nginx default)
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]