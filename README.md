# WalletConnect Bridge Server

A full introduction is described in our docs: https://docs.walletconnect.org/technical-specification

## Pre-requirements

1. NodeJS
2. RedisDB
3. Docker (for Docker setup)
4. Make (for Make commands)

## Docker setup

0. Point DNS record to your box (required for SSL)

```bash
  <YOUR_BRIDGE_URL>	   A	   192.168.1.1
```

1. Setup the bridge URL to match your DNS record

```bash
$ make setup URL=<YOUR_BRIDGE_URL>

# OR

$ sed -i -e 's/bridge.mydomain.com/<YOUR_BRIDGE_URL>/g' nginx/defaultConf && rm -rf nginx/defaultConf-e
```

2. Run the following command to build the Docker image

```bash
$ make build

# OR

$ docker build . -t node-walletconnect-bridge
```

3. Finally run the following command to run the Docker container

```bash
$ make run

# OR

$ docker run -it -v $(shell pwd)/source:/source/ -p 443:443 -p 80:80 --name "node-walletconnect-bridge" node-walletconnect-bridge
```

6. Test your Bridge is working

```bash
$ curl https://<YOUR_BRIDGE_URL>/hello
> Hello World, this is WalletConnect v1.0.0-beta
```

### Choose Branch

This setup defaults to the active branch in your current directory in order to build a Docker image from another branch, run the following command:

```bash
$ make build BRANCH=test-branch

# OR

$ docker build . -t node-walletconnect-bridge  --build-arg branch=test-branch
```

For this sample configuration file, the bridge will be available at https://<YOUR_BRIDGE_URL>/ . After specifying <YOUR_BRIDGE_URL> to 0.0.0.0 in /etc/hosts,

### Update Bridge

To update the bridge, just run the following and it will maintain the existing state of the existing bridge sessions and quickly swap containers to the new version

```bash
$ make update

# Optional (choose branch)

$ make update BRANCH=develop
```

### Skip Cerbot

This approach uses [Certbot](https://certbot.eff.org/) to generate real SSL certificates for your configured nginx hosts. If you would prefer to use the self signed certificates, you can pass the `--skip-certbot` flag to `docker run` as follows:

```bash
$ make run_no_certbot

# OR

$ docker run -it -v $(shell pwd)/source:/source/ -p 443:443 -p 80:80 --name "node-walletconnect-bridge" node-walletconnect-bridge --skip-certbot
```

Certbot certificates expire after 90 days. To renew, shut down the docker process and run `make renew`. You should back up your old certs before doing this, as they will be deleted.

## Manual setup

If would like to setup manually, make sure you have installed globally NodeJS and RedisDB.

1. First install the project dependencies

```bash
npm install
```

2. Then build the app

```bash
npm run build
```

3. Start the RedisDB server

```bash
redis-server
```

4. Run the Bridge server

```bash
NODE_ENV=production npm run start
```

6. Test your Bridge is working

```bash
$ curl localhost:5000/hello
> Hello World, this is WalletConnect v1.0.0-beta
```
