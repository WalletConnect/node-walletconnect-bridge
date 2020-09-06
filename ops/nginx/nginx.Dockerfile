FROM nginx:1.17-alpine

RUN apk add --update --no-cache certbot openssl bash && \
  ln -fs /dev/stdout /var/log/nginx/access.log && \
  ln -fs /dev/stdout /var/log/nginx/error.log

COPY ./nginx.conf /etc/nginx/nginx.conf
COPY ./dhparams.pem /etc/ssl/dhparams.pem
COPY ./entry.sh /root/entry.sh

ENTRYPOINT ["/bin/bash", "/root/entry.sh"]
