# make targets for WalletConnect/node-walletconnect-bridge

HASH := $(shell git rev-parse HEAD)
URL=bridge.mydomain.com
.PHONY: all test clean

default:
	echo "Available tasks: setup, build, clean, renew, run, run_skip_certbot, run_daemon, run_daemon_skip_certbot, update"

setup:
	sed -i -e 's/bridge.mydomain.com/$(URL)/g' $(shell pwd)/source:/source/nginx/defaultConf && rm -rf $(shell pwd)/source:/source/nginx/defaultConf-e

build:
	docker build . -t walletconnect/node-walletconnect-bridge 

clean:
	sudo rm -rfv ssl/certbot/* && docker rm -f node-walletconnect-bridge

renew:
	make clean && make run

run:
	docker run -it -v $(shell pwd)/source:/source/ -p 443:443 -p 80:80 --name "node-walletconnect-bridge" walletconnect/node-walletconnect-bridge

run_skip_certbot:
	docker run -it -v $(shell pwd)/source:/source/ -p 443:443 -p 80:80 --name "node-walletconnect-bridge" walletconnect/node-walletconnect-bridge --skip-certbot

run_daemon:
	docker run -it -d -v $(shell pwd)/source:/source/ -p 443:443 -p 80:80 --name "node-walletconnect-bridge" walletconnect/node-walletconnect-bridgerm -

run_daemon_skip_certbot:
	docker run -it -d -v $(shell pwd)/source:/source/ -p 443:443 -p 80:80 --name "node-walletconnect-bridge" walletconnect/node-walletconnect-bridge run_daemon --skip-certbot

update:
	# build a new image
	make build

	# save current state of DB and copy it to local machine
	docker exec node-walletconnect-bridge redis-cli SAVE
	docker cp node-walletconnect-bridge:/node-walletconnect-bridge/dump.rdb dump.rdb

	# stop existing container instance
	docker container rm -f node-walletconnect-bridge

	# start the container with `-d` to run in background
	make run_daemon

	# stop the redis server, copy the previous state and restart the server
	docker exec node-walletconnect-bridge redis-cli SHUTDOWN
	docker cp dump.rdb node-walletconnect-bridge:/node-walletconnect-bridge/dump.rdb
	docker exec node-walletconnect-bridge chown redis: /node-walletconnect-bridge/dump.rdb
	docker exec -d node-walletconnect-bridge redis-server
	rm dump.rdb
