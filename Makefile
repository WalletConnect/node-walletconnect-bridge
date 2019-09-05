### Deploy configs
BRANCH=$(shell git for-each-ref --format='%(objectname) %(refname:short)' refs/heads | awk "/^$$(git rev-parse HEAD)/ {print \$$2}")
REMOTE="https://github.com/WalletConnect/node-walletconnect-bridge"
REMOTE_HASH=$(shell git ls-remote $(REMOTE) $(BRANCH) | head -n1 | cut -f1)
project=walletconnect
redisImage='redis:5-alpine'
nginxImage='walletconnect/nginx:$(BRANCH)'
walletConnectImage='walletconnect/proxy:$(BRANCH)'

BRIDGE_URL ?= test-bridge.walletconnect.org

### Makefile internal coordination
flags=.makeFlags
VPATH=$(flags)

$(shell mkdir -p $(flags))

.PHONY: all clean default

### Rules
default:
	echo "Available tasks: pull, build, dev, deploy-prod, stop, clean"

pull:
	docker pull $(redisImage)
	touch $(flags)/$@

build-node: pull
	docker build \
		-t $(walletConnectImage) \
		--build-arg BRANCH=$(BRANCH) \
		--build-arg REMOTE_HASH=$(REMOTE_HASH) \
		-f ops/node.Dockerfile .
	touch $(flags)/$@

build-nginx: pull
	docker build \
		-t $(nginxImage) \
		--build-arg BRANCH=$(BRANCH) \
		--build-arg REMOTE_HASH=$(REMOTE_HASH) \
		-f ops/nginx.Dockerfile .
	touch $(flags)/$@

build: pull build-node build-nginx
	touch $(flags)/$@

redis:
	docker run -p 6379:6379 $(redisImage)

dev: build
	WALLET_IMAGE=$(walletConnectImage) \
	NGINX_IMAGE=$(nginxImage) \
	docker stack deploy \
	-c ops/docker-compose.yml \
	-c ops/docker-compose.dev.yml \
	dev_$(project)

deploy-prod: build
	WALLET_IMAGE=$(walletConnectImage) \
	NGINX_IMAGE=$(nginxImage) \
	BRIDGE_URL=$(BRIDGE_URL) \
	CERTBOT_EMAIL=admin@walletconnect.org \
	docker stack deploy -c ops/docker-compose.yml \
	-c ops/docker-compose.prod.yml $(project)

stop: 
	docker stack rm $(project)
	docker stack rm dev_$(project)

clean:
	rm -rf .makeFlags
	git checkout ops/nginx.conf
