FROM node:10

LABEL version="0.0.3"

WORKDIR /usr/src/app

COPY . .

RUN npm install

VOLUME /usr/src/app

CMD [ "npm", "run", "start" ]
