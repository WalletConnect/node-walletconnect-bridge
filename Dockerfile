FROM ubuntu:16.04

# minimal apk dependencies to be safe
ENV PACKAGES="ca-certificates git redis-server nginx software-properties-common python-software-properties nodejs"

RUN apt-get update
RUN apt-get install -y curl sudo
RUN curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash

RUN apt-get install -y ${PACKAGES}

RUN add-apt-repository universe
RUN add-apt-repository ppa:certbot/certbot
RUN apt-get update
RUN apt-get install certbot python-certbot-nginx  -y

# RUN groupadd --gid 1000 dockeruser
# RUN useradd --uid 1000 --gid 1000 dockeruser

# Run as non-root user for security
# USER 1000

WORKDIR /usr/src/app

COPY src src
COPY package.json .
COPY .babelrc .
COPY babel-polyfill.js .
COPY tsconfig.json .
COPY tslint.json .
RUN npm install  # installing all dependencies

RUN npm run build

COPY docker-entrypoint.sh /bin/
RUN sudo chmod +x /bin/docker-entrypoint.sh

ENTRYPOINT ["/bin/docker-entrypoint.sh"]

