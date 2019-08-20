#!/usr/bin/env bash

while [[ "$#" -gt 0 ]]; do case $1 in
  -v|--version) version="$2"; shift;;
  *) echo "Unknown parameter passed: $1"; exit 1;;
esac; shift; done

npm run build
docker build -t "interactivetraining/self-hosted-unpkg:$version" .
docker push "interactivetraining/self-hosted-unpkg:$version"