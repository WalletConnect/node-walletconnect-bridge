FROM ubuntu:16.04
ARG branch=master
RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y \
  nodejs \
  yarn \
  git \
  redis-server \
  nginx \
  software-properties-common
RUN add-apt-repository ppa:certbot/certbot
RUN apt-get update
RUN apt-get install -y python-certbot-nginx
ARG revision
RUN git clone https://github.com/WalletConnect/node-walletconnect-bridge
WORKDIR /node-walletconnect-bridge
RUN git checkout ${branch}
RUN npm install
RUN yarn start
COPY docker-entrypoint.sh /bin/
RUN chmod +x /bin/docker-entrypoint.sh
ENTRYPOINT ["/bin/docker-entrypoint.sh"]
EXPOSE 5000
