FROM node:20-alpine AS base
WORKDIR /app/userService
COPY userService/package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/userService/node_modules ./userService/node_modules
COPY common ./common
COPY userService ./userService
WORKDIR /app/userService
EXPOSE 4000
CMD ["node", "src/server.js"]
