output "backend_url" {
  description = "Public FQDN of the backend Container App."
  value       = "https://${azurerm_container_app.backend.latest_revision_fqdn}"
}

output "session_pool_endpoint" {
  description = "Session pool management endpoint used by the backend."
  value       = "https://${var.location}.dynamicsessions.io/subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/${azurerm_resource_group.main.name}/sessionPools/${var.project_name}-session-pool"
}

output "acr_login_server" {
  description = "ACR login server (e.g. <name>.azurecr.io)."
  value       = azurerm_container_registry.main.login_server
}

output "resource_group_name" {
  description = "Name of the resource group containing all resources."
  value       = azurerm_resource_group.main.name
}

output "container_app_environment_id" {
  description = "Resource ID of the Container App Environment."
  value       = azurerm_container_app_environment.main.id
}
