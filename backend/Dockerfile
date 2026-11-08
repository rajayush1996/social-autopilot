FROM node:20-bookworm-slim

# Install system dependencies needed by Prisma, Sharp, and FFmpeg
RUN apt-get update -y && apt-get install -y openssl ca-certificates ffmpeg python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package definitions and prisma schema first for cached layers
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies and compile Prisma client
RUN npm ci --omit=dev
RUN npx prisma generate

# Copy application source
COPY . .

# Expose application port
EXPOSE 5000

CMD ["node", "server.js"]
