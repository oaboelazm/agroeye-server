# 🌱 AgroEye — Server Infrastructure

**AgroEye** is a smart agriculture monitoring platform. This repository contains the **entire server-side infrastructure**: the FastAPI backend (API Engine), static frontend containers, database layer, reverse proxy, and automated CI/CD deployment — all orchestrated via Docker Compose with a Zero-Trust network architecture.

**Target OS:** Ubuntu Linux

---

## 📁 Repository Structure

```
agroeye-server/
├── .env                        # Runtime secrets (never committed with real values)
├── .env.example                # Template for .env — copy and fill before deploying
├── .gitignore                  # Prevents secrets, logs, caches from being committed
├── docker-compose.yml          # Full stack orchestration (7 services, 4 networks)
├── README.md                   # This file
│
├── api/                        # FastAPI Backend (API Engine)
│   ├── Dockerfile              # Multi-stage build, non-root user
│   ├── .dockerignore           # Excludes dev artifacts from build context
│   ├── entrypoint.sh           # Container entrypoint — runs uvicorn as PID 1
│   ├── api_server.py           # All API routes (auth, home, scan, reports, manage, AI, hardware)
│   ├── database.py             # SQLAlchemy engine & session factory
│   ├── requirements.txt        # Python dependencies
│   ├── agroeye-api              # Bash CLI wrapper for local development
│   ├── tools/
│   │   ├── agroeye_api_cli.py  # CLI tool (serve/stop/restart/status/logs/autostart)
│   │   └── uvicorn_logging.json # Structured logging config for uvicorn
│   └── AI/
│       ├── yolo/
│       │   └── ripe_tomato.pt  # YOLOv8 model weights for crop vision analysis
│       └── agroeye-decision-maker/
│           ├── configs/        # Decision engine YAML configs (base, safety, mpc)
│           ├── artifacts/      # Trained ML model artifacts (joblib, feature stores)
│           └── src/            # Decision engine Python source code
│
├── landing/                    # Static landing page served by nginx
│   └── index.html
│
├── app/                        # Static dashboard app served by nginx
│   └── index.html
│
└── .github/
    └── workflows/
        └── deploy.yml          # GitHub Actions CI/CD — auto-deploys on push to main
```

---

## 🏗️ System Architecture

The AgroEye server runs **7 Docker containers** across **4 isolated networks**, implementing a strict Zero-Trust security model. No backend service is ever directly exposed to the public internet.

```
                        ┌─────────────────────────────────┐
                        │         PUBLIC INTERNET          │
                        └────────────┬────┬───────────────┘
                                     │:80 │:443
                        ┌────────────▼────▼───────────────┐
                        │   nginx-proxy-manager (NPM)     │
            ┌───────────│   Reverse Proxy + SSL + Routing │──────────┐
            │           │   Admin UI: 127.0.0.1:81 only   │          │
            │           └──────┬─────────┬────────┬───────┘          │
            │                  │         │        │                  │
      ┌─────▼─────┐    ┌──────▼──┐  ┌───▼──┐  ┌──▼──┐        ┌─────▼─────┐
      │  npm_db    │    │ landing │  │ app  │  │ api │        │  npm_db   │
      │ MariaDB    │    │  nginx  │  │nginx │  │Fast │        │(config DB)│
      │ 10.11      │    │ static  │  │static│  │ API │        │           │
      └────────────┘    └─────────┘  └──────┘  └──┬──┘        └───────────┘
       infra_net           app_net                 │
                                             ┌─────▼──────┐
                                             │  MySQL 8.0 │
                                             │  (AgroEye) │
                                             └─────┬──────┘
                                                   │
                                             ┌─────▼──────┐
                                             │ phpMyAdmin  │
                                             │ 127.0.0.1   │
                                             │ :8080 only  │
                                             └─────────────┘
                                               data_net
```

### Network Layers

| Layer | Network | Purpose | Services |
|-------|---------|---------|----------|
| **Edge** | `edge_net` (external) | Public internet gateway. Only network bound to host ports `80`/`443` | `nginx-proxy-manager` |
| **Infrastructure** | `infra_net` (external) | Air-gapped proxy config storage. Isolates NPM's internal database from all other services | `nginx-proxy-manager`, `npm_db` |
| **Application** | `app_net` (bridge) | Frontend routing and backend execution. Proxied traffic only — frontends cannot reach the database | `nginx-proxy-manager`, `landing`, `app`, `api` |
| **Data** | `data_net` (bridge) | Business data vault. Only `api` can read/write. Fully isolated from the public internet | `api`, `saas_db`, `phpmyadmin` |

### Service Inventory

| Service | Image | Purpose | Networks | Exposed Ports |
|---------|-------|---------|----------|---------------|
| `nginx-proxy-manager` | `jc21/nginx-proxy-manager:2.12.1` | SSL termination, domain routing, Let's Encrypt | edge, infra, app | `80`, `443`, `127.0.0.1:81` |
| `npm_db` | `mariadb:10.11` | NPM internal config database | infra | None |
| `saas_db` | `mysql:8.0` | AgroEye business database (Users, Farms, Fields, Devices, Sensors, AI Results) | data | None |
| `phpmyadmin` | `phpmyadmin/phpmyadmin:5.2` | Database admin UI (localhost-only) | data | `127.0.0.1:8080` |
| `landing` | `nginx:1.27-alpine` | Static landing page | app | None (proxied) |
| `app` | `nginx:1.27-alpine` | Static dashboard application | app | None (proxied) |
| `api` | Custom (Python 3.12-slim) | FastAPI backend — all business logic | app, data | Internal `8000` only |

### Persistent Volumes

| Volume | Mounted In | Purpose |
|--------|-----------|---------|
| `npm_data` | nginx-proxy-manager | Proxy configuration, host rules |
| `npm_letsencrypt` | nginx-proxy-manager | SSL certificates |
| `npm_db_data` | npm_db | NPM MariaDB data |
| `mysql_data` | saas_db | AgroEye business database files |
| `api_uploads` | api → `/app/uploaded_scans` | User-uploaded crop images for AI analysis |

---

## ⚙️ API Engine (FastAPI Backend)

The API Engine is the core backend of AgroEye. It serves the mobile application, processes IoT sensor data from field hardware, and runs AI inference for crop disease detection.

### Technology Stack

- **Runtime:** Python 3.12, Uvicorn ASGI server
- **Framework:** FastAPI with Pydantic v2 validation
- **Database:** MySQL 8.0 via SQLAlchemy (raw SQL with `text()` bindings)
- **Auth:** JWT tokens (HS256) with bcrypt password hashing
- **AI:** YOLOv8 (crop vision), custom decision engine (sensor analytics)
- **Container:** Multi-stage Docker build, non-root `appuser`, built-in healthcheck

### API Endpoints

All endpoints are prefixed with `/agroeye-api` (via `root_path`).

#### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/mobile/auth/signup` | Register a new user (farmer, admin) |
| POST | `/mobile/auth/login` | Login and receive a JWT access token |

#### Home (Dashboard Data)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/mobile/home/get-farms` | Get all farms for a user |
| POST | `/mobile/home/get-fields` | Get all fields in a farm |
| POST | `/mobile/home/get-devices` | Get all IoT devices in a field |
| POST | `/mobile/home/get-latest-reading` | Get most recent sensor reading for a device |
| POST | `/mobile/home/get-notifications` | Get notifications for a user/farm |
| POST | `/mobile/home/mark-notification-read` | Mark a notification as read |
| POST | `/mobile/home/get-node-status` | Get summary of sensing node health per field |

#### Crop Scanning (Vision AI)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/mobile/scan/upload` | Upload a crop image for analysis |
| POST | `/mobile/scan/analyze` | Run AI analysis on an uploaded image |
| POST | `/mobile/scan/history` | Get scan history for a field |
| POST | `/mobile/scan/details` | Get details of a specific scan |

#### Reports & Analytics
| Method | Path | Description |
|--------|------|-------------|
| POST | `/mobile/reports/get-readings` | Get sensor readings in a date range |
| POST | `/mobile/reports/get-irrigation` | Get irrigation event history |
| POST | `/mobile/reports/get-summary` | Get field summary (averages, latest reading, irrigation) |

#### Farm Management (CRUD)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/mobile/manage/create-farm` | Create a new farm |
| POST | `/mobile/manage/update-farm` | Update farm details |
| POST | `/mobile/manage/delete-farm` | Delete a farm |
| POST | `/mobile/manage/create-field` | Create a new field |
| POST | `/mobile/manage/update-field` | Update field details |
| POST | `/mobile/manage/delete-field` | Delete a field |
| POST | `/mobile/manage/create-device` | Register a new IoT device |
| POST | `/mobile/manage/update-device` | Update device details |
| POST | `/mobile/manage/delete-device` | Remove a device |

#### AI Inference
| Method | Path | Description |
|--------|------|-------------|
| POST | `/ai/decide` | Run the decision engine on sensor data (irrigation, alerts) |
| POST | `/ai/vision/analyze` | Run YOLO inference on a crop image (disease detection) |

#### Hardware / IoT
| Method | Path | Description |
|--------|------|-------------|
| POST | `/devices/{device_id}/log` | Ingest sensor data from field hardware nodes |

#### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check — returns status, uptime, and start time |

### Security Features

- **CORS Middleware** — Allows cross-origin requests from the mobile app
- **Security Headers** — `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy` on every response
- **Global Exception Handler** — Catches unhandled errors and returns a safe 500 JSON response (no stack traces leaked)
- **JWT Authentication** — Tokens signed with HS256, 24h expiry
- **Bcrypt Hashing** — Passwords hashed with bcrypt; raw passwords are never stored
- **Input Validation** — All endpoints use Pydantic models with field constraints (min/max, gt, ge/le)
- **No Fallback SECRET_KEY** — The API refuses to start if `SECRET_KEY` is not set

### Database Connection

The database module (`database.py`) connects to MySQL via SQLAlchemy with production-grade settings:

- **`pool_pre_ping=True`** — Automatically reconnects stale connections (prevents "MySQL server has gone away" errors)
- **`pool_recycle=3600`** — Recycles connections every hour
- **`pool_size=10`** — Maintains 10 persistent connections
- **`max_overflow=20`** — Allows up to 20 additional connections under load
- **URL-encoded passwords** — Handles special characters (`!`, `@`, `#`) safely

### Container Details

The API Dockerfile uses a **multi-stage build**:

1. **Builder stage** — Installs Python dependencies into an isolated prefix
2. **Production stage** — Copies only the installed packages (no build tools), creates a non-root `appuser`, sets up runtime directories

The entrypoint runs uvicorn directly as **PID 1** using `exec`, which ensures:
- Docker `SIGTERM` signals are properly received for graceful shutdown
- Proxy headers are forwarded (correct client IP behind NPM)
- Logs stream directly to `docker logs`

---

## 🔒 Security Posture

### Zero-Trust Network Isolation

- **No database is reachable from the internet.** `saas_db` lives exclusively on `data_net`
- **No admin UI is publicly accessible.** phpMyAdmin (`127.0.0.1:8080`) and NPM Admin (`127.0.0.1:81`) are localhost-only
- **Access requires Tailscale VPN or SSH tunneling:**

```bash
# SSH tunnel to phpMyAdmin
ssh -L 8080:127.0.0.1:8080 user@server

# SSH tunnel to NPM Admin
ssh -L 81:127.0.0.1:81 user@server
```

### Secrets Management

- `.env` file holds all credentials — **never committed with real values**
- `.gitignore` prevents `.env`, `__pycache__`, logs, model weights, and upload directories from being tracked
- `.dockerignore` excludes development artifacts from the Docker build context
- All passwords are injected via `env_file` in docker-compose

### Firewall (UFW)

Only the following ports are open on the server:

| Port | Protocol | Purpose |
|------|----------|---------|
| 22 | TCP | SSH |
| 80 | TCP | HTTP (redirected to HTTPS by NPM) |
| 443 | TCP | HTTPS |
| tailscale0 | ALL | Tailscale VPN mesh traffic |

---

## 🔄 CI/CD — Automated Deployment

### How It Works

The deployment pipeline is defined in `.github/workflows/deploy.yml`. It triggers automatically on every push to the `main` branch and performs a fully automated, zero-downtime deployment to the production server.

### Workflow Steps

```
Push to main → GitHub Actions → SSH into server → Pull code → Build → Deploy → Verify
```

**Step-by-step:**

1. **Trigger:** A push to the `main` branch triggers the workflow
2. **SSH Connection:** GitHub Actions uses `appleboy/ssh-action@v1.2.2` to SSH into the production server using secrets stored in the GitHub repository:
   - `SERVER_HOST` — Server IP or domain
   - `SERVER_USER` — SSH username
   - `SSH_PRIVATE_KEY` — Private SSH key for authentication
3. **Pull Latest Code:** Runs `git pull origin main` inside `/agroeye-server` on the server
4. **Ensure Networks:** Creates `edge_net` and `infra_net` Docker networks if they don't exist (idempotent — safe to run repeatedly)
5. **Build & Deploy:** Runs `docker compose up -d --build --remove-orphans`:
   - `--build` rebuilds any containers with code changes (the API image)
   - `--remove-orphans` cleans up any leftover containers from removed services
   - `-d` runs everything in detached mode
6. **Stabilization Wait:** Waits 15 seconds for services to finish starting and healthchecks to settle
7. **Health Verification:** Runs a Python script that parses `docker compose ps --format json` output and checks:
   - No services are in `unhealthy` state
   - No services have `exited`
   - If any service fails, the workflow **exits with code 1** (deployment marked as failed in GitHub)

### Required GitHub Repository Secrets

| Secret | Description |
|--------|-------------|
| `SERVER_HOST` | Production server IP address or hostname |
| `SERVER_USER` | SSH user on the server (e.g., `deploy`) |
| `SSH_PRIVATE_KEY` | RSA/Ed25519 private key for passwordless SSH login |

### Deployment Safety

- **`set -euo pipefail`** — The deploy script stops immediately on any error
- **Health verification** — Automatically detects failed containers post-deploy
- **Idempotent** — Safe to re-run at any time (networks, builds, deploys are all idempotent)
- **Timeout** — The workflow has a 15-minute timeout to prevent hanging deployments
- **Pinned action version** — `appleboy/ssh-action@v1.2.2` is version-pinned to prevent supply-chain attacks

---

## 🚀 Deployment Instructions (Fresh Server)

### Step 1: System Setup

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ufw nano jq openssl
```

### Step 2: Configure Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow in on tailscale0
sudo ufw enable
```

### Step 3: Install Tailscale (VPN)

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

export TAILSCALE_IP=$(tailscale ip -4)
echo "export TAILSCALE_IP=$TAILSCALE_IP" >> ~/.bashrc
source ~/.bashrc
```

### Step 4: Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
# Log out and log back in for group change to take effect
```

### Step 5: Clone & Configure

```bash
cd /
sudo git clone https://github.com/YOUR_ORG/agroeye-server.git
cd /agroeye-server

# Create environment file
cp .env.example .env
nano .env   # Set ALL passwords — use: openssl rand -hex 32
chmod 600 .env
```

### Step 6: Transfer AI Model Files

The AI model weights are **not stored in Git** (they're too large). Transfer them to the server:

```bash
# From your local machine:
scp api/AI/yolo/ripe_tomato.pt user@server:/agroeye-server/api/AI/yolo/
scp api/AI/agroeye-decision-maker/artifacts/*.joblib user@server:/agroeye-server/api/AI/agroeye-decision-maker/artifacts/
```

### Step 7: Create Networks & Deploy

```bash
docker network create edge_net
docker network create infra_net

docker compose up -d --build
docker compose ps    # Verify all services are healthy
```

### Step 8: Configure NPM (First Time)

```bash
# Open SSH tunnel to access NPM admin
ssh -L 81:127.0.0.1:81 user@server
```

1. Open `http://localhost:81` in your browser
2. Login with default credentials: `admin@example.com` / `changeme`
3. **Change the password immediately**
4. Add proxy hosts for your domains:
   - `yourdomain.com` → `landing:80`
   - `app.yourdomain.com` → `app:80`
   - `api.yourdomain.com` → `api:8000`
5. Enable SSL via Let's Encrypt for each host, enable "Force SSL"

---

## 🔧 Environment Variables

| Variable | Used By | Description |
|----------|---------|-------------|
| `NPM_DB_ROOT_PASSWORD` | npm_db | Root password for NPM's MariaDB |
| `NPM_DB_PASSWORD` | nginx-proxy-manager, npm_db | User password for NPM's MariaDB |
| `MYSQL_ROOT_PASSWORD` | saas_db | Root password for the AgroEye MySQL database |
| `MYSQL_DATABASE` | saas_db, api | Database name (default: `AgroEye`) |
| `MYSQL_USER` | saas_db, api | Database user for the API |
| `MYSQL_PASSWORD` | saas_db, api | Database password for the API |
| `DB_HOST` | api | Hostname of the database (default: `saas_db`) |
| `SECRET_KEY` | api | JWT signing key — generate with `openssl rand -hex 32` |
| `UPLOAD_DIR` | api | Path inside the container for uploaded images (default: `/app/uploaded_scans`) |
| `TAILSCALE_IP` | Reference | The server's Tailscale VPN IP address |

---

## 🏥 Health Monitoring

Every service in the stack has a Docker healthcheck:

| Service | Check | Interval | Start Period |
|---------|-------|----------|--------------|
| `nginx-proxy-manager` | `curl -fsS http://localhost:81/` | 30s | 30s |
| `npm_db` | `mysqladmin ping` | 30s | 40s |
| `saas_db` | `mysqladmin ping` | 30s | 60s |
| `landing` | `wget -qO /dev/null http://localhost/` | 30s | 10s |
| `app` | `wget -qO /dev/null http://localhost/` | 30s | 10s |
| `api` | Python `urllib` request to `/agroeye-api/` | 30s | 30s |

Check health status:

```bash
docker compose ps           # Quick status overview
docker inspect --format='{{.State.Health.Status}}' api    # Single service
docker compose logs api     # View API logs
```

---

## 🧰 Local Development (API Engine)

For running the API outside Docker (local development):

```bash
cd api
python -m venv .venv
source .venv/bin/activate    # or .venv\Scripts\activate on Windows
pip install -r requirements.txt

# Set environment variables (or use a local .env)
export MYSQL_USER=saas_user
export MYSQL_PASSWORD=your_password
export DB_HOST=localhost
export MYSQL_DATABASE=AgroEye
export SECRET_KEY=$(openssl rand -hex 32)

# Start the server
uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload
```

Or use the CLI wrapper:

```bash
./agroeye-api serve              # Start in background
./agroeye-api serve --foreground # Start in foreground
./agroeye-api status             # Check if running
./agroeye-api logs               # View recent logs
./agroeye-api stop               # Stop the server
./agroeye-api restart             # Restart
```

See [`api/AGROEYE_API_CLI.md`](api/AGROEYE_API_CLI.md) for full CLI documentation.

---

## 📊 Database Schema

The AgroEye database (`saas_db`) contains the following tables:

| Table | Description |
|-------|-------------|
| `Users` | User accounts (farmers, admins) with bcrypt-hashed passwords |
| `Farms` | Farms owned by users |
| `Fields` | Fields within farms (crop type, area) |
| `Devices` | IoT devices deployed in fields |
| `SensingNodes` | Individual sensing nodes within devices (battery, status) |
| `SensorReadings` | Time-series sensor data (temperature, humidity, soil moisture, NPK, pH, CO₂, light) |
| `SensorLog` | Raw hardware log ingestion table |
| `Images` | Uploaded crop images for AI analysis |
| `AIResults` | AI analysis results (disease detection, confidence, recommendations) |
| `Notifications` | User notifications (alerts, warnings) |
| `IrrigationEvents` | Irrigation event records |

---

## 🛡️ Production Hardening Applied

This repository has undergone a full production-readiness audit. The following hardening measures are in place:

### Docker
- ✅ All images pinned to specific versions (no `latest` tags)
- ✅ Multi-stage Dockerfile (smaller production image)
- ✅ Non-root container user (`appuser`)
- ✅ Healthchecks on all 6 services
- ✅ Proper PID 1 signal handling (`exec uvicorn`)
- ✅ Admin ports bound to `127.0.0.1` only
- ✅ Static site volumes mounted read-only (`:ro`)
- ✅ Startup dependency ordering with healthcheck conditions
- ✅ MySQL start_period allows for initialization time

### API Backend
- ✅ CORS middleware enabled
- ✅ Security headers on all responses
- ✅ Global exception handler (no stack trace leaks)
- ✅ Proper HTTP status codes (401, 409 instead of 200 with error)
- ✅ Connection pool with `pool_pre_ping` and `pool_recycle`
- ✅ URL-encoded database passwords
- ✅ Hard failure on missing `SECRET_KEY`
- ✅ Safe file extension handling
- ✅ Parameterized SQL queries (no SQL injection)

### CI/CD
- ✅ Idempotent network creation
- ✅ Orphan container cleanup (`--remove-orphans`)
- ✅ Post-deploy health verification
- ✅ Workflow timeout (15 minutes)
- ✅ Pinned GitHub Action versions

### Security
- ✅ `.gitignore` prevents secret/artifact commits
- ✅ `.dockerignore` minimizes build context
- ✅ UFW firewall rules documented
- ✅ Tailscale VPN for admin access
- ✅ No database exposed to public internet
