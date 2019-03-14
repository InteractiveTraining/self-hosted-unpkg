FROM node:10

LABEL version="0.0.1"

WORKDIR /usr/src/app

COPY . .

EXPOSE 443
EXPOSE 80

VOLUME /usr/src/app/cache
VOLUME /usr/src/app/acme

CMD [ "npm", "run", "start" ]
