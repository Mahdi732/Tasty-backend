FROM node:20-alpine

WORKDIR /app/faceRecognitionService

COPY faceRecognitionService/package*.json ./
RUN npm install --omit=dev

WORKDIR /app
COPY common ./common
COPY faceRecognitionService ./faceRecognitionService

WORKDIR /app/faceRecognitionService

EXPOSE 4030

CMD ["npm", "start"]
