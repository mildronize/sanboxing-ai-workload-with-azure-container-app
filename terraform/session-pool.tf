# Custom Container Session Pool
# azurerm does not yet expose Microsoft.App/sessionPools; use azapi_resource instead.

resource "azapi_resource" "session_pool" {
  type      = "Microsoft.App/sessionPools@2024-02-02-preview"
  name      = replace("${var.project_name}sessionpool", "-", "")
  location  = azurerm_resource_group.main.location
  parent_id = azurerm_resource_group.main.id

  body = jsonencode({
    properties = {
      poolManagementType = "Dynamic"
      containerType      = "CustomContainer"
      environmentId      = azurerm_container_app_environment.main.id

      customContainerTemplate = {
        containers = [
          {
            name  = "worker"
            image = var.worker_image
            env = [
              {
                name  = "MODE"
                value = "session"
              },
              {
                name  = "AZURE_OPENAI_ENDPOINT"
                value = var.azure_openai_endpoint
              },
              {
                name  = "AZURE_OPENAI_API_KEY"
                value = var.azure_openai_api_key
              },
              {
                name  = "AZURE_OPENAI_DEPLOYMENT_NAME"
                value = var.azure_openai_deployment_name
              }
            ]
            resources = {
              cpu    = 1.0
              memory = "2Gi"
            }
          }
        ]
        ingress = {
          targetPort = 8080
        }
      }

      scaleConfiguration = {
        maxConcurrentSessions = 10
        readySessionInstances = 2
      }

      sessionNetworkConfiguration = {
        # EgressEnabled allows worker sessions to reach the OpenAI API.
        status = "EgressEnabled"
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
