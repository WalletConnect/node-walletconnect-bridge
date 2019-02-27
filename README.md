# WalletConnect Bridge Server

Bridge Server for relaying WalletConnect connections

## Development

```bash
yarn dev
```

## Production

### Using NPM

1. Build

```bash
yarn build
```

2. Production

```bash
yarn start
```

3. Server accessible from host:

```bash
$ curl http://localhost:5000/hello
> Hello World, this is WalletConnect v1.0.0-beta
```

### Using Docker

1. Build the container with:

```bash
make build-docker
```

2. Run the container with:

```bash
docker run -p 5000:5000 walletconnect/node-walletconnect-bridge
```

3. Server accessible from host:

```bash
$ curl http://localhost:5000/hello
> Hello World, this is WalletConnect v1.0.0-beta
```
