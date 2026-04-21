#!/usr/bin/env bash
# =============================================================================
# PromptFlow AI Platform - Complete Setup Script
# =============================================================================
# This script installs all required tools and deploys the entire platform
# to AWS EKS. Run this once on a fresh Linux/macOS machine.
#
# Usage: ./setup.sh [--skip-tools] [--skip-infra] [--skip-deploy]
# =============================================================================

set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# ─── Config ───────────────────────────────────────────────────────────────────
AWS_REGION="${AWS_REGION:-us-east-1}"
CLUSTER_NAME="${CLUSTER_NAME:-promptflow-cluster}"
NAMESPACE="${NAMESPACE:-promptflow}"
ECR_REGISTRY=""   # Set after Terraform creates ECR
SKIP_TOOLS=false
SKIP_INFRA=false
SKIP_DEPLOY=false

# ─── Parse Arguments ──────────────────────────────────────────────────────────
for arg in "$@"; do
  case $arg in
    --skip-tools) SKIP_TOOLS=true ;;
    --skip-infra)  SKIP_INFRA=true ;;
    --skip-deploy) SKIP_DEPLOY=true ;;
  esac
done

# ─── Logging Helpers ──────────────────────────────────────────────────────────
log()     { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅  $*${NC}"; }
info()    { echo -e "${BLUE}[$(date '+%H:%M:%S')] ℹ️   $*${NC}"; }
warn()    { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️   $*${NC}"; }
error()   { echo -e "${RED}[$(date '+%H:%M:%S')] ❌  $*${NC}" >&2; }
header()  { echo -e "\n${BOLD}${CYAN}══════════════════════════════════════════${NC}"; \
            echo -e "${BOLD}${CYAN}  $*${NC}"; \
            echo -e "${BOLD}${CYAN}══════════════════════════════════════════${NC}\n"; }

# ─── OS Detection ─────────────────────────────────────────────────────────────
detect_os() {
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if command -v apt-get &>/dev/null; then OS="ubuntu"
    elif command -v yum &>/dev/null; then OS="amazon-linux"
    else OS="linux"
    fi
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
  else
    error "Unsupported OS: $OSTYPE"
    exit 1
  fi
  info "Detected OS: $OS"
}

# ─── Check if command exists ──────────────────────────────────────────────────
command_exists() { command -v "$1" &>/dev/null; }

# ─── Install Tools ────────────────────────────────────────────────────────────
install_tools() {
  header "STEP 1: Installing Required Tools"

  # ── AWS CLI v2 ──
  if ! command_exists aws; then
    info "Installing AWS CLI v2..."
    if [[ "$OS" == "ubuntu" || "$OS" == "linux" ]]; then
      curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
      unzip -q /tmp/awscliv2.zip -d /tmp
      sudo /tmp/aws/install
    elif [[ "$OS" == "macos" ]]; then
      curl -fsSL "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o /tmp/AWSCLIV2.pkg
      sudo installer -pkg /tmp/AWSCLIV2.pkg -target /
    fi
    log "AWS CLI installed: $(aws --version)"
  else
    log "AWS CLI already installed: $(aws --version)"
  fi

  # ── kubectl ──
  if ! command_exists kubectl; then
    info "Installing kubectl..."
    KUBECTL_VERSION=$(curl -fsSL https://dl.k8s.io/release/stable.txt)
    if [[ "$OS" == "ubuntu" || "$OS" == "linux" ]]; then
      curl -fsSLO "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl"
      sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
      rm kubectl
    elif [[ "$OS" == "macos" ]]; then
      curl -fsSLO "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/darwin/amd64/kubectl"
      chmod +x kubectl && sudo mv kubectl /usr/local/bin/kubectl
    fi
    log "kubectl installed: $(kubectl version --client --short)"
  else
    log "kubectl already installed: $(kubectl version --client --short 2>/dev/null || echo 'version check skipped')"
  fi

  # ── eksctl ──
  if ! command_exists eksctl; then
    info "Installing eksctl..."
    if [[ "$OS" == "ubuntu" || "$OS" == "linux" ]]; then
      ARCH=amd64
      PLATFORM=$(uname -s)_$ARCH
      curl -fsSL "https://github.com/eksctl-io/eksctl/releases/latest/download/eksctl_${PLATFORM}.tar.gz" | tar xz -C /tmp
      sudo mv /tmp/eksctl /usr/local/bin
    elif [[ "$OS" == "macos" ]]; then
      brew tap weaveworks/tap && brew install weaveworks/tap/eksctl
    fi
    log "eksctl installed: $(eksctl version)"
  else
    log "eksctl already installed: $(eksctl version)"
  fi

  # ── Helm ──
  if ! command_exists helm; then
    info "Installing Helm v3..."
    curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
    log "Helm installed: $(helm version --short)"
  else
    log "Helm already installed: $(helm version --short)"
  fi

  # ── Terraform ──
  if ! command_exists terraform; then
    info "Installing Terraform..."
    if [[ "$OS" == "ubuntu" ]]; then
      sudo apt-get update -qq && sudo apt-get install -y gnupg software-properties-common
      wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
      echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
      sudo apt-get update -qq && sudo apt-get install -y terraform
    elif [[ "$OS" == "macos" ]]; then
      brew tap hashicorp/tap && brew install hashicorp/tap/terraform
    fi
    log "Terraform installed: $(terraform version -json | python3 -c 'import sys,json; print(json.load(sys.stdin)[\"terraform_version\"])')"
  else
    log "Terraform already installed: $(terraform version | head -1)"
  fi

  # ── Docker ──
  if ! command_exists docker; then
    info "Installing Docker..."
    if [[ "$OS" == "ubuntu" ]]; then
      curl -fsSL https://get.docker.com | sh
      sudo usermod -aG docker "$USER"
      warn "Docker installed. You may need to log out and back in for group membership."
    elif [[ "$OS" == "macos" ]]; then
      warn "Please install Docker Desktop manually from https://www.docker.com/products/docker-desktop"
    fi
  else
    log "Docker already installed: $(docker --version)"
  fi

  # ── Trivy ──
  if ! command_exists trivy; then
    info "Installing Trivy..."
    if [[ "$OS" == "ubuntu" ]]; then
      sudo apt-get install -y wget apt-transport-https gnupg lsb-release
      wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
      echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/trivy.list
      sudo apt-get update -qq && sudo apt-get install -y trivy
    elif [[ "$OS" == "macos" ]]; then
      brew install aquasecurity/trivy/trivy
    fi
    log "Trivy installed: $(trivy --version | head -1)"
  else
    log "Trivy already installed: $(trivy --version | head -1)"
  fi

  # ── SonarScanner ──
  if ! command_exists sonar-scanner; then
    info "Installing SonarScanner..."
    SONAR_VERSION="5.0.1.3006"
    if [[ "$OS" == "ubuntu" || "$OS" == "linux" ]]; then
      curl -fsSLO "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-${SONAR_VERSION}-linux.zip"
      unzip -q "sonar-scanner-cli-${SONAR_VERSION}-linux.zip" -d /opt
      sudo ln -sf "/opt/sonar-scanner-${SONAR_VERSION}-linux/bin/sonar-scanner" /usr/local/bin/sonar-scanner
      rm "sonar-scanner-cli-${SONAR_VERSION}-linux.zip"
    elif [[ "$OS" == "macos" ]]; then
      brew install sonar-scanner
    fi
    log "SonarScanner installed"
  else
    log "SonarScanner already installed"
  fi

  # ── jq (JSON processing) ──
  if ! command_exists jq; then
    info "Installing jq..."
    if [[ "$OS" == "ubuntu" ]]; then sudo apt-get install -y jq
    elif [[ "$OS" == "macos" ]]; then brew install jq
    fi
    log "jq installed"
  fi

  # ── yq (YAML processing) ──
  if ! command_exists yq; then
    info "Installing yq..."
    sudo wget -qO /usr/local/bin/yq "https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64"
    sudo chmod +x /usr/local/bin/yq
    log "yq installed"
  fi

  log "All tools installed successfully!"
}

# ─── Validate AWS Credentials ─────────────────────────────────────────────────
validate_aws() {
  header "STEP 2: Validating AWS Credentials"
  
  if ! aws sts get-caller-identity &>/dev/null; then
    error "AWS credentials not configured!"
    info "Run: aws configure"
    info "You need: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION"
    exit 1
  fi
  
  AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  AWS_USER=$(aws sts get-caller-identity --query Arn --output text)
  log "AWS Account: $AWS_ACCOUNT_ID"
  log "AWS Identity: $AWS_USER"
  log "Region: $AWS_REGION"
}

# ─── Terraform Infrastructure ─────────────────────────────────────────────────
deploy_infrastructure() {
  header "STEP 3: Deploying AWS Infrastructure (Terraform)"

  cd terraform/environments/dev

  info "Initializing Terraform..."
  terraform init -upgrade

  info "Planning infrastructure..."
  terraform plan -out=tfplan \
    -var="aws_region=${AWS_REGION}" \
    -var="cluster_name=${CLUSTER_NAME}" \
    -var="environment=dev"

  info "Applying infrastructure (this takes ~15 minutes)..."
  terraform apply -auto-approve tfplan

  # Export outputs
  ECR_REGISTRY=$(terraform output -raw ecr_registry 2>/dev/null || echo "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com")
  S3_LOGS_BUCKET=$(terraform output -raw s3_logs_bucket 2>/dev/null || echo "promptflow-logs-${AWS_ACCOUNT_ID}")
  
  log "ECR Registry: $ECR_REGISTRY"
  log "S3 Logs Bucket: $S3_LOGS_BUCKET"
  
  cd ../../..
}

# ─── Configure kubectl ────────────────────────────────────────────────────────
configure_kubectl() {
  header "STEP 4: Configuring kubectl for EKS"

  info "Updating kubeconfig..."
  aws eks update-kubeconfig \
    --region "$AWS_REGION" \
    --name "$CLUSTER_NAME"

  info "Verifying cluster connection..."
  kubectl cluster-info
  kubectl get nodes
  
  log "kubectl configured for cluster: $CLUSTER_NAME"
}

# ─── Create Namespaces ────────────────────────────────────────────────────────
create_namespaces() {
  header "STEP 5: Creating Kubernetes Namespaces"

  NAMESPACES=(
    "promptflow"
    "monitoring"
    "logging"
    "ingress-nginx"
    "cert-manager"
  )

  for ns in "${NAMESPACES[@]}"; do
    if kubectl get namespace "$ns" &>/dev/null; then
      info "Namespace $ns already exists"
    else
      kubectl create namespace "$ns"
      log "Created namespace: $ns"
    fi
  done

  # Label namespaces
  kubectl label namespace promptflow \
    app.kubernetes.io/managed-by=promptflow \
    environment=dev \
    --overwrite

  log "All namespaces created"
}

# ─── Create Kubernetes Secrets ────────────────────────────────────────────────
create_secrets() {
  header "STEP 6: Creating Kubernetes Secrets"

  # Generate random secrets for demo
  DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/@+=')
  JWT_SECRET=$(openssl rand -base64 48)
  REDIS_PASSWORD=$(openssl rand -base64 16 | tr -d '/@+=')

  # Database secret
  kubectl create secret generic db-credentials \
    --namespace=promptflow \
    --from-literal=DB_PASSWORD="$DB_PASSWORD" \
    --from-literal=DB_USER="promptflow" \
    --from-literal=DB_NAME="promptflow" \
    --dry-run=client -o yaml | kubectl apply -f -

  # JWT secret
  kubectl create secret generic jwt-secret \
    --namespace=promptflow \
    --from-literal=JWT_SECRET="$JWT_SECRET" \
    --dry-run=client -o yaml | kubectl apply -f -

  # Redis secret
  kubectl create secret generic redis-credentials \
    --namespace=promptflow \
    --from-literal=REDIS_PASSWORD="$REDIS_PASSWORD" \
    --dry-run=client -o yaml | kubectl apply -f -

  # OpenAI API key (user must provide)
  OPENAI_KEY="${OPENAI_API_KEY:-sk-demo-key-replace-me}"
  kubectl create secret generic openai-credentials \
    --namespace=promptflow \
    --from-literal=OPENAI_API_KEY="$OPENAI_KEY" \
    --dry-run=client -o yaml | kubectl apply -f -

  # SMTP credentials (for notifications)
  kubectl create secret generic smtp-credentials \
    --namespace=promptflow \
    --from-literal=SMTP_HOST="${SMTP_HOST:-smtp.gmail.com}" \
    --from-literal=SMTP_PORT="${SMTP_PORT:-587}" \
    --from-literal=SMTP_USER="${SMTP_USER:-demo@gmail.com}" \
    --from-literal=SMTP_PASS="${SMTP_PASS:-demo-app-password}" \
    --dry-run=client -o yaml | kubectl apply -f -

  # AWS credentials for S3 log uploads
  kubectl create secret generic aws-credentials \
    --namespace=promptflow \
    --from-literal=AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}" \
    --from-literal=AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}" \
    --from-literal=AWS_REGION="$AWS_REGION" \
    --dry-run=client -o yaml | kubectl apply -f -

  log "All secrets created"
  warn "IMPORTANT: Update OPENAI_API_KEY, SMTP_USER, SMTP_PASS with real values!"
}

# ─── Install NGINX Ingress Controller ─────────────────────────────────────────
install_ingress() {
  header "STEP 7: Installing NGINX Ingress Controller"

  helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
  helm repo update

  helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
    --namespace ingress-nginx \
    --create-namespace \
    --set controller.replicaCount=1 \
    --set controller.service.type=LoadBalancer \
    --set controller.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-type"=nlb \
    --set controller.metrics.enabled=true \
    --set controller.metrics.serviceMonitor.enabled=true \
    --wait --timeout=5m

  log "Waiting for LoadBalancer IP..."
  for i in {1..30}; do
    INGRESS_IP=$(kubectl get svc ingress-nginx-controller -n ingress-nginx \
      -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
    if [[ -n "$INGRESS_IP" ]]; then
      break
    fi
    sleep 10
    info "Waiting for LoadBalancer... ($i/30)"
  done

  log "Ingress Controller IP/Hostname: $INGRESS_IP"
  echo "$INGRESS_IP" > /tmp/ingress-ip.txt
}

# ─── Deploy PostgreSQL StatefulSet ───────────────────────────────────────────
deploy_postgresql() {
  header "STEP 8: Deploying PostgreSQL (StatefulSet)"

  helm upgrade --install postgresql ./helm/postgresql \
    --namespace promptflow \
    --set auth.username=promptflow \
    --set auth.database=promptflow \
    --set auth.existingSecret=db-credentials \
    --set primary.persistence.enabled=true \
    --set primary.persistence.size=10Gi \
    --set primary.persistence.storageClass=gp2 \
    --set primary.resources.requests.memory=256Mi \
    --set primary.resources.requests.cpu=100m \
    --set primary.resources.limits.memory=512Mi \
    --set primary.resources.limits.cpu=500m \
    --wait --timeout=5m

  log "PostgreSQL deployed"

  # Wait for it to be ready
  kubectl rollout status statefulset/postgresql -n promptflow --timeout=3m
  log "PostgreSQL is ready"
}

# ─── Deploy Redis ─────────────────────────────────────────────────────────────
deploy_redis() {
  header "STEP 9: Deploying Redis"

  helm upgrade --install redis ./helm/redis \
    --namespace promptflow \
    --set auth.password="$(kubectl get secret redis-credentials -n promptflow -o jsonpath='{.data.REDIS_PASSWORD}' | base64 -d)" \
    --set master.persistence.enabled=true \
    --set master.persistence.size=5Gi \
    --set master.resources.requests.memory=128Mi \
    --set master.resources.requests.cpu=50m \
    --wait --timeout=5m

  log "Redis deployed"
}

# ─── Build and Push Docker Images ─────────────────────────────────────────────
build_and_push_images() {
  header "STEP 10: Building & Pushing Docker Images to ECR"

  # Login to ECR
  aws ecr get-login-password --region "$AWS_REGION" | \
    docker login --username AWS --password-stdin "${ECR_REGISTRY}"

  SERVICES=(
    "auth-service"
    "workspace-service"
    "ai-gateway-service"
    "billing-service"
    "notification-service"
    "analytics-service"
  )

  for service in "${SERVICES[@]}"; do
    info "Building: $service..."

    # Create ECR repo if not exists
    aws ecr describe-repositories --repository-names "promptflow/${service}" \
      --region "$AWS_REGION" 2>/dev/null || \
    aws ecr create-repository \
      --repository-name "promptflow/${service}" \
      --region "$AWS_REGION" \
      --image-scanning-configuration scanOnPush=true \
      --encryption-configuration encryptionType=AES256

    IMAGE_TAG="${ECR_REGISTRY}/promptflow/${service}:latest"

    docker build \
      -t "$IMAGE_TAG" \
      -f "services/${service}/Dockerfile" \
      "services/${service}/" \
      --build-arg NODE_ENV=production

    docker push "$IMAGE_TAG"
    log "$service image pushed: $IMAGE_TAG"
  done

  # Frontend
  aws ecr describe-repositories --repository-names "promptflow/frontend" \
    --region "$AWS_REGION" 2>/dev/null || \
  aws ecr create-repository \
    --repository-name "promptflow/frontend" \
    --region "$AWS_REGION"

  docker build -t "${ECR_REGISTRY}/promptflow/frontend:latest" \
    -f frontend/Dockerfile frontend/
  docker push "${ECR_REGISTRY}/promptflow/frontend:latest"
  log "Frontend image pushed"
}

# ─── Deploy Microservices ─────────────────────────────────────────────────────
deploy_services() {
  header "STEP 11: Deploying Microservices via Helm"

  INGRESS_IP=$(cat /tmp/ingress-ip.txt 2>/dev/null || echo "localhost")

  SERVICES=(
    "auth-service:3001"
    "workspace-service:3002"
    "ai-gateway-service:3003"
    "billing-service:3004"
    "notification-service:3005"
    "analytics-service:3006"
  )

  for entry in "${SERVICES[@]}"; do
    service="${entry%%:*}"
    port="${entry##*:}"
    
    info "Deploying $service..."
    
    helm upgrade --install "$service" "./helm/${service}" \
      --namespace promptflow \
      --set image.repository="${ECR_REGISTRY}/promptflow/${service}" \
      --set image.tag=latest \
      --set service.port="$port" \
      --set ingress.host="$INGRESS_IP" \
      --set env.DB_HOST="postgresql.promptflow.svc.cluster.local" \
      --set env.REDIS_HOST="redis-master.promptflow.svc.cluster.local" \
      --set env.NODE_ENV=production \
      --set env.AWS_REGION="$AWS_REGION" \
      --set env.S3_BUCKET_LOGS="promptflow-logs-${AWS_ACCOUNT_ID:-demo}" \
      --wait --timeout=5m

    log "$service deployed"
  done

  # Frontend
  info "Deploying frontend..."
  helm upgrade --install frontend "./helm/frontend" \
    --namespace promptflow \
    --set image.repository="${ECR_REGISTRY}/promptflow/frontend" \
    --set image.tag=latest \
    --set ingress.host="$INGRESS_IP" \
    --wait --timeout=5m
  log "Frontend deployed"
}

# ─── Install Monitoring Stack ─────────────────────────────────────────────────
install_monitoring() {
  header "STEP 12: Installing Monitoring Stack (Prometheus + Grafana + Loki)"

  # Add Helm repos
  helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
  helm repo add grafana https://grafana.github.io/helm-charts
  helm repo update

  # Install kube-prometheus-stack (includes Prometheus + Grafana + Alertmanager)
  helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
    --namespace monitoring \
    --create-namespace \
    --values monitoring/prometheus/values.yaml \
    --set grafana.adminPassword=PromptFlow2024! \
    --set grafana.ingress.enabled=true \
    --set grafana.ingress.hosts[0]="grafana.$(cat /tmp/ingress-ip.txt 2>/dev/null || echo localhost)" \
    --set alertmanager.config.global.smtp_smarthost="${SMTP_HOST:-smtp.gmail.com}:587" \
    --set alertmanager.config.global.smtp_auth_username="${SMTP_USER:-demo@gmail.com}" \
    --set alertmanager.config.global.smtp_auth_password="${SMTP_PASS:-demo}" \
    --wait --timeout=10m

  log "Prometheus + Grafana + Alertmanager installed"

  # Install Loki + Promtail
  helm upgrade --install loki grafana/loki-stack \
    --namespace logging \
    --create-namespace \
    --set loki.persistence.enabled=true \
    --set loki.persistence.size=10Gi \
    --set promtail.enabled=true \
    --wait --timeout=5m

  log "Loki + Promtail installed"

  # Apply Grafana dashboards
  kubectl apply -f monitoring/grafana/dashboards/ -n monitoring 2>/dev/null || true

  log "Monitoring stack installed"
}

# ─── Install Fluent Bit ───────────────────────────────────────────────────────
install_fluent_bit() {
  header "STEP 13: Installing Fluent Bit (Log Shipping to S3)"

  helm repo add fluent https://fluent.github.io/helm-charts
  helm repo update

  helm upgrade --install fluent-bit fluent/fluent-bit \
    --namespace logging \
    --values monitoring/fluent-bit/values.yaml \
    --set config.outputs="[OUTPUT]\n    Name s3\n    Match *\n    bucket promptflow-logs-${AWS_ACCOUNT_ID:-demo}\n    region ${AWS_REGION}\n    total_file_size 100M\n    upload_timeout 10m" \
    --wait --timeout=5m

  log "Fluent Bit installed — logs will ship to S3"
}

# ─── Apply Ingress Rules ──────────────────────────────────────────────────────
apply_ingress() {
  header "STEP 14: Applying Ingress Routing Rules"

  INGRESS_IP=$(cat /tmp/ingress-ip.txt 2>/dev/null || echo "localhost")
  
  # Replace placeholder in ingress manifest
  sed "s/INGRESS_IP_PLACEHOLDER/${INGRESS_IP}/g" \
    helm/ingress/templates/ingress.yaml | kubectl apply -f -

  log "Ingress rules applied"
}

# ─── Post-Deploy Health Check ─────────────────────────────────────────────────
health_check() {
  header "STEP 15: Running Health Checks"

  INGRESS_IP=$(cat /tmp/ingress-ip.txt 2>/dev/null || echo "localhost")

  ENDPOINTS=(
    "/api/auth/health"
    "/api/workspace/health"
    "/api/ai/health"
    "/api/billing/health"
    "/api/notify/health"
    "/api/analytics/health"
  )

  PASS=0
  FAIL=0

  for endpoint in "${ENDPOINTS[@]}"; do
    URL="http://${INGRESS_IP}${endpoint}"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL" || echo "000")
    if [[ "$HTTP_CODE" == "200" ]]; then
      log "✅ $endpoint → HTTP $HTTP_CODE"
      ((PASS++))
    else
      warn "⚠️  $endpoint → HTTP $HTTP_CODE"
      ((FAIL++))
    fi
  done

  echo ""
  log "Health Check Summary: $PASS passed, $FAIL failed"

  if [[ $FAIL -gt 0 ]]; then
    warn "Some services are not healthy yet. They may still be starting up."
    info "Run: kubectl get pods -n promptflow"
  fi
}

# ─── Print Summary ────────────────────────────────────────────────────────────
print_summary() {
  header "🎉 DEPLOYMENT COMPLETE!"

  INGRESS_IP=$(cat /tmp/ingress-ip.txt 2>/dev/null || echo "PENDING")

  echo -e "${BOLD}${GREEN}"
  cat << EOF
╔══════════════════════════════════════════════════════════╗
║          PromptFlow AI Platform — Deployment Summary      ║
╠══════════════════════════════════════════════════════════╣
║                                                           ║
║  🌐 Frontend:       http://${INGRESS_IP}/                 ║
║  🔐 Auth API:       http://${INGRESS_IP}/api/auth         ║
║  📁 Workspace API:  http://${INGRESS_IP}/api/workspace    ║
║  🤖 AI Gateway:     http://${INGRESS_IP}/api/ai           ║
║  💳 Billing API:    http://${INGRESS_IP}/api/billing      ║
║  🔔 Notify API:     http://${INGRESS_IP}/api/notify       ║
║  📊 Analytics API:  http://${INGRESS_IP}/api/analytics    ║
║                                                           ║
║  📈 Grafana:        http://${INGRESS_IP}/grafana          ║
║     Username: admin                                       ║
║     Password: PromptFlow2024!                             ║
║                                                           ║
║  ⚡ Prometheus:     http://${INGRESS_IP}/prometheus       ║
║                                                           ║
╠══════════════════════════════════════════════════════════╣
║                                                           ║
║  📌 Useful Commands:                                      ║
║     kubectl get pods -n promptflow                        ║
║     kubectl get svc -n promptflow                         ║
║     kubectl logs -n promptflow -l app=auth-service        ║
║     ./scripts/port-forward.sh                             ║
║                                                           ║
╚══════════════════════════════════════════════════════════╝
EOF
  echo -e "${NC}"
}

# ─── Main Execution ───────────────────────────────────────────────────────────
main() {
  echo -e "${BOLD}${CYAN}"
  cat << 'EOF'
  ____                            _   ___ _               _    ___ 
 |  _ \ _ __ ___  _ __ ___  _ __| |_|  _| | _____      _/ \  |_ _|
 | |_) | '__/ _ \| '_ ` _ \| '_ \ __| |_ | |/ _ \ \ /\ / / \  | | 
 |  __/| | | (_) | | | | | | |_) | |_|  _|| | (_) \ V  V / /\ \ | | 
 |_|   |_|  \___/|_| |_| |_| .__/ \__|_|  |_|\___/ \_/\_/_/  \_\___|
                             |_|                                      
                          AI Platform Setup Script v1.0.0
EOF
  echo -e "${NC}"
  
  info "Starting PromptFlow AI Platform setup..."
  info "Timestamp: $(date)"
  echo ""

  detect_os

  [[ "$SKIP_TOOLS" == "false" ]] && install_tools
  
  validate_aws
  
  [[ "$SKIP_INFRA" == "false" ]] && deploy_infrastructure
  
  configure_kubectl
  create_namespaces
  create_secrets
  install_ingress
  deploy_postgresql
  deploy_redis
  
  [[ "$SKIP_DEPLOY" == "false" ]] && build_and_push_images
  [[ "$SKIP_DEPLOY" == "false" ]] && deploy_services
  
  install_monitoring
  install_fluent_bit
  apply_ingress
  health_check
  print_summary
}

# Run
main "$@"
