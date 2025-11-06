# -----------------------
# Stage 1: Builder
# -----------------------
FROM node:20-bullseye AS builder
ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# -----------------------
# Stage 2: Runner
# -----------------------
FROM node:20-bullseye AS runner
ENV NODE_ENV=production
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=America/Santiago
ENV WPP_DATA_DIR=/app/.wpp

WORKDIR /app

# Dependencias del sistema necesarias para Chromium/Puppeteer y ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    ffmpeg \
 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
RUN mkdir -p ${WPP_DATA_DIR} && chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
 CMD node -e "require('http').get('http://localhost:3000/api/metrics', res => { if(res.statusCode!==200){ process.exit(1);} }).on('error',()=>process.exit(1))"

CMD ["node", "dist/main.js"]
