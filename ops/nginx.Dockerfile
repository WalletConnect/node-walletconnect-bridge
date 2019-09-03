FROM nginx:1.17-alpine

RUN apk add --update --no-cache certbot openssl

COPY ./ops/nginx.conf /etc/nginx/nginx.conf
COPY ./ops/dhparams.pem /etc/ssl/dhparams.pem
COPY ./ops/entry.sh /root/entry.sh

ENTRYPOINT ["bash", "/root/entry.sh"]
