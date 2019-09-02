### Deploy configs
BRANCH=$(shell git for-each-ref --format='%(objectname) %(refname:short)' refs/heads | awk "/^$$(git rev-parse HEAD)/ {print \$$2}")
REMOTE="https://github.com/WalletConnect/py-walletconnect-bridge"
REMOTE_HASH=$(shell git ls-remote $(REMOTE) $(BRANCH) | head -n1 | cut -f1)
project=walletconnect
redisImage='redis:5-alpine'
nginxImage='nginx:1.17-alpine'
walletConnectImage='walletconnect/proxy:$(BRANCH)'
URL=wc.sasquatch.network

### Makefile internal coordination
flags=.makeFlags
VPATH=$(flags)

$(shell mkdir -p $(flags))

.PHONY: all clean

### Rules
default:
	echo "Available tasks: setup, pull, build, run, stop"

setup:
	sed -i -e 's/bridge.mydomain.com/$(URL)/g' ./ops/nginx.conf
	npm install
	touch $(flags)/$@

pull:
	docker pull $(redisImage)
	docker pull $(nginxImage)
	touch $(flags)/$@

build: pull setup
	npm run build
	docker build \
		-t $(walletConnectImage) \
		--build-arg BRANCH=$(BRANCH) \
		--build-arg REMOTE_HASH=$(REMOTE_HASH) \
		-f ops/Dockerfile .
	touch $(flags)/$@

redis:
	docker run -p 6379:6379 $(redisImage)

dev: build
	WALLET_IMAGE=$(walletConnectImage) \
	docker stack deploy -c ops/dev.docker-compose.yml dev-$(project)

run: build
	WALLET_IMAGE=$(walletConnectImage) \
	docker stack deploy -c ops/docker-compose.yml $(project)

stop: 
	docker stack rm $(project)
	docker stack rm dev-$(project)

clean:
	rm -rf .makeFlags
	git checkout ops/nginx.conf
