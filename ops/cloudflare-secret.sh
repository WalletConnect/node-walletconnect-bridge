#!/usr/bin
project=${1}
secretName="${project}_cloudflare"

cloudflare=$(grep CLOUDFLARE config | cut -f2 -d=)
echo "MUA $cloudflare"
case $cloudflare in
  false | "N" | "NO" | "No" | "no" | "n" )
    cloudflare=false
    ;;
  * )
    cloudflare=true
    ;;
esac

echo "ME $cloudflare"
if [[ $cloudflare == false ]];then
  sed -i 's/^CLOUDFLARE=.$/CLOUDFLARE=false/g' config
else
  sed -i 's/^CLOUDFLARE=.$/CLOUDFLARE=true/g' config
  read -p "Please paste your cloudflare dns api token: " token
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
fi


