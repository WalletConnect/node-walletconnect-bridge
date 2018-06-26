# WalletConnect bridge

Bridge server for [walletconnect](https://walletconnect.org) standard.

### Setup

```bash
$ git clone git@github.com:walletconnect/node-walletconnect-bridge.git
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
