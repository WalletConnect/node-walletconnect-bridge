#!/bin/bash

# Set default variables
root_domain="${DOMAIN_URL:-localhost}"
manage_root_domain=${MANAGE_ROOT_DOMAIN:-true}
email="${EMAIL:-noreply@gmail.com}"
docker_containers="${SUBDOMAINS}"
node_env="${NODE_ENV:-development}"
node_port="${NODE_PORT:-5001}"
node_qty="${NODE_QTY:-5}"

echo
echo "
USING ENVVARS:
root_domain=$root_domain
docker containers to proxy pass to (docker_containers)=$docker_containers
cert email=$email
node_env=$node_env
node_port=$node_port
node_qty=$node_qty
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

function configRootDomain () {
  domain=$1
  echo "ROOT DOMAIN: $domain"
  makeCert $domain $LETSNECRYPT/$domain

  configPath="$SERVERS/$domain.conf"

  if [[ "$node_qty" -gt 1 ]]; then
    echo
  fi
  cat - > $configPath <<EOF
upstream bridge {
  #hash   \$request_uri consistent;
  #hash   \$remote_addr consistent;
  #hash    \$http_user_agent\$request_uri\$remote_addr consistent;
  hash    \$http_user_agent\$remote_addr consistent;
  server node1:$node_port;
  server node2:$node_port;
  server node3:$node_port;
  server node4:$node_port;
  server node5:$node_port;
}
server {
  listen 80;
  server_name $domain;
  location / {
    return 301 https://\$host\$request_uri;
  }
}

### HTTPS
server {
  listen 443 ssl;
  server_name $domain;
  # https://stackoverflow.com/questions/35744650/docker-network-nginx-resolver
  resolver 127.0.0.11 valid=30s;
 
  ssl_dhparam               /etc/ssl/dhparams.pem;
  ssl_certificate           /etc/letsencrypt/live/$domain/fullchain.pem;
  ssl_certificate_key       /etc/letsencrypt/live/$domain/privkey.pem;
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
      proxy_pass              http://bridge;
  }
}
EOF
}

# periodically fork off & see if our certs need to be renewed
function renewcerts {
  while true
  do
    echo -n "Preparing to renew certs... "
    if [[ -d "/etc/letsencrypt/live/$domain" ]]
    then
      echo -n "Found certs to renew for $domain... "
      certbot renew --webroot -w /var/www/letsencrypt/ -n
      echo "Done!"
    fi
    sleep 48h
  done
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

  if [ $manage_root_domain ]; then
    configRootDomain $root_domain $node_qty
  fi

  if [[ "$domain" != "localhost" ]]
  then
    echo "Forking renewcerts to the background..."
    renewcerts &
  fi

  sleep 3 # give renewcerts a sec to do it's first check

  echo "Entrypoint finished, executing nginx..."; echo
  exec nginx
}

main
