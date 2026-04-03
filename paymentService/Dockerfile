FROM node:20-alpine

WORKDIR /app/paymentService

COPY paymentService/package*.json ./
RUN npm install

WORKDIR /app
COPY common ./common
COPY paymentService ./paymentService
RUN ln -s /app/paymentService/node_modules /app/node_modules

WORKDIR /app/paymentService

EXPOSE 4050 50056

CMD ["npm", "start"]
