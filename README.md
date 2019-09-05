# WalletConnect Bridge Server

Bridge Server for relaying WalletConnect connections

## Development

Local dev work is using local self signed certificates withing the docker environment.

Your Walletconnect enabled app needs to be on the same local network.

```
make dev # ports 80, 443, 5001, 6379 will be exposed locally
```

## Production

### Using Docker

#### Setting up docker

Depending on your system you will need to have docker swarm enabled:

- docker

```bash
docker swarm init
```

### Deploying

1. Build the containers with:

```bash
make build
```

2. Run the container with:

```bash
# Using default BRIDGE_URL of `test-bridge.walletconnect.org`
make deploy-prod 

# Using custom bridge url
BRIDGE_URL=custom.bridge.com make deploy-prod
```

3. Server accessible from domain:

```bash
$ curl https://test-bridge.walletconnect.org/hello
> Hello World, this is WalletConnect v1.0.0-beta
```
