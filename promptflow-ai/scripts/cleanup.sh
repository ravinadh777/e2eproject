#!/usr/bin/env bash
# scripts/cleanup.sh - DESTROY ALL resources (use with caution!)
set -euo pipefail
RED='\033[0;31m'; NC='\033[0m'
echo -e "${RED}⚠️  WARNING: This will DESTROY ALL PromptFlow AI AWS resources!${NC}"
read -p "Type 'destroy' to confirm: " CONFIRM
[[ "$CONFIRM" != "destroy" ]] && { echo "Aborted."; exit 1; }

NAMESPACE=${NAMESPACE:-promptflow}
AWS_REGION=${AWS_REGION:-us-east-1}

echo "Removing Helm releases..."
for SVC in auth-service workspace-service ai-gateway-service billing-service notification-service analytics-service frontend postgresql redis; do
  helm uninstall "$SVC" -n "$NAMESPACE" 2>/dev/null && echo "Removed $SVC" || true
done
helm uninstall ingress-nginx -n ingress-nginx 2>/dev/null || true
helm uninstall kube-prometheus-stack -n monitoring 2>/dev/null || true
helm uninstall loki -n logging 2>/dev/null || true
helm uninstall fluent-bit -n logging 2>/dev/null || true

echo "Deleting namespaces..."
for NS in $NAMESPACE monitoring logging ingress-nginx; do
  kubectl delete namespace "$NS" --ignore-not-found
done

echo "Destroying Terraform infrastructure (EKS, ECR, S3, VPC)..."
cd terraform/environments/dev
terraform destroy -auto-approve \
  -var="aws_region=$AWS_REGION" \
  -var="environment=dev" 2>/dev/null || true

echo "Done. All resources destroyed."
