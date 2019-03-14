# self-hosted-unpkg

## How to run
Create .env file. (see sample.env) and run:

```bash
docker run -it --rm -p 443:443 -p 80:80 -v /local/path/to/cache:/usr/src/app/cache -v /local/path/to/ssl/acme:/usr/src/app/acme --env-file ./.env --name self-hosted-unpkg interactivetraining/self-hosted-unpkg
```
