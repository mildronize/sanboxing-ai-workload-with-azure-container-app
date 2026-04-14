resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.project_name}-logs"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = {
    project = var.project_name
  }
}

resource "azurerm_container_app_environment" "main" {
  name                       = "${var.project_name}-env"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  tags = {
    project = var.project_name
  }
}

# -----------------------------------------------------------------
# Backend Container App
# -----------------------------------------------------------------

resource "azurerm_container_app" "backend" {
  name                         = "${var.project_name}-backend"
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = azurerm_resource_group.main.name
  revision_mode                = "Single"

  identity {
    type = "SystemAssigned"
  }

  template {
    container {
      name   = "backend"
      image  = var.backend_image
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "USE_MOCK_WORKERS"
        value = "false"
      }

      env {
        name  = "AZURE_SUBSCRIPTION_ID"
        value = data.azurerm_client_config.current.subscription_id
      }

      env {
        name  = "AZURE_RESOURCE_GROUP"
        value = azurerm_resource_group.main.name
      }

      env {
        name  = "CAJ_NAME"
        value = azurerm_container_app_job.worker.name
      }

      env {
        name  = "SESSION_POOL_ENDPOINT"
        value = "https://${var.location}.dynamicsessions.io/subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/${azurerm_resource_group.main.name}/sessionPools/${var.project_name}-session-pool"
      }

      # Self-referencing FQDN: known after first apply.
      # Override via BACKEND_CALLBACK_URL variable or use the output after initial deploy.
      env {
        name  = "BACKEND_CALLBACK_URL"
        value = var.backend_callback_url != "" ? var.backend_callback_url : "https://${var.project_name}-backend.${azurerm_container_app_environment.main.default_domain}"
      }

      env {
        name        = "OPENAI_API_KEY"
        secret_name = "openai-api-key"
      }
    }

    min_replicas = 1
    max_replicas = 3
  }

  secret {
    name  = "openai-api-key"
    value = var.openai_api_key
  }

  ingress {
    external_enabled = true
    target_port      = 3001

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  tags = {
    project = var.project_name
  }
}

data "azurerm_client_config" "current" {}

# -----------------------------------------------------------------
# CAJ Worker Job
# -----------------------------------------------------------------

resource "azurerm_container_app_job" "worker" {
  name                         = "${var.project_name}-worker-job"
  location                     = azurerm_resource_group.main.location
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = azurerm_container_app_environment.main.id

  replica_timeout_in_seconds = 300
  replica_retry_limit        = 1

  manual_trigger_config {
    parallelism              = 1
    replica_completion_count = 1
  }

  template {
    container {
      name   = "worker"
      image  = var.worker_image
      cpu    = 1.0
      memory = "2Gi"

      env {
        name  = "MODE"
        value = "job"
      }

      env {
        name        = "OPENAI_API_KEY"
        secret_name = "openai-api-key"
      }

      # MESSAGE and CALLBACK_URL are injected at trigger time — not defined here.
    }
  }

  secret {
    name  = "openai-api-key"
    value = var.openai_api_key
  }

  tags = {
    project = var.project_name
  }
}
