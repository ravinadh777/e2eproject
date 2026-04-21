{{/* helm/billing-service/templates/_helpers.tpl */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "billing-service.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "billing-service.fullname" -}}
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
{{- define "billing-service.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "billing-service.labels" -}}
helm.sh/chart: {{ include "billing-service.chart" . }}
{{ include "billing-service.selectorLabels" . }}
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
{{- define "billing-service.selectorLabels" -}}
app.kubernetes.io/name: {{ include "billing-service.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app: billing-service
{{- end }}

{{/*
ServiceAccount name
*/}}
{{- define "billing-service.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "billing-service.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
