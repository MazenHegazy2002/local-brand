# LocalBrand Production Deployment Guide

This guide outlines exactly how to deploy the **LocalBrand** Next.js application to a production server (e.g., AWS EC2, DigitalOcean Droplet, Hetzner, or a custom bare-metal server).

## 🚀 Prerequisites

Your production server must have the following installed:
1. **Docker Engine**
2. **Docker Compose**
3. **Git** (optional, to clone the repo)

---

## 📦 Step 1: Package & Transfer the Code

Since the application is fully containerized, you do not need `Node.js` installed on the host server.

1. Zip the entire `Local brand` folder (Exclude `node_modules` and `.next` to save space).
2. Transfer it to your server via `scp`, `ftp`, or upload it to a private Git repository and clone it on the server.

---

## 🔐 Step 2: Environment Configuration

On your server, inside the project root, create a pristine `.env.production` file.
Make sure to fill in your real, live API credentials:

```env
# SERVER & APP CONFIG
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=generate_a_random_long_string_here

# POSTGRES DATABASE
# Update credentials as needed to match the docker-compose settings
DATABASE_URL="postgresql://postgres:localbrand_db_password@db:5432/localbrand?schema=public"

# REDIS CACHE
REDIS_URL="redis://redis:6379"

# GOOGLE LOGIN (OAuth 2.0 Credentials from GCP Console)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# PAYMENT GATEWAYS (Stripe & Paymob LIVE Keys)
STRIPE_SECRET_KEY=sk_live_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# ASSETS (Cloudinary LIVE Cloud)
CLOUDINARY_URL=cloudinary://your_key:your_secret@your_cloud_name
```

---

## 🏗️ Step 3: Start Services via Docker

The repository includes a production-ready `docker-compose.yml` and a multi-stage `Dockerfile`.

1. Run the database and redis instances in the background:
   ```bash
   docker-compose up -d db redis
   ```
2. Build and start the Next.js app container:
   ```bash
   docker-compose up -d --build app
   ```

Wait 30-60 seconds for the Next.js production build process (`npm run build`) to complete inside the container.

---

## 🗄️ Step 4: Run Database Migrations

You must prepare the database schema for the very first time. Jump into the running app container to execute Prisma:

```bash
# Push the schema to the Postgres database
docker-compose exec app npx prisma db push

# (Optional) Seed initial data if you have a seed script
docker-compose exec app npx prisma db seed
```

---

## 🌐 Step 5: Web Server Setup (Nginx Reverse Proxy)

Your Next.js app is now running internally on port `3000`. You should expose it to the internet using an **Nginx** reverse proxy to handle SSL/TLS (HTTPS).

**Example `/etc/nginx/sites-available/localbrand`:**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
1. Enable the site: `ln -s /etc/nginx/sites-available/localbrand /etc/nginx/sites-enabled/`
2. Test Nginx: `nginx -t`
3. Restart Nginx: `systemctl restart nginx`
4. Secure it with free SSL: `certbot --nginx -d your-domain.com`

---

## ♻️ Future Updates (CI/CD)

Whenever you push new code or pull from Git:
```bash
# Rebuild the app without affecting the database volume
docker-compose up -d --build app
```
The Next.js container will safely build the new bundle and swap instances for zero downtime.
