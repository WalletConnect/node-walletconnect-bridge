#!/usr/bin/env bash

monitoring=${MONITORING:-false}

export BRIDGE_URL=$(grep BRIDGE_URL config | cut -f2 -d=)
export CERTBOT_EMAIL=$(grep CERTBOT_EMAIL config | cut -f2 -d=)
export CLOUDFLARE=$(grep CLOUDFLARE config | cut -f2 -d=)
# Having cloudflare as true determines whether the server
cloudflare=true
case $CLOUDFLARE in
  "N" )
    cloudflare=false ;;
  false )
    cloudflare=false ;;
  "NO" )
    cloudflare=false ;;
  "No" )
    cloudflare=false ;;
esac
export CLOUDFLARE=$cloudflare

run="docker stack deploy $run $PROJECT -c ops/docker-compose.yml -c ops/docker-compose.prod.yml "
if [[ $cloudflare != false ]]; then
  run="${run} -c /tmp/secrets-compose.yml"
fi

if [[ $monitoring ]]; then
  run="${run} -c ops/docker-compose.monitor.yml"
fi

printf "\nDeploy command: $run\n\n"
exec $run
