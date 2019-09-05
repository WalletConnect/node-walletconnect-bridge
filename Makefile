### Deploy configs
BRANCH=$(shell git for-each-ref --format='%(objectname) %(refname:short)' refs/heads | awk "/^$$(git rev-parse HEAD)/ {print \$$2}")
REMOTE="https://github.com/WalletConnect/node-walletconnect-bridge"
REMOTE_HASH=$(shell git ls-remote $(REMOTE) $(BRANCH) | head -n1 | cut -f1)
project=walletconnect
redisImage='redis:5-alpine'
nginxImage='walletconnect/nginx:$(BRANCH)'
walletConnectImage='walletconnect/proxy:$(BRANCH)'

BRIDGE_URL=$(shell cat config | grep BRIDGE_URL | cut -f2 -d=)
CERTBOT_EMAIL=$(shell cat config | grep CERTBOT_EMAIL | cut -f2 -d=)

### Makefile internal coordination
flags=.makeFlags
VPATH=$(flags)

$(shell mkdir -p $(flags))

.PHONY: all clean default

### Rules
default:
	@echo
	@echo "Available make rules: "
	@echo "pull:          pulls docker images"
	@echo "setup:         configures domain an certbot email"
	@echo "build:         builds docker images"
	@echo "dev:           runs local docker stack with open ports"
	@echo "deploy-prod:   deploys to production"
	@echo "stop:          stops all walletconnect docker stacks"
	@echo "upgrade-prod:  stops current docker stack. Pulls from remote git. Runs deploys production using deploy-prod rule"
	@echo "clean:         cleans current docker build"
	@echo "reset:         reset local config"

pull:
	docker pull $(redisImage)
	@touch $(flags)/$@

setup:
	@read -p 'Bridge URL domain: ' bridge; \
	echo "BRIDGE_URL="$$bridge > config
	@read -p 'Email for SSL certificate: ' email; \
	echo "CERTBOT_EMAIL="$$email >> config
	@touch $(flags)/$@

build-node: pull
	docker build \
		-t $(walletConnectImage) \
		--build-arg BRANCH=$(BRANCH) \
		--build-arg REMOTE_HASH=$(REMOTE_HASH) \
		-f ops/node.Dockerfile .
	@touch $(flags)/$@

build-nginx: pull
	docker build \
		-t $(nginxImage) \
		--build-arg BRANCH=$(BRANCH) \
		--build-arg REMOTE_HASH=$(REMOTE_HASH) \
		-f ops/nginx.Dockerfile .
	@touch $(flags)/$@

build: pull build-node build-nginx
	@touch $(flags)/$@

dev: build
	WALLET_IMAGE=$(walletConnectImage) \
	NGINX_IMAGE=$(nginxImage) \
	docker stack deploy \
	-c ops/docker-compose.yml \
	-c ops/docker-compose.dev.yml \
	dev_$(project)
	@echo "Done with deoploying... attaching to nginx container logs..."
	docker service logs -f --raw $(project)_nginx

deploy-prod: setup build
	WALLET_IMAGE=$(walletConnectImage) \
	NGINX_IMAGE=$(nginxImage) \
	BRIDGE_URL=$(BRIDGE_URL) \
	CERTBOT_EMAIL=$(CERTBOT_EMAIL) \
	docker stack deploy -c ops/docker-compose.yml \
	-c ops/docker-compose.prod.yml $(project)
	@echo "Done with deoploying... attaching to nginx container logs..."
	docker service logs -f --raw $(project)_nginx

stop: 
	docker stack rm $(project)
	docker stack rm dev_$(project)
	while [[ -n "`docker network ls --quiet --filter label=com.docker.stack.namespace=$(project)`" ]]; do echo -n '.' && sleep 3; done
	while [[ -n "`docker network ls --quiet --filter label=com.docker.stack.namespace=dev_$(project)`" ]]; do echo -n '.' && sleep 3; done

upgrade-prod: stop
	git pull
	$(MAKE) deploy-prod

reset:
	rm -rf .makeFlags
	rm -f config

clean:
	rm -rf .makeFlags/build*
