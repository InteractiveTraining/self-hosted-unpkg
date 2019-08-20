#!/usr/bin/env bash

while [[ "$#" -gt 0 ]]; do case $1 in
  -v|--version) version="$2"; shift;;
  *) echo "Unknown parameter passed: $1"; exit 1;;
esac; shift; done

npm run build

docker build -t "interactivetraining/self-hosted-unpkg:latest" .
docker tag "interactivetraining/self-hosted-unpkg:latest" "interactivetraining/self-hosted-unpkg:$version"
docker tag "interactivetraining/self-hosted-unpkg:latest" "docker.pkg.github.com/interactivetraining/self-hosted-unpkg/self-hosted-unpkg:latest"
docker tag "interactivetraining/self-hosted-unpkg:latest" "docker.pkg.github.com/interactivetraining/self-hosted-unpkg/self-hosted-unpkg:$version"

docker push "interactivetraining/self-hosted-unpkg:latest"
docker push "interactivetraining/self-hosted-unpkg:$version"

docker push "docker.pkg.github.com/interactivetraining/self-hosted-unpkg/self-hosted-unpkg:latest"
docker push "docker.pkg.github.com/interactivetraining/self-hosted-unpkg/self-hosted-unpkg:$version"