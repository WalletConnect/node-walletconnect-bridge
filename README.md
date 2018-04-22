# WalletConnect bridge

Bridge server for [walletconnect](https://walletconnect.org) protocol.

### Setup

```bash
$ git clone git@github.com:maticnetwork/walletconnect-bridge.git
$ cd walletconnect-bridge
$ npm install

# start redis
$ redis-server
```

### Development

```bash
# create config.env and change it
$ npm run dev
```

### Production

```bash
# create config-production.env and change it
$ npm run build
$ npm start
```
