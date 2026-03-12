FROM node:20-alpine

WORKDIR /app/notificationService

COPY notificationService/package*.json ./
RUN npm install

WORKDIR /app
COPY common ./common
COPY notificationService ./notificationService

WORKDIR /app/notificationService

EXPOSE 4060
CMD ["npm", "start"]
