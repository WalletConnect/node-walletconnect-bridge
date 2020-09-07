#!/usr/bin/env bash

originalCompose=$(cat ./docker-compose.prod.yml)


cat - > /tmp/$PORJECT.prod.yml <<EOF
  $originalCompose
    depends_on:
  node1:
    image: ${WALLET_IMAGE}
    environment:
      NODE_ENV: production
      REDIS_URL: redis://redis:6379/0
  node2:
    image: ${WALLET_IMAGE}
    environment:
      NODE_ENV: production
      REDIS_URL: redis://redis:6379/0
  node3:
    image: ${WALLET_IMAGE}
    environment:
      NODE_ENV: production
      REDIS_URL: redis://redis:6379/0
  node4:
    image: ${WALLET_IMAGE}
    environment:
      NODE_ENV: production
      REDIS_URL: redis://redis:6379/0
  node5:
    image: ${WALLET_IMAGE}
    environment:
      NODE_ENV: production
      REDIS_URL: redis://redis:6379/0
EOF
