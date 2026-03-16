FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY src ./src
COPY .env.example ./.env.example

EXPOSE 4050 50055

CMD ["npm", "start"]
