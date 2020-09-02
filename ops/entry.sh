#!/bin/bash

# Set default variables
domain="${DOMAIN_URL:-localhost}"
email="${EMAIL:-noreply@gmail.com}"
subdomains="${SUBDOMAINS}"
node_env="${NODE_ENV:-development}"
node_docker_name="${NODE_DOCKER_NAME:-node}"
node_port="${NODE_PORT:-5001}"

echo "
USING ENVVARS:
domain=$domain
subdomains=$subdomains
email=$email
node_env=$node_env
node_docker_name=$node_docker_name
node_port=$node_port
"

# Setup SSL Certs
letsencrypt=/etc/letsencrypt/live
servers=/etc/nginx/servers
mkdir -p /var/www/letsencrypt
mkdir -p $servers

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

for sub in $subdomains; do
  echo "SUB: $sub"
  port=$(echo $sub | cut -d':' -f 2)
  sub=$(echo $sub | cut -d':' -f 1)
  makeCert "$sub.$domain" "$letsencrypt/$sub.$domain"
  cat - > "$servers/$sub.$domain.conf" <<EOF
server {
  listen  80;
  server_name $sub.$domain;
  location / {
    return 301 https://\$host\$request_uri;
  }
}
server {
  listen  443 ssl;
  ssl_certificate       /etc/letsencrypt/live/$sub.$domain/fullchain.pem;
  ssl_certificate_key   /etc/letsencrypt/live/$sub.$domain/privkey.pem;
  server_name $sub.$domain;
  location / {
		proxy_pass "http://$sub:$port";
  }
}
EOF
done

echo "ROOT DOMAIN: $domain"
makeCert $domain $letsencrypt/$domain

cat - > "$servers/$domain.conf" <<EOF
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

if [[ "$domain" != "localhost" ]]
then
  echo "Forking renewcerts to the background..."
  renewcerts &
fi

sleep 3 # give renewcerts a sec to do it's first check

echo "Entrypoint finished, executing nginx..."; echo
exec nginx

