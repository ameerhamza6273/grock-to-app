# Deploying to the VPS

Target: a small Ubuntu 24.04 VPS (~$5/mo, 1 GB RAM is enough), tool served on a
subdomain of the client's site (e.g. `tool.clientdomain.com`). The client's main site
stays on HostGator — only one DNS record changes there.

```
Browser ──HTTPS──> Nginx (host, certbot SSL) ──> frontend :3000 (Nuxt, Docker)
                                                   └─ /api, /uploads, /download ──> backend :8000 (FastAPI, Docker)
```

Only ports 22/80/443 are open; the containers are bound to localhost / the Docker network.

## 1. DNS

In the client's DNS (HostGator cPanel → Zone Editor, or wherever the domain's DNS is
hosted), add an **A record**: `tool` → VPS public IP. Nothing else on the main site changes.

## 2. Server setup (once)

```bash
# as root on a fresh VPS
adduser deploy && usermod -aG sudo deploy
apt update && apt upgrade -y
apt install -y nginx certbot python3-certbot-nginx ufw git

# Docker (official convenience script)
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy

ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable
```

Swap helps the Nuxt build on a 1 GB box:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## 3. App

```bash
# as deploy
git clone <repo-url> ~/tool && cd ~/tool
cp backend/.env.example backend/.env    # set IMAGE_GEN_API_KEY etc. once the API is chosen
docker compose up -d --build
docker compose ps                       # backend should be "healthy"
curl -I http://127.0.0.1:3000           # 200
```

`DATABASE_URL` and `UPLOAD_DIR` in `backend/.env` are overridden by `docker-compose.yml`;
all persistent data lives in `~/tool/data/` (`uploads/` + `db/tool.db`).

## 4. Nginx + SSL

```bash
sudo cp deploy/nginx/tool.conf /etc/nginx/sites-available/tool.conf
sudo sed -i 's/tool.example.com/tool.clientdomain.com/' /etc/nginx/sites-available/tool.conf
sudo ln -s /etc/nginx/sites-available/tool.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d tool.clientdomain.com --redirect   # needs the DNS record live
```

Certbot installs a renewal timer automatically (`systemctl list-timers | grep certbot`).

## Updating

```bash
cd ~/tool && git pull && docker compose up -d --build
```

## Backups

Everything worth keeping is in `data/`. A nightly tarball:

```bash
mkdir -p ~/backups
( crontab -l 2>/dev/null; echo '0 3 * * * tar czf ~/backups/tool-$(date +\%F).tgz -C ~/tool data && find ~/backups -name "tool-*.tgz" -mtime +14 -delete' ) | crontab -
```

Copy these off the server periodically (or enable the VPS provider's snapshot backups).

## Access

v1 is single-user (the client) with no login. The `noindex` meta keeps it out of search
engines, but anyone with the URL can use it. If that's a concern before auth is built, add
Nginx basic auth inside the `location /` block:

```bash
sudo apt install -y apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd client
# then in tool.conf:  auth_basic "Restricted"; auth_basic_user_file /etc/nginx/.htpasswd;
```

## Logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
sudo tail -f /var/log/nginx/error.log
```
