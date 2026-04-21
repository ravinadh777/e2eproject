{{/* helm/ai-gateway-service/templates/_helpers.tpl */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "ai-gateway-service.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "ai-gateway-service.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart label
*/}}
{{- define "ai-gateway-service.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "ai-gateway-service.labels" -}}
helm.sh/chart: {{ include "ai-gateway-service.chart" . }}
{{ include "ai-gateway-service.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/component: microservice
app.kubernetes.io/part-of: promptflow
{{- end }}

{{/*
Selector labels
*/}}
{{- define "ai-gateway-service.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ai-gateway-service.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app: ai-gateway-service
{{- end }}

{{/*
ServiceAccount name
*/}}
{{- define "ai-gateway-service.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "ai-gateway-service.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
