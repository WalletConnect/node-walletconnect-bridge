#!/bin/bash

# Set default variables
root_domain="${DOMAIN_URL:-localhost}"
manage_root_domain=${MANAGE_ROOT_DOMAIN:-true}
email="${EMAIL:-noreply@gmail.com}"
docker_containers="${SUBDOMAINS}"
app_container_dns_name="${CONTAINER_NAME}"
app_env="${APP_ENV:-development}"
app_port="${APP_PORT:-5001}"
app_qty="${APP_QTY:-5}"

echo
echo "
USING ENVVARS:
root_domain=$root_domain
docker containers to proxy pass to (docker_containers)=$docker_containers
cert email=$email
app_env=$app_env
app_port=$app_port
app_qty=$app_qty
"
echo

LETSENCRYPT=/etc/letsencrypt/live
SERVERS=/etc/nginx/servers

function makeCert () {
  fullDomain=$1
  certpath=$2
  if [[ "$fullDomain" == "localhost" && ! -f "$certpath/privkey.pem" ]]
  then
    echo "Developing locally, generating self-signed certs"
    openssl req -x509 -newkey rsa:4096 -keyout $certpath/privkey.pem -out $certpath/fullchain.pem -days 365 -nodes -subj '/CN=localhost'
  fi

  if [[ ! -f "$certpath/privkey.pem" ]]
  then
    echo "Couldn't find certs for $fullDomain, using certbot to initialize those now.."
    certbot certonly --standalone -m $email --agree-tos --no-eff-email -d $fullDomain -n
    if [[ ! $? -eq 0 ]] 
    then
      echo "ERROR"
      echo "Sleeping to not piss off certbot"
      sleep 9999 # FREEZE! Don't pester eff & get throttled
    fi
  fi
  if [[ "$fullDomain" != "localhost" ]]
  then
    echo "Forking renewcerts to the background..."
    renewcerts $fullDomain &
  fi
}

function waitForContainerToBeUp () {
  count=0
  while true; do
    ping -c 1 $1
    if [ $1 ]; then
      break
    fi
    if [[ $count -gt 20 ]]; then
      echo "Container $1 is not live! Exiting"
      exit 1
    fi
    count=$((1 + $count))
  done
}

function configSubDomain () {
  subDomain=$1
  dockerPort=$2
  rootDomain=$3
  fullDomain=$subDomain.$rootDomain
  echo "Full subdomain: $fullDomain"
  makeCert "$fullDomain" "$LETSENCRYPT/$rootDomain"
  cat - > "$SERVERS/$fullDomain.conf" <<EOF
server {
  listen  80;
  server_name $fullDomain;
  location / {
    return 301 https://\$host\$request_uri;
  }
}
server {
  listen  443 ssl;
  ssl_certificate       $LETSENCRYPT/$fullDomain/fullchain.pem;
  ssl_certificate_key   $LETSENCRYPT/$fullDomain/privkey.pem;
  server_name $fullDomain;
  location / {
		proxy_pass "http://$subDomain:$dockerPort";
  }
}
EOF
}

function configLoadBalancingForApp () {
  configPath="${1:-$SERVERS/$1}"
  appQty=${2:-1}
  port=${3:-5001}
  dockerContainerName=$4
  if [[ ! $dockerContainerName ]]; then
    printf "Need to give the docker name of the main app. Quitting...\n"
    exit 1
  fi
  cat - >> $configPath<<EOF
upstream app {
# request_uri is used in this situation because
# it is compatible with both the random uuid that the stress
# does and the production server uri of "" (no uri).
# This allows us to to test the stress and to make it work for
# the production environment
  hash    \$request_uri\$http_user_agent\$remote_addr consistent;
EOF
  for i in $(seq 0 $((appQty - 1))); do
    echo "server $dockerContainerName$i:$port;" >> $configPath
  done
  echo "}" >> $configPath
}

function configRootDomain () {
  domain=$1
  printf "\nROOT DOMAIN: $domain\n"
  makeCert $domain $LETSENCRYPT/$domain
  configPath="$SERVERS/$domain.conf"
  cat - > $configPath <<EOF
server {
  listen 80;
  server_name $domain;
  location / {
    return 301 https://\$host\$request_uri;
  }
}
server {
  listen 443 ssl;
  server_name $domain;
  # https://stackoverflow.com/questions/35744650/docker-network-nginx-resolver
  resolver 127.0.0.11 valid=30s;
 
  ssl_dhparam               /etc/ssl/dhparams.pem;
  ssl_certificate           $LETSENCRYPT/$domain/fullchain.pem;
  ssl_certificate_key       $LETSENCRYPT/$domain/privkey.pem;
  ssl_session_cache         shared:SSL:4m;  # This is size not duration
  ssl_session_timeout       1m;
  ssl_protocols             TLSv1.2 TLSv1.3; 
  ssl_prefer_server_ciphers on;
  ssl_ecdh_curve            secp384r1;
  ssl_ciphers 'ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384';

  location / {
      proxy_read_timeout      30;
      proxy_http_version      1.1;
      proxy_set_header        Upgrade \$http_upgrade;
      proxy_set_header        Connection "Upgrade";
      proxy_set_header        Host \$host;
      proxy_set_header        http_x_forwarded_for  \$remote_addr;
      set \$upstream bridge;
      proxy_pass              http://app;
  }
}
EOF
}

# periodically fork off & see if our certs need to be renewed
function renewcerts {
  domain=$1
  while true
  do
    printf "Preparing to renew certs... "
    if [[ -d "$LETSENCRYPT/$domain" ]]
    then
      printf "Found certs to renew for $domain... "
      certbot renew --webroot -w /var/www/letsencrypt/ -n
      echo "Done!"
    fi
    sleep 48h
  done
}

function checkDNS () {
  domain=$1
  # TODO
  # Use netcat to check whether it can be connected to
  # at the address nslookup
}

function main () {
  # Setup SSL Certs
  mkdir -p $LETSENCRYPT
  mkdir -p $SERVERS

  for container_port in $docker_containers; do
    port=$(echo $container_port | cut -d':' -f 2)
    container=$(echo $container_port | cut -d':' -f 1)
    waitForContainerToBeUp $container
    configSubDomain $container $port $root_domain 
  done

  if [[ $manage_root_domain ]]; then
    configRootDomain $root_domain
    #arguments: configPath appQty port dockerContainerName
    configLoadBalancingForApp "$SERVERS/$root_domain.conf" \
      $app_qty \
      $app_port \
      $app_container_dns_name
  fi


  sleep 4 # give renewcerts a sec to do it's first check

  echo "Entrypoint finished, executing nginx..."; echo
  exec nginx
}

main
