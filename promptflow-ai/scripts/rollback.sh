#!/usr/bin/env bash
# scripts/rollback.sh
# Roll back a Helm release to previous revision
# Usage: ./scripts/rollback.sh <service> [revision]
set -euo pipefail
SERVICE=${1:?Usage: rollback.sh <service> [revision]}
REVISION=${2:-0}    # 0 = previous
NAMESPACE=${NAMESPACE:-promptflow}

echo "Rolling back $SERVICE to revision ${REVISION:-previous}..."
helm rollback "$SERVICE" $REVISION -n "$NAMESPACE" --wait
echo "Rollback complete. Current status:"
helm status "$SERVICE" -n "$NAMESPACE"
kubectl get pods -n "$NAMESPACE" -l "app=$SERVICE"
