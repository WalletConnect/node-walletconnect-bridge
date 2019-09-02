FROM nginx:1.17-alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY dhparams.pem /etc/ssl/dhparams.pem
COPY entry.sh /root/entry.sh
ENTRYPOINT ["bash", "/root/entry.sh"]
