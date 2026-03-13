FROM node:20-alpine

WORKDIR /app/notificationService

COPY notificationService/package*.json ./
RUN npm install

WORKDIR /app
COPY common ./common
COPY notificationService ./notificationService
RUN ln -s /app/notificationService/node_modules /app/node_modules

WORKDIR /app/notificationService

EXPOSE 4060
CMD ["npm", "start"]
