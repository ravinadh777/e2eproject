# PromptFlow AI Platform 🚀

> **Enterprise-grade AI SaaS microservices platform** — Built for production, designed for scale.

[![CI/CD](https://github.com/your-org/promptflow-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/promptflow-ai/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Kubernetes](https://img.shields.io/badge/kubernetes-%23326ce5.svg?logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![AWS](https://img.shields.io/badge/AWS-%23FF9900.svg?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)

---

## 🏗️ Architecture Overview

PromptFlow AI is a production-grade SaaS platform enabling teams to upload documents, ask AI-powered questions, manage prompts, and monitor usage — all within a multi-tenant workspace model.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet / Users                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
              ┌───────────▼───────────┐
              │   AWS ALB + Ingress   │
              │   (NGINX Ingress Ctrl)│
              └───────────┬───────────┘
                          │
        ┌─────────────────┼──────────────────────┐
        │                 │                      │
   ┌────▼────┐      ┌─────▼─────┐        ┌──────▼──────┐
   │Frontend │      │   Auth    │        │  Workspace  │
   │React+TS │      │  Service  │        │   Service   │
   └─────────┘      └─────┬─────┘        └──────┬──────┘
                          │                     │
              ┌───────────┼─────────────────────┘
              │           │
   ┌──────────▼─┐   ┌─────▼──────┐   ┌────────────┐
   │ AI Gateway │   │  Billing   │   │Notification│
   │  Service   │   │  Service   │   │  Service   │
   └──────┬─────┘   └─────┬──────┘   └────────────┘
          │               │
   ┌──────▼─────┐  ┌──────▼──────┐
   │ Analytics  │  │  PostgreSQL │
   │  Service   │  │  (StatefulSet│
   └────────────┘  └─────────────┘
                          │
                   ┌──────▼──────┐
                   │    Redis    │
                   │   (Cache)   │
                   └─────────────┘
```

---

## 📦 Microservices

| Service | Port | Tech | Description |
|---------|------|------|-------------|
| **Auth Service** | 3001 | Node.js + Express | JWT auth, RBAC, password reset |
| **Workspace Service** | 3002 | Node.js + Express | Teams, docs, workspace management |
| **AI Gateway Service** | 3003 | Node.js + Express | OpenAI integration, RAG, Q&A |
| **Billing Service** | 3004 | Node.js + Express | Subscriptions, invoices, metering |
| **Notification Service** | 3005 | Node.js + Express | Email alerts, SMTP integration |
| **Analytics Service** | 3006 | Node.js + Express | Metrics, dashboards, usage stats |
| **Frontend** | 3000 | React + TypeScript | Full SaaS UI |

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js
- **Database**: PostgreSQL 15 (StatefulSet with PVC)
- **Cache**: Redis 7
- **Auth**: JWT + bcrypt
- **Docs**: Swagger/OpenAPI 3.0
- **Validation**: Joi / Zod
- **ORM**: Sequelize

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **HTTP**: Axios
- **Charts**: Recharts
- **Icons**: Lucide React

### DevOps & Cloud
- **Cloud**: AWS (EKS, ECR, S3, ALB)
- **Container**: Docker + multi-stage builds
- **Orchestration**: Kubernetes (EKS)
- **Helm**: v3 charts per service
- **IaC**: Terraform (VPC, EKS, ECR, S3)
- **CI/CD**: GitHub Actions
- **Registry**: Amazon ECR
- **Ingress**: NGINX Ingress Controller

### Monitoring & Observability
- **Metrics**: Prometheus + Grafana
- **Logs**: Loki + Fluent Bit
- **Alerts**: Alertmanager → Gmail
- **Dashboards**: Custom Grafana dashboards

### Security & Quality
- **SAST**: SonarQube
- **CVE Scanning**: Trivy + Docker Scout
- **Secrets**: Kubernetes Secrets + AWS Secrets Manager
- **TLS**: cert-manager (Let's Encrypt ready)

---

## 🚀 Quick Start

### Prerequisites
- AWS Account (free tier)
- GitHub Account
- Docker installed locally
- `git` installed

### One-Command Setup
```bash
git clone https://github.com/your-org/promptflow-ai.git
cd promptflow-ai
chmod +x setup.sh
./setup.sh
```

The `setup.sh` will:
1. Install all required CLI tools
2. Configure AWS credentials
3. Create EKS cluster
4. Set up namespaces
5. Deploy PostgreSQL & Redis
6. Deploy all 6 microservices
7. Install ingress controller
8. Install monitoring stack

---

## 📁 Repository Structure

```
promptflow-ai/
├── frontend/                    # React + TypeScript SPA
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Route-level pages
│   │   ├── hooks/               # Custom React hooks
│   │   ├── store/               # Zustand state management
│   │   ├── utils/               # Helpers, API client
│   │   └── types/               # TypeScript type definitions
│   ├── Dockerfile
│   └── package.json
│
├── services/
│   ├── auth-service/            # Authentication & Authorization
│   ├── workspace-service/       # Teams & Document Management
│   ├── ai-gateway-service/      # AI/LLM Integration Layer
│   ├── billing-service/         # Subscription & Billing
│   ├── notification-service/    # Email & Alert Notifications
│   └── analytics-service/       # Metrics & Usage Analytics
│
├── helm/                        # Helm charts (one per service)
│   ├── auth-service/
│   ├── workspace-service/
│   ├── ai-gateway-service/
│   ├── billing-service/
│   ├── notification-service/
│   ├── analytics-service/
│   ├── frontend/
│   ├── postgresql/
│   ├── redis/
│   └── ingress/
│
├── terraform/                   # Infrastructure as Code
│   ├── modules/
│   │   ├── vpc/                 # VPC, subnets, gateways
│   │   ├── eks/                 # EKS cluster + node groups
│   │   ├── ecr/                 # Container registries
│   │   ├── s3/                  # S3 buckets (logs, reports)
│   │   └── rds/                 # RDS PostgreSQL (optional)
│   └── environments/
│       ├── dev/
│       └── prod/
│
├── .github/
│   └── workflows/
│       ├── ci.yml               # CI: test, lint, build, scan
│       ├── cd.yml               # CD: deploy changed services
│       ├── release.yml          # Release: tag, changelog, notes
│       └── security-scan.yml    # Scheduled CVE scans
│
├── monitoring/
│   ├── prometheus/              # Prometheus config + rules
│   ├── grafana/                 # Dashboards JSON
│   ├── loki/                    # Log aggregation config
│   ├── alertmanager/            # Alert routing to Gmail
│   └── fluent-bit/              # Log shipping config
│
├── scripts/
│   ├── deploy-service.sh        # Deploy single service
│   ├── rollback.sh              # Rollback to previous version
│   ├── health-check.sh          # Post-deploy health check
│   ├── port-forward.sh          # Local dev port forwarding
│   └── cleanup.sh               # Destroy all resources
│
├── docs/
│   ├── architecture.md
│   ├── api-reference.md
│   ├── deployment-guide.md
│   ├── resume-bullets.md        # Interview-ready bullet points
│   └── interview-guide.md       # How to explain this project
│
├── setup.sh                     # One-shot setup script
└── README.md
```

---

## 🌐 Endpoints (Post-Deploy)

After deployment, services are available via the Ingress:

```
http://<INGRESS_IP>/              → Frontend
http://<INGRESS_IP>/api/auth      → Auth Service
http://<INGRESS_IP>/api/workspace → Workspace Service
http://<INGRESS_IP>/api/ai        → AI Gateway
http://<INGRESS_IP>/api/billing   → Billing Service
http://<INGRESS_IP>/api/notify    → Notification Service
http://<INGRESS_IP>/api/analytics → Analytics Service
http://<INGRESS_IP>/grafana       → Grafana Dashboard
http://<INGRESS_IP>/prometheus    → Prometheus UI
```

---

## 🔐 Environment Variables

Each service has its own `.env.example`. Key variables:

```env
# Common
NODE_ENV=production
PORT=300x
LOG_LEVEL=info

# Database
DB_HOST=postgresql.promptflow.svc.cluster.local
DB_PORT=5432
DB_NAME=promptflow
DB_USER=promptflow
DB_PASSWORD=<from-k8s-secret>

# Redis
REDIS_HOST=redis.promptflow.svc.cluster.local
REDIS_PORT=6379

# JWT
JWT_SECRET=<from-k8s-secret>
JWT_EXPIRES_IN=7d

# OpenAI
OPENAI_API_KEY=<from-k8s-secret>

# AWS
AWS_REGION=us-east-1
S3_BUCKET_LOGS=promptflow-logs
S3_BUCKET_REPORTS=promptflow-reports
```

---

## 📊 CI/CD Pipeline

```
Git Push / PR
     │
     ▼
┌─────────────────────────────────────────┐
│              CI Pipeline                │
│  1. Install Dependencies (npm ci)       │
│  2. Run Unit Tests (Jest)               │
│  3. Lint (ESLint)                       │
│  4. Build Docker Image                  │
│  5. SonarQube SAST Scan                 │
│  6. Trivy CVE Scan                      │
│  7. Docker Scout Scan                   │
│  8. Push to ECR                         │
│  9. Upload Reports → S3                 │
└─────────────────┬───────────────────────┘
                  │ (on main branch only)
                  ▼
┌─────────────────────────────────────────┐
│              CD Pipeline                │
│  1. Detect changed services             │
│  2. Helm upgrade --install              │
│  3. Wait for rollout                    │
│  4. Health check endpoints              │
│  5. Rollback on failure                 │
│  6. Notify on Slack/Email               │
└─────────────────┬───────────────────────┘
                  │ (on tag v*)
                  ▼
┌─────────────────────────────────────────┐
│            Release Pipeline             │
│  1. Generate changelog                  │
│  2. Create GitHub Release               │
│  3. Tag Docker images with version      │
│  4. Upload release artifacts            │
└─────────────────────────────────────────┘
```

---

## 🎓 Interview Guide

See [`docs/interview-guide.md`](docs/interview-guide.md) for a complete guide on how to explain this project in interviews.

**Key talking points:**
- Microservices isolation and inter-service communication
- Kubernetes StatefulSets for PostgreSQL with PVC
- GitOps-style CD with Helm
- Observability stack (metrics, logs, traces)
- Security scanning in CI/CD pipeline
- Horizontal Pod Autoscaling based on custom metrics

---

## 📄 License

MIT License — see [LICENSE](LICENSE)
