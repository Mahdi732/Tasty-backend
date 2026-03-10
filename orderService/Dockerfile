FROM node:20-alpine

WORKDIR /app/orderService

COPY orderService/package*.json ./
RUN npm install

WORKDIR /app
COPY common ./common
COPY orderService ./orderService

WORKDIR /app/orderService

EXPOSE 4020
CMD ["npm", "start"]
