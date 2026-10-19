FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npx prisma generate && npm run build
ENV NODE_ENV=production
COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && chown -R node:node /app
USER node
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
