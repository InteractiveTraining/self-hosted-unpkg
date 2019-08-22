# self-hosted-unpkg

## Requirements
- Registry token or credentials (if you want to allow access to private packages)
- Redis (if you want short-term file caching to reduce registry load)

### For HTTPS
 - Cloudflare credentials (used to verify domain with Lets Encrypt)
 - Google Cloud Storage + service account (for storing SSL cert/key)


## Example
Create .env file. (see http.sample.env) and run:

```bash
docker run -it --rm -p 443:443 -p 80:80 --env-file ./.env --name self-hosted-unpkg interactivetraining/self-hosted-unpkg
```



[![Run on Google Cloud](https://storage.googleapis.com/cloudrun/button.svg)](https://console.cloud.google.com/cloudshell/editor?shellonly=true&cloudshell_image=gcr.io/cloudrun/button&cloudshell_git_repo=https://github.com/InteractiveTraining/self-hosted-unpkg&cloudshell_git_branch=run-test)
