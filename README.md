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

Dependencies:
- docker
- make

You will need to have docker swarm enabled:
```bash
docker swarm init
```

### Deploying

Run the following command and fill in the prompts:

```bash
make deploy-prod
```

### Upgrading

```bash
make upgrade-prod
```
