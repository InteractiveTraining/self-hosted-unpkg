# self-hosted-unpkg

## Run locally
Create .env file. (see sample.env) and run:

```bash
docker run -it --rm -p 443:443 -p 80:80 --env-file ./.env --name self-hosted-unpkg interactivetraining/self-hosted-unpkg
```

## Kubernetes Deployment

### Create a secret from your env file
```bash
kubectl create secret generic __MY_SECRET_NAME__ --from-env-file ./path/to/.env
```

### Add each variable to your deployment
```yaml
apiVersion: extensions/v1beta1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - env:
        - name: DOMAIN
          valueFrom:
            secretKeyRef:
              key: DOMAIN
              name: __MY_SECRET_NAME__
        - name: NPM_REGISTRY
          valueFrom:
            secretKeyRef:
              key: NPM_REGISTRY
              name: __MY_SECRET_NAME__
        - name: NPM_TOKEN
          valueFrom:
            secretKeyRef:
              key: NPM_TOKEN
              name: __MY_SECRET_NAME__
        - name: CLOUDFLARE_EMAIL
          valueFrom:
            secretKeyRef:
              key: CLOUDFLARE_EMAIL
              name: __MY_SECRET_NAME__
        - name: CLOUDFLARE_API_KEY
          valueFrom:
            secretKeyRef:
              key: CLOUDFLARE_API_KEY
              name: __MY_SECRET_NAME__
        - name: LETS_ENCRYPT_EMAIL
          valueFrom:
            secretKeyRef:
              key: LETS_ENCRYPT_EMAIL
              name: __MY_SECRET_NAME__
        - name: LETS_ENCRYPT_AGREE_TO_TOS
          valueFrom:
            secretKeyRef:
              key: LETS_ENCRYPT_AGREE_TO_TOS
              name: __MY_SECRET_NAME__
        - name: GOOGLE_CLOUD_BUCKET_NAME
          valueFrom:
            secretKeyRef:
              key: GOOGLE_CLOUD_BUCKET_NAME
              name: __MY_SECRET_NAME__
        - name: GOOGLE_CLOUD_PROJECT_ID
          valueFrom:
            secretKeyRef:
              key: GOOGLE_CLOUD_PROJECT_ID
              name: __MY_SECRET_NAME__
        - name: GOOGLE_CLOUD_CERT_DB_FILE
          valueFrom:
            secretKeyRef:
              key: GOOGLE_CLOUD_CERT_DB_FILE
              name: __MY_SECRET_NAME__
        - name: GOOGLE_CLOUD_CLIENT_EMAIL
          valueFrom:
            secretKeyRef:
              key: GOOGLE_CLOUD_CLIENT_EMAIL
              name: __MY_SECRET_NAME__
        - name: GOOGLE_CLOUD_PRIVATE_KEY
          valueFrom:
            secretKeyRef:
              key: GOOGLE_CLOUD_PRIVATE_KEY
              name: __MY_SECRET_NAME__
        - name: ENABLE_SSL
          valueFrom:
            secretKeyRef:
              key: ENABLE_SSL
              name: __MY_SECRET_NAME__
        image: interactivetraining/self-hosted-unpkg:latest
        imagePullPolicy: Always
        name: self-hosted-unpkg
```
