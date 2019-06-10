FROM ubuntu:16.04

# minimal apk dependencies to be safe
ENV PACKAGES="ca-certificates git redis-server nginx software-properties-common python-software-properties nodejs"
ENV NODE_ENV="production"
ENV HOST="0.0.0.0:5000"

WORKDIR /usr/src/app

COPY package*.json yarn.lock ./
RUN apt update
RUN apt install -y curl sudo
RUN curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash

RUN apt install -y $PACKAGES
RUN npm i -g yarn
RUN yarn --prod

RUN add-apt-repository ppa:certbot/certbot
RUN apt-get update
RUN apt-get install -y python-certbot-nginx
    
COPY source /source

# Run as non-root user for security
# USER 1000

# Expose app port (5000/tcp)
EXPOSE 5000

# CMD [ "yarn", "start" ]

COPY docker-entrypoint.sh /bin/
RUN sudo chmod +x /bin/docker-entrypoint.sh
ENTRYPOINT ["/bin/docker-entrypoint.sh"]

