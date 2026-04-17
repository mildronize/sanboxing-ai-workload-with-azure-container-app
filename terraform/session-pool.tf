# PythonLTS Session Pool
# Managed by Microsoft — no custom image, no Dockerfile, no registry required.
# azurerm does not yet expose Microsoft.App/sessionPools; use azapi_resource instead.

locals {
  session_pool_name = replace("${var.project_name}sessionpool", "-", "")
}

resource "azapi_resource" "session_pool" {
  type      = "Microsoft.App/sessionPools@2024-02-02-preview"
  name      = local.session_pool_name
  location  = azurerm_resource_group.main.location
  parent_id = azurerm_resource_group.main.id

  body = jsonencode({
    properties = {
      poolManagementType = "Dynamic"
      containerType      = "PythonLTS"
      environmentId      = azurerm_container_app_environment.main.id

      scaleConfiguration = {
        maxConcurrentSessions = 10
        readySessionInstances = 2
      }

      dynamicPoolConfiguration = {
        cooldownPeriodInSeconds = 300
      }
    }
  })

  tags = {
    project = var.project_name
  }
}
