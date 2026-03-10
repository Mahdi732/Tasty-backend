FROM node:20-alpine

WORKDIR /app/restaurantService

COPY restaurantService/package*.json ./
RUN npm install

WORKDIR /app
COPY common ./common
COPY restaurantService ./restaurantService

WORKDIR /app/restaurantService

EXPOSE 4010
CMD ["npm", "start"]
