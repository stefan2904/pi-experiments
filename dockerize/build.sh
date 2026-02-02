#!/bin/bash

VERSION=${1:-latest}
BUILDARGS="--build-arg UID=$(id -u) --build-arg GID=$(id -g) --build-arg VERSION=$VERSION"

docker build $BUILDARGS -t pi-coding-agent -f Dockerfile.release .
#docker build $BUILDARGS -t pi-coding-agent -f Dockerfile.git .
