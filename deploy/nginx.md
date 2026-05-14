# Nginx + Domain + SSL Setup

## Prerequisites

- Ubuntu/Debian server with a public IP
- Domain DNS A record pointing to the server IP
- PM2 app already running on a local port (e.g. `8000`)

---

## 1. Install Nginx

```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## 2. Create a server block

Replace `api.yourdomain.com` with your actual (sub)domain.

```bash
sudo nano /etc/nginx/sites-available/doable-backend
```

Paste the following:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the config:

```bash
sudo ln -s /etc/nginx/sites-available/doable-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 3. Open firewall ports

```bash
sudo ufw allow 'Nginx Full'   # opens 80 and 443
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## 4. Install SSL with Certbot (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.yourdomain.com
```

Follow the prompts — Certbot will:
- Verify domain ownership via HTTP
- Obtain and install the certificate
- Automatically rewrite the Nginx config to redirect HTTP → HTTPS

Certbot auto-renews certificates via a systemd timer. Verify:

```bash
sudo systemctl status certbot.timer
```

Test renewal manually (dry run):

```bash
sudo certbot renew --dry-run
```

---

## 5. Final Nginx config (after Certbot)

After Certbot runs, `/etc/nginx/sites-available/doable-backend` will look like this:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Reload after any manual edits:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## Useful commands

```bash
sudo nginx -t                          # test config syntax
sudo systemctl reload nginx            # apply config changes without downtime
sudo systemctl restart nginx           # full restart
sudo tail -f /var/log/nginx/error.log  # watch error logs
sudo tail -f /var/log/nginx/access.log # watch access logs
sudo certbot certificates              # list installed certificates
```

---

## Notes

- Make sure your domain's DNS A record points to this server's IP **before** running Certbot — it needs to reach the server over port 80 for domain verification.
- If the app port changes from `8000`, update `proxy_pass` accordingly.
- Update `APP_URL` and `FRONTEND_URL` in `.env.production` to use `https://` after SSL is set up.
