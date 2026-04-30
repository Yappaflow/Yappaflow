# Linux + AWS — Yappaflow Workstation Setup

Step-by-step guide to turn an Ubuntu laptop into your AWS control plane for Yappaflow.
Read top-to-bottom on first setup, then keep around as a reference.

---

## Phase 0 — AWS Account Prep (do this BEFORE installing anything)

You don't want to install all the tooling and then realize your account is wide open.

### 0.1 Create AWS Account

- Sign up at https://aws.amazon.com
- Use your real Turkish address — AWS accepts Turkey without issue
- Add a Mastercard or Visa — AWS will charge $1 to verify, then refund
- ID verification may be requested — upload passport or kimlik if asked

### 0.2 Lock down the root account immediately

- Go to **My Security Credentials** → enable MFA on root (use Authy or 1Password TOTP, not SMS)
- **Never use root again** except for billing changes and account closure
- Save the root password in a password manager and forget it exists

### 0.3 Set up billing alerts (this is the most important step)

- **Billing → Budgets → Create budget**
- Create three thresholds: alert at $50, $100, $150
- Send to your email
- Without this, a misconfigured Lambda or runaway log can cost you $500 before you notice

### 0.4 Pick your region

For Yappaflow: **`eu-central-1`** (Frankfurt). Closest to Samsun, lowest latency for Turkish + EU agency customers, GDPR-native.
Set this everywhere — every CLI command, every console session.

### 0.5 Create your daily IAM user

Two options:

**Option A — Simple (good for solo dev start):**
- IAM → Users → Add user → name it `yusuf-admin`
- Attach `AdministratorAccess` policy
- Enable MFA on this user
- Generate access keys for CLI use

**Option B — Modern (better long-term):**
- Enable **IAM Identity Center** (formerly AWS SSO)
- Create a user with PermissionSet `AdministratorAccess`
- Use `aws sso login` for short-lived credentials, no static keys to leak
- Slight learning curve but much safer

Pick A for now if you want speed; migrate to B once the infra is live.

---

## Phase 1 — Ubuntu Laptop Setup

### 1.1 Install Ubuntu

- Download **Ubuntu 24.04 LTS Desktop** from ubuntu.com
- Use `balenaEtcher` to make a bootable USB
- Install with **full-disk encryption (LUKS)** — your AWS keys will live on this disk
- Enable automatic security updates during install

### 1.2 First-boot updates

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential git curl wget unzip jq htop
```

### 1.3 Set up SSH key for GitHub

```bash
ssh-keygen -t ed25519 -C "yusufmirza145@gmail.com"
cat ~/.ssh/id_ed25519.pub
# paste the public key into github.com → Settings → SSH keys
```

### 1.4 Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# log out and back in for the group to take effect
docker --version
docker compose version
```

---

## Phase 2 — Core AWS Tooling

### 2.1 AWS CLI v2

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscli.zip
unzip awscli.zip
sudo ./aws/install
rm -rf awscli.zip aws/
aws --version
```

Configure it:

```bash
aws configure
# AWS Access Key ID: <from IAM user>
# AWS Secret Access Key: <from IAM user>
# Default region: eu-central-1
# Default output format: json
```

Test it:

```bash
aws sts get-caller-identity
# should print your account ID and IAM user ARN
```

### 2.2 Session Manager Plugin (SSH-less access to EC2/ECS)

This lets you connect to running containers and instances without managing SSH keys.

```bash
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" -o session-manager-plugin.deb
sudo dpkg -i session-manager-plugin.deb
rm session-manager-plugin.deb
session-manager-plugin --version
```

### 2.3 AWS Copilot CLI (the secret weapon for solo-dev ECS)

Copilot wraps ECS Fargate + ALB + ECR + CloudFormation into a few commands. Lets you go from `Dockerfile` to deployed service in 5 minutes. Highly recommended for Yappaflow.

```bash
sudo curl -Lo /usr/local/bin/copilot https://github.com/aws/copilot-cli/releases/latest/download/copilot-linux
sudo chmod +x /usr/local/bin/copilot
copilot --version
```

### 2.4 OpenTofu (for everything Copilot doesn't cover)

Use this for VPC, RDS, S3, IAM — the "platform layer" that lives below your services.

```bash
curl --proto '=https' --tlsv1.2 -fsSL https://get.opentofu.org/install-opentofu.sh | sh -s -- --install-method deb
tofu --version
```

> **Why OpenTofu instead of Terraform?** Terraform changed its license in 2023; OpenTofu is the open-source fork the community moved to. Same syntax, same providers, no license risk.

---

## Phase 3 — Yappaflow Development Stack

### 3.1 Node.js via `fnm` (faster than nvm)

```bash
curl -fsSL https://fnm.vercel.app/install | bash
source ~/.bashrc
fnm install 22
fnm default 22
node --version
npm --version
```

### 3.2 Cursor (your editor)

Download the `.deb` from https://cursor.sh and install:

```bash
sudo dpkg -i cursor-*.deb
```

### 3.3 GitHub CLI

```bash
sudo apt install -y gh
gh auth login
# pick HTTPS, authenticate via browser
```

### 3.4 Clone Yappaflow

```bash
mkdir -p ~/Projects && cd ~/Projects
git clone git@github.com:<your-org>/yappaflow.git
cd yappaflow
npm install
```

---

## Phase 4 — Daily Workflow

### Morning: connect to AWS

```bash
# if using IAM Identity Center:
aws sso login --profile yappaflow

# verify:
aws sts get-caller-identity
aws s3 ls
```

### Deploy a service

```bash
cd apps/yappaflow-mcp
copilot deploy
# Copilot builds the Docker image, pushes to ECR, updates ECS, runs health checks
```

### View live logs

```bash
copilot svc logs --name yappaflow-mcp --follow
```

### Shell into a running container (no SSH)

```bash
copilot svc exec --name yappaflow-mcp
# you're now inside the container, with /bin/sh
```

### Check current AWS spend

```bash
aws ce get-cost-and-usage \
  --time-period Start=2026-04-01,End=2026-04-30 \
  --granularity MONTHLY \
  --metrics UnblendedCost
```

### Run infra changes

```bash
cd infra/
tofu plan          # preview changes
tofu apply         # apply if happy
```

---

## Phase 5 — Pre-Production Security Checklist

Before pointing real DNS at AWS, run through this:

- [ ] MFA enabled on root + every IAM user
- [ ] Root account access keys deleted (never needed)
- [ ] CloudTrail enabled (free first trail per account, region-wide)
- [ ] S3 buckets all default to "Block Public Access"
- [ ] RDS in private subnet, no public IP
- [ ] Security groups: tightest possible (e.g., RDS only accepts from app SG, not 0.0.0.0/0)
- [ ] Secrets in Parameter Store / Secrets Manager — not in `.env` files committed to repo
- [ ] CloudWatch log groups have retention set (default is "Never expire" → expensive)
- [ ] Budget alerts active and tested

---

## Phase 6 — Common Tasks Cheat Sheet

```bash
# List all running ECS services
aws ecs list-services --cluster yappaflow-prod

# Restart a service (force new deployment)
copilot svc deploy --name server --force

# Check S3 bucket size
aws s3 ls s3://yappaflow-sites --recursive --summarize

# Pull RDS connection string
aws ssm get-parameter --name /yappaflow/prod/db-url --with-decryption

# Tail logs across all services for the last hour
copilot svc logs --since 1h --follow

# Check what Cloudflare-side IPs are hitting ALB
aws logs filter-log-events --log-group-name /aws/elb/yappaflow --start-time $(date -d '1 hour ago' +%s)000
```

---

## Phase 7 — Backup & Disaster Recovery

| What | Where | Recovery |
|---|---|---|
| Source code | GitHub | `git clone` |
| Infra state | OpenTofu state in S3 (versioned bucket) | `tofu init` from another machine |
| Database | RDS automated daily backup + 7-day PITR | snapshot restore |
| Generated sites | S3 bucket with versioning + lifecycle rules | versions + (optional) cross-region replication |
| Docker images | ECR (kept indefinitely) | `copilot deploy` rebuilds from source |
| Secrets | Parameter Store (versioned) | restore from previous version |

The thing that has no backup by default: **your laptop's AWS keys**. If you lose the laptop:
1. Go to AWS Console from another machine, log in via root + MFA
2. Deactivate the leaked IAM user keys immediately
3. Create new keys
4. The infra is unaffected because it's all in AWS

---

## Phase 8 — When to Read More

- **AWS Well-Architected Framework** — free 60-page PDF, the foundational doc
- **"AWS in Action" (Manning, 2nd ed.)** — best book for hands-on AWS
- **Copilot CLI docs** — https://aws.github.io/copilot-cli/
- **AWS Pricing Calculator** — https://calculator.aws/ — model your bill before deploying
- **Last Week in AWS** — Corey Quinn's newsletter, sharp commentary on AWS news

---

## Quick Reference: What lives where

| Tool | Purpose | Phase introduced |
|---|---|---|
| `aws` | Talk to any AWS API | 2.1 |
| `copilot` | Deploy ECS services | 2.3 |
| `tofu` | Provision VPC, RDS, S3, IAM | 2.4 |
| `docker` | Build + run images locally | 1.4 |
| `gh` | Manage GitHub PRs from terminal | 3.3 |
| `session-manager-plugin` | Shell into EC2/ECS without SSH | 2.2 |

---

**Last updated:** 2026-04-25
**Owner:** Yusuf Mirza
