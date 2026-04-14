terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
    azapi = {
      source  = "azure/azapi"
      version = "~> 1.13"
    }
  }
}

provider "azurerm" {
  features {}
}

provider "azapi" {}

resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    project = var.project_name
  }
}
