# Required GitHub Secrets & Variables

## Repository Secrets (Settings → Secrets and variables → Actions → Secrets)

| Secret | Description | Example |
|--------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS IAM user access key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM user secret key | `wJalrXUtnFEMI/K7MDENG/...` |
| `ECR_REGISTRY` | ECR registry URL | `123456789.dkr.ecr.us-east-1.amazonaws.com` |
| `S3_REPORTS_BUCKET` | S3 bucket for scan reports | `promptflow-reports-123456789` |
| `S3_LOGS_BUCKET` | S3 bucket for app logs | `promptflow-logs-123456789` |
| `SONAR_TOKEN` | SonarCloud API token | `sqp_abc123...` |
| `SONAR_ORGANIZATION` | SonarCloud org slug | `your-org` |
| `SMTP_USER` | Gmail address for alerts | `alerts@gmail.com` |
| `SMTP_PASS` | Gmail App Password | `abcd efgh ijkl mnop` |
| `ALERT_EMAIL` | Email to receive alerts | `devops@company.com` |
| `DOCKER_HUB_USERNAME` | DockerHub username (for Scout) | `youruser` |
| `DOCKER_HUB_TOKEN` | DockerHub access token | `dckr_pat_...` |

## Repository Variables (Settings → Secrets and variables → Actions → Variables)

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_REGION` | AWS region | `us-east-1` |
| `CLUSTER_NAME` | EKS cluster name | `promptflow-cluster` |

## Setup Instructions

### 1. Create Gmail App Password
1. Go to Google Account → Security → 2-Step Verification → App passwords
2. Generate a password for "Mail" on "Other device"
3. Use this as `SMTP_PASS` (format: `xxxx xxxx xxxx xxxx`)

### 2. Create SonarCloud Account
1. Sign up at https://sonarcloud.io with GitHub
2. Create an organization
3. Generate token at My Account → Security

### 3. Get ECR Registry URL
After running setup.sh or Terraform:
```bash
aws sts get-caller-identity --query Account --output text
# 123456789
# Registry: 123456789.dkr.ecr.us-east-1.amazonaws.com
```
