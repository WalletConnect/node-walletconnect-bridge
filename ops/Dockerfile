FROM node:10-alpine

RUN apk add --no-cache curl ca-certificates
COPY build build

ENTRYPOINT ["node", "build/"]
