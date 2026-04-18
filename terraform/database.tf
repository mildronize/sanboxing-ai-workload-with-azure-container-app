# -----------------------------------------------------------------
# Azure Database for PostgreSQL Flexible Server
# -----------------------------------------------------------------

locals {
  db_server_name = "${var.project_name}-pg"
  db_name        = "sandbox"
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                   = local.db_server_name
  resource_group_name    = azurerm_resource_group.main.name
  location               = azurerm_resource_group.main.location
  version                = "16"
  administrator_login    = var.db_admin_username
  administrator_password = var.db_admin_password

  storage_mb   = 32768
  storage_tier = "P4"

  sku_name = "B_Standard_B1ms"

  public_network_access_enabled = true

  tags = {
    project = var.project_name
  }
}

resource "azurerm_postgresql_flexible_server_database" "app" {
  name      = local.db_name
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}
