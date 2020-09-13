#!/usr/bin

project=${1}
secretName="${project}_cloudflare"


read -p "Please paste your cloudflare api token: " token
docker secret rm $secretName
printf $token | docker secret create $secretName -

cat - > /tmp/${project}.secrets.yml<<EOF
version: '3.7'
services: 

secrets:
  $secretName:
    external: true

services:
  nginx:
    secrets:
      - ${secretName}
EOF
