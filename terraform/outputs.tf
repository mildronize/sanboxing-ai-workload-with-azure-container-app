output "backend_url" {
  description = "Public FQDN of the backend Container App."
  value       = "https://${azurerm_container_app.backend.latest_revision_fqdn}"
}

output "session_pool_endpoint" {
  description = "Session pool management endpoint used by the backend."
  value       = "https://${var.location}.dynamicsessions.io/subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/${azurerm_resource_group.main.name}/sessionPools/${local.session_pool_name}"
}

output "resource_group_name" {
  description = "Name of the resource group containing all resources."
  value       = azurerm_resource_group.main.name
}

output "container_app_environment_id" {
  description = "Resource ID of the Container App Environment."
  value       = azurerm_container_app_environment.main.id
}

output "database_host" {
  description = "FQDN of the PostgreSQL Flexible Server."
  value       = azurerm_postgresql_flexible_server.main.fqdn
}
