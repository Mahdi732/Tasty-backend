FROM node:20-alpine

WORKDIR /app/apiGateway

RUN apk add --no-cache openssl

COPY apiGateway/package*.json ./
RUN npm install

WORKDIR /app
COPY common ./common
COPY apiGateway ./apiGateway

WORKDIR /app/apiGateway

RUN mkdir -p certs && \
	openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 365 \
	-keyout certs/key.pem -out certs/cert.pem -subj "/CN=localhost"

EXPOSE 443
CMD ["npm", "start"]
