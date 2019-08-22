FROM node:10

LABEL version="0.0.3"

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

VOLUME /usr/src/app

EXPOSE 8080

CMD [ "npm", "run", "start" ]