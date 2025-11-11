# Expense Flow — Deployment Guide (Nginx + PM2)

This guide walks through a production deployment on a single Ubuntu/Debian server using:
- **Node.js 20+ / npm**
- **PM2** as the process manager
- **Nginx** as the reverse proxy / TLS terminator
- **PostgreSQL** for the database

Adjust commands for your distro or automation tooling (Ansible, Terraform, etc.).

---

## 1. Prepare the Server

1. **Update packages & install dependencies**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y nginx postgresql postgresql-contrib build-essential
   ```

2. **Install Node.js 20 LTS** (use your preferred method; example with NodeSource):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   npm install --global pm2
   ```

3. **Create a deploy user (optional but recommended)**
   ```bash
   sudo adduser --disabled-password --gecos "" expense
   sudo usermod -aG sudo expense
   sudo su - expense
   ```

4. **Provision PostgreSQL** – create database + user:
   ```bash
   sudo -u postgres psql
   CREATE DATABASE expense_flow;
   CREATE USER expense_owner WITH ENCRYPTED PASSWORD '1234';
   GRANT ALL PRIVILEGES ON DATABASE expense_flow TO expense_owner;
   \q
   ```

---

## 2. Fetch the Application

```bash
cd /var/www
git clone https://github.com/your-org/expense-tracker.git expense-flow
cd expense-flow
```

Set ownership if you cloned as root:
```bash
sudo chown -R expense:expense /var/www/expense-flow
```

---

## 3. Configure Environment

Copy `.env.example` to `.env` and fill every key:
```bash
cp .env.example .env
nano .env
```

Required variables:
```
DATABASE_URL="postgresql://expense_owner:strong-password@localhost:5432/expense_flow"
NEXTAUTH_URL="https://app.your-domain.com"
NEXTAUTH_SECRET="openssl rand -base64 32"
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
ENCRYPTION_KEY="openssl rand -base64 32"
# Optional automation knobs:
AUTOMATION_INTERVAL_MS=300000
AUTOMATION_RESTART_DELAY_MS=10000
```

> Never check `.env` into source control. Use a secrets manager or Ansible Vault if automating.

---

## 4. Build & Prime the App

1. **Install dependencies**
   ```bash
   npm ci
   ```

2. **Generate Prisma client + apply schema**
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

3. **Build Next.js**
   ```bash
   NEXT_USE_TURBOPACK=0 npm run build
   ```

At this point `.next/` contains the production bundle.

---

## 5. Run with PM2

### Option A – one-liner
```bash
pm2 start npm --name expense-flow -- start
pm2 save
pm2 startup  # follow the printed instructions so PM2 boots on restart
```

### Option B – ecosystem file
Create `ecosystem.config.cjs` for tighter control:
```javascript
module.exports = {
  apps: [
    {
      name: "expense-flow",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        NEXT_USE_TURBOPACK: "0",
      },
      env_production: {
        NODE_ENV: "production",
      },
      cwd: "/var/www/expense-flow",
    },
  ],
}
```

Launch:
```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

> PM2 keeps both the Next.js server and the automation worker alive. Use `pm2 monit` to watch logs or `pm2 reload expense-flow` for zero-downtime deploys.

---

## 6. Configure Nginx

1. **Create an upstream config** `/etc/nginx/sites-available/expense-flow`:
   ```nginx
   upstream expense_flow_app {
     server 127.0.0.1:3000;
     keepalive 64;
   }

   server {
     listen 80;
     server_name app.your-domain.com;

     location /.well-known/acme-challenge/ {
       root /var/www/html; # for certbot http-01 requests
     }

     location / {
       proxy_pass http://expense_flow_app;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   ```

2. **Enable the site + test config**
   ```bash
   sudo ln -s /etc/nginx/sites-available/expense-flow /etc/nginx/sites-enabled/expense-flow
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. **Add TLS (recommended)**:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d app.your-domain.com
   ```

Certbot will rewrite the server block to listen on 443 with auto-renewal.

---

## 7. Deploy Updates

1. `git pull origin main`
2. `npm ci`
3. `npx prisma migrate deploy`
4. `NEXT_USE_TURBOPACK=0 npm run build`
5. `pm2 reload expense-flow`

Automate these steps with a script or CI job to keep releases consistent.

---

## 8. Operational Tips

- **Logs**: `pm2 logs expense-flow` (Ctrl+C to exit). Nginx access/error logs live under `/var/log/nginx/`.
- **Environment changes**: edit `.env`, rebuild (`npm run build`), then `pm2 restart expense-flow`.
- **Database backups**: schedule `pg_dump expense_flow > /backups/$(date +%F).sql`.
- **Automation worker**: set `AUTOMATION_DISABLED=1` if you run recurring materialization elsewhere. Otherwise PM2 will restart it alongside the Next.js server.
- **Health checks**: point monitoring at `/api/feed` or `/api/spending?preset=month` to ensure auth + Prisma are responsive.

With these steps the app runs behind Nginx, restarts automatically on boot, and can be redeployed without downtime via PM2. Customize as needed for multi-instance or containerized setups.

