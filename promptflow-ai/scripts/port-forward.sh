#!/usr/bin/env bash
# scripts/port-forward.sh - Forward all service ports for local dev
NAMESPACE=${NAMESPACE:-promptflow}
echo "Port forwarding all PromptFlow services..."
kubectl port-forward svc/auth-service        3001:3001 -n $NAMESPACE &
kubectl port-forward svc/workspace-service   3002:3002 -n $NAMESPACE &
kubectl port-forward svc/ai-gateway-service  3003:3003 -n $NAMESPACE &
kubectl port-forward svc/billing-service     3004:3004 -n $NAMESPACE &
kubectl port-forward svc/notification-service 3005:3005 -n $NAMESPACE &
kubectl port-forward svc/analytics-service   3006:3006 -n $NAMESPACE &
kubectl port-forward svc/postgresql          5432:5432 -n $NAMESPACE &
kubectl port-forward svc/redis-master        6379:6379 -n $NAMESPACE &
kubectl port-forward svc/kube-prometheus-stack-grafana 3030:80 -n monitoring &
echo "Services available at:"
echo "  Auth:         http://localhost:3001"
echo "  Workspace:    http://localhost:3002"
echo "  AI Gateway:   http://localhost:3003"
echo "  Billing:      http://localhost:3004"
echo "  Notification: http://localhost:3005"
echo "  Analytics:    http://localhost:3006"
echo "  Grafana:      http://localhost:3030 (admin/PromptFlow2024!)"
echo ""
echo "Press Ctrl+C to stop all port forwards"
wait
