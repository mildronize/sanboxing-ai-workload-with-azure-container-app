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

variable "openai_api_key" {
  description = "OpenAI API key passed to backend and worker containers."
  type        = string
  sensitive   = true
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
