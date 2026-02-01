#!/bin/bash

docker run --rm -it \
  -v "$PWD":/workspace \
  -w /workspace \
  --env-file .env \
  pi-coding-agent "$@"
