#!/usr/bin/env bash
# scripts/deploy-service.sh
# Deploy a single service or all services via Helm
# Usage: ./scripts/deploy-service.sh [--service auth-service] [--tag v1.2.3] [--all]

set -euo pipefail

NAMESPACE=${NAMESPACE:-promptflow}
AWS_REGION=${AWS_REGION:-us-east-1}
CLUSTER_NAME=${CLUSTER_NAME:-promptflow-cluster}
ECR_REGISTRY=${ECR_REGISTRY:-}
SERVICE=""
TAG="latest"
ALL=false

for arg in "$@"; do
  case $arg in
    --service=*) SERVICE="${arg#*=}" ;;
    --tag=*)     TAG="${arg#*=}" ;;
    --all)       ALL=true ;;
    --service)   shift; SERVICE="$1" ;;
    --tag)       shift; TAG="$1" ;;
  esac
done

GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
log()   { echo -e "${GREEN}[$(date +%H:%M:%S)] $*${NC}"; }
error() { echo -e "${RED}[$(date +%H:%M:%S)] $*${NC}" >&2; }

if [[ -z "$ECR_REGISTRY" ]]; then
  ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
  ECR_REGISTRY="${ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com"
fi

INGRESS_HOST=$(kubectl get svc ingress-nginx-controller -n ingress-nginx \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || \
  kubectl get svc ingress-nginx-controller -n ingress-nginx \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "localhost")

declare -A PORTS=(
  [auth-service]=3001 [workspace-service]=3002 [ai-gateway-service]=3003
  [billing-service]=3004 [notification-service]=3005 [analytics-service]=3006 [frontend]=3000
)

deploy_service() {
  local SVC=$1
  local PORT=${PORTS[$SVC]:-3000}
  log "Deploying $SVC (tag=$TAG, port=$PORT)"

  helm upgrade --install "$SVC" "./helm/$SVC" \
    --namespace "$NAMESPACE" \
    --set image.repository="${ECR_REGISTRY}/promptflow/$SVC" \
    --set image.tag="$TAG" \
    --set image.pullPolicy=Always \
    --set service.port="$PORT" \
    --set ingress.host="$INGRESS_HOST" \
    --set env.DB_HOST="postgresql.${NAMESPACE}.svc.cluster.local" \
    --set env.REDIS_HOST="redis-master.${NAMESPACE}.svc.cluster.local" \
    --set env.NODE_ENV=production \
    --wait --timeout 5m --atomic

  log "$SVC deployed successfully"
}

if [[ "$ALL" == "true" ]]; then
  SERVICES="auth-service workspace-service ai-gateway-service billing-service notification-service analytics-service frontend"
  for SVC in $SERVICES; do deploy_service "$SVC" || error "Failed: $SVC"; done
elif [[ -n "$SERVICE" ]]; then
  deploy_service "$SERVICE"
else
  echo "Usage: $0 --service <name> [--tag <tag>] | --all [--tag <tag>]"
  exit 1
fi

log "Deployment complete!"
kubectl get pods -n "$NAMESPACE" -o wide
