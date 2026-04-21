#!/usr/bin/env bash
# scripts/health-check.sh - Check all service health endpoints
set -euo pipefail
INGRESS_HOST=${1:-$(kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "localhost")}

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
PASS=0; FAIL=0

declare -A ENDPOINTS=(
  [auth-service]="/api/auth/health"
  [workspace-service]="/api/workspace/health"
  [ai-gateway-service]="/api/ai/health"
  [billing-service]="/api/billing/health"
  [notification-service]="/api/notify/health"
  [analytics-service]="/api/analytics/health"
)

echo -e "\n${YELLOW}Health Check — $INGRESS_HOST${NC}\n"
for SVC in "${!ENDPOINTS[@]}"; do
  EP="${ENDPOINTS[$SVC]}"
  URL="http://${INGRESS_HOST}${EP}"
  HTTP=$(curl -sf -o /tmp/hc_body.json -w "%{http_code}" --max-time 10 "$URL" 2>/dev/null || echo "000")
  if [[ "$HTTP" == "200" ]]; then
    echo -e "${GREEN}✅ $SVC${NC} → $HTTP"
    ((PASS++))
  else
    echo -e "${RED}❌ $SVC${NC} → $HTTP (${URL})"
    ((FAIL++))
  fi
done

echo -e "\nResult: ${GREEN}$PASS passed${NC} / ${RED}$FAIL failed${NC}"
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
