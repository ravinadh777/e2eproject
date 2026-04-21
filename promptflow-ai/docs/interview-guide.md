# PromptFlow AI Platform — Interview Guide & Resume Bullets

## 🎯 Resume Bullet Points

### DevOps / Cloud Engineer Role
- Architected and deployed a **production-grade AI SaaS platform** on **AWS EKS** using **Kubernetes**, comprising 6 independent microservices with individual **Helm charts**, **HPA**, liveness/readiness probes, and **rolling update** strategies
- Implemented full **GitOps CI/CD pipeline** using **GitHub Actions**: automated testing, SonarQube SAST scanning, Trivy CVE scanning, Docker Scout analysis, ECR image push, and Helm-based deployment with automatic rollback on failure
- Built **Infrastructure as Code** with **Terraform** provisioning VPC, EKS cluster, ECR repositories, and S3 buckets with encryption, lifecycle policies, and IAM least-privilege roles
- Configured **observability stack** (Prometheus, Grafana, Loki, Fluent Bit, Alertmanager) with custom dashboards for CPU, memory, AI request latency, and error rates; routed alerts to Gmail via SMTP
- Centralized security scan reports (Trivy SARIF, Docker Scout, SonarQube coverage) and application logs in **Amazon S3** with automated upload in every CI pipeline run
- Deployed **PostgreSQL as a StatefulSet** with **PersistentVolumeClaim** on gp2 EBS storage, enabling data persistence across pod restarts; configured connection pooling and database schema initialization via init containers

### Backend / Full-Stack Engineer Role
- Built 6 **Node.js/Express microservices** (Auth, Workspace, AI Gateway, Billing, Notification, Analytics) with JWT authentication, RBAC, rate limiting, Swagger docs, and Prometheus metrics endpoints
- Implemented **RAG (Retrieval-Augmented Generation)** architecture in the AI Gateway service — extracting text from uploaded PDFs/DOCXs, chunking content, and injecting relevant context into OpenAI GPT-3.5 prompts for document Q&A
- Designed **event-driven inter-service communication** using Redis Pub/Sub: services publish domain events (user registered, document uploaded, plan upgraded) consumed by the Notification service for real-time email alerts
- Engineered multi-tenant **workspace and document management** system with S3 document storage, async text extraction pipeline, and status tracking (uploading → processing → ready)
- Built subscription billing service with three-tier plan management (Free/Pro/Team), usage metering, invoice generation, and automated usage-limit alerts

---

## 🎤 How to Explain This Project in Interviews

### 30-Second Elevator Pitch
> "I built PromptFlow AI, a SaaS platform that lets teams upload documents and ask AI-powered questions about them. It's a full microservices architecture — 6 independent Node.js services deployed on AWS EKS using Helm charts. I built the entire CI/CD pipeline from scratch with GitHub Actions, including automated security scanning with Trivy and SonarQube, with reports stored in S3. The monitoring stack uses Prometheus and Grafana with real-time alerts to Gmail."

---

### Q: "Walk me through your architecture."

**Answer:**
"The platform has 6 microservices — Auth, Workspace, AI Gateway, Billing, Notification, and Analytics. Each is a Node.js/Express app with its own PostgreSQL schema, Dockerfile, and Helm chart.

For inter-service communication, I used Redis Pub/Sub instead of synchronous HTTP calls between services like Auth and Notification — this decouples them so if the notification service is down, users can still register.

PostgreSQL is deployed as a Kubernetes StatefulSet with a PersistentVolumeClaim on AWS EBS gp2 storage, so the data survives pod restarts. Redis is deployed as a regular deployment since it's used for ephemeral cache and pub/sub.

All services sit behind an NGINX Ingress Controller on EKS that routes traffic based on URL path prefix — `/api/auth` goes to the auth service, `/api/ai` to the AI gateway, and so on. This way there's a single entry point."

---

### Q: "Tell me about your CI/CD pipeline."

**Answer:**
"I have three pipelines in GitHub Actions:

**CI Pipeline** — Triggers on every push. It detects which services changed using `dorny/paths-filter`, then runs tests, ESLint, builds the Docker image, runs Trivy for CVE scanning, Docker Scout for additional vulnerability analysis, and SonarQube for static analysis. Reports are uploaded to S3 as SARIF files. On the main branch, it pushes images to Amazon ECR.

**CD Pipeline** — Triggers when CI succeeds on main. It loops through changed services, runs `helm upgrade --install` with `--atomic`, which means if the deployment fails, Helm automatically rolls back. After deploying, it runs health checks against the Ingress IP.

**Release Pipeline** — Triggers on version tags like `v1.2.3`. It generates a changelog, creates a GitHub Release with notes, and re-tags all ECR images with the version number.

Everything sends email notifications to Gmail on success or failure using GitHub Actions' `action-send-mail`."

---

### Q: "How does the AI/RAG part work?"

**Answer:**
"When a user uploads a document, the Workspace service extracts the text — using `pdf-parse` for PDFs, `mammoth` for Word documents, and plain text for TXT files. The text is split into 500-character overlapping chunks and stored as JSONB in PostgreSQL.

When a user asks a question in the AI Chat, they can select which documents to reference. The AI Gateway service does a keyword-based search across the chunks — it filters chunks containing words from the query, takes the top 3 most relevant, and injects them into the system prompt as context.

Then the full message is sent to the OpenAI GPT-3.5 API. The response is streamed back, the conversation history is saved so follow-up questions work, and usage is tracked per user per month with Redis counters. Free users get 100 requests/month; if they hit the limit, they get a 429 with an upgrade prompt."

---

### Q: "How do you handle secrets?"

**Answer:**
"I have three layers. Kubernetes Secrets store sensitive values like DB passwords, JWT secrets, and API keys — these are created during setup and referenced in Helm charts via `secretKeyRef` in the container spec. The secrets are never in the source code or Helm values files.

In the CI/CD pipeline, GitHub Actions Secrets store AWS credentials, ECR registry URL, SMTP credentials, and SonarQube tokens. These are injected as environment variables only when pipelines run.

For the infrastructure level, Terraform uses IAM roles with least-privilege policies — nodes only have S3 write access to the specific log buckets, and ECR read access. There's no wildcard permissions."

---

### Q: "How does monitoring work?"

**Answer:**
"The stack is Prometheus + Grafana + Loki + Fluent Bit + Alertmanager, all installed via Helm.

Each microservice exposes a `/health/metrics` endpoint with `prom-client` — it exports standard Node.js metrics plus custom ones like login attempts, AI request latency histograms, and token usage counters. Prometheus scrapes these via pod annotations.

Grafana dashboards show CPU, memory, HTTP request rates, AI latency percentiles, and error rates. I have pre-built dashboards committed as JSON ConfigMaps so they load automatically.

For logs, Fluent Bit runs as a DaemonSet on every node, collects all container logs, and ships them to two places: Loki for live querying in Grafana, and S3 for long-term storage.

Alertmanager is configured to send emails to Gmail — it routes CRITICAL alerts immediately with a 1-hour repeat interval, and WARNING alerts with a 12-hour repeat."

---

### Q: "What would you improve?"

Great question — shows engineering maturity. Good answers:
- "Add proper vector embeddings using `text-embedding-ada-002` instead of keyword search for better RAG retrieval"
- "Replace Redis Pub/Sub with Amazon SQS/SNS for guaranteed message delivery in production"
- "Add distributed tracing with OpenTelemetry and Jaeger for cross-service request correlation"
- "Implement database connection pooling with PgBouncer to handle higher concurrency"
- "Add canary deployments using Argo Rollouts instead of basic rolling updates"
- "Use AWS Secrets Manager instead of Kubernetes Secrets for better rotation and auditing"

---

## 📊 Key Numbers to Remember

| Metric | Value |
|--------|-------|
| Microservices | 6 |
| CI/CD Pipelines | 3 (CI, CD, Release) + 1 scheduled |
| Helm charts | 9 (6 services + frontend + PostgreSQL + Redis) |
| Security scanners | 3 (Trivy, Docker Scout, SonarQube) |
| Monitoring tools | 5 (Prometheus, Grafana, Loki, Fluent Bit, Alertmanager) |
| Database | PostgreSQL 15 StatefulSet with PVC |
| Cache/Messaging | Redis 7 (cache + pub/sub) |
| Node.js version | 20 LTS |
| EKS version | 1.29 |
| Terraform resources | ~25 (VPC, subnets, IGW, NAT, EKS, ECR×7, S3×2, IAM×5) |
