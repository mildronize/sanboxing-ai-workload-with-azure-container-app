variable "location" {
  description = "Azure region for all resources."
  type        = string
  default     = "southeastasia"
}

variable "resource_group_name" {
  description = "Name of the Azure resource group."
  type        = string
  default     = "rg-sandbox-ai-demo"
}

variable "project_name" {
  description = "Prefix used for naming all resources."
  type        = string
  default     = "sandbox-ai-demo"
}

variable "azure_openai_endpoint" {
  description = "Azure OpenAI endpoint (e.g. https://your-resource.openai.azure.com)."
  type        = string
}

variable "azure_openai_api_key" {
  description = "Azure OpenAI API key."
  type        = string
  sensitive   = true
}

variable "azure_openai_deployment_name" {
  description = "Azure OpenAI deployment name."
  type        = string
}

variable "backend_image" {
  description = "Full image reference for the backend container (e.g. ghcr.io/org/backend:sha)."
  type        = string
}

variable "worker_image" {
  description = "Full image reference for the worker container (e.g. ghcr.io/org/worker:sha)."
  type        = string
}

variable "backend_callback_url" {
  description = "Override for the backend's public callback URL. Leave empty to derive from the Container App FQDN (requires a second apply after first deploy)."
  type        = string
  default     = ""
}
