FROM node:20-slim AS base
WORKDIR /app
FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev
FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
FROM python:3.11-slim AS python-deps
WORKDIR /app
COPY api/requirements.txt ./api/
RUN pip install --no-cache-dir -r api/requirements.txt
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    ffmpeg \
    libsndfile1 \
    sox \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared
COPY --from=build /app/package.json ./
COPY api ./api
COPY start.sh ./start.sh
RUN chmod +x ./start.sh
COPY --from=python-deps /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=python-deps /usr/local/bin/uvicorn /usr/local/bin/uvicorn
RUN mkdir -p data/embeddings data/voices data/outputs storage/voices storage/outputs storage/uploads storage/consents
EXPOSE 5000
CMD ["./start.sh"]
