FROM node:20-alpine

WORKDIR /app/faceRecognitionService

COPY faceRecognitionService/package*.json ./
RUN npm install --omit=dev

WORKDIR /app
COPY common ./common
COPY faceRecognitionService ./faceRecognitionService
RUN ln -s /app/faceRecognitionService/node_modules /app/node_modules

WORKDIR /app/faceRecognitionService

EXPOSE 4030

CMD ["npm", "start"]
