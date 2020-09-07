version: '3.7'

services:
  nginx:
    environment:
      #DOMAIN_URL: ${BRIDGE_URL}
      EMAIL: ${CERTBOT_EMAIL}
      APP_ENV: production
      APP_CONTAINER_NAME: ${APP_CONTAINER_NAME}
      APP_PORT: 5000

