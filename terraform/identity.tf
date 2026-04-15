# -----------------------------------------------------------------
# Role: Azure ContainerApps Session Executor
# Grants the backend's managed identity permission to execute sessions
# on the custom container session pool.
# -----------------------------------------------------------------

resource "azurerm_role_assignment" "backend_session_executor" {
  scope                = azapi_resource.session_pool.id
  role_definition_name = "Azure ContainerApps Session Executor"
  principal_id         = azurerm_container_app.backend.identity[0].principal_id
}
