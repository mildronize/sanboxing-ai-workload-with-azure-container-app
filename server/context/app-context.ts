import type { ILogger } from '#server/infrastructure/logging/index.ts'
import { createLogger } from '#server/infrastructure/logging/index.ts'
import { prisma } from '#server/lib/prisma.ts'
import { PrismaChatRepository } from '#server/modules/chat/chat.repository.ts'
import { ChatService } from '#server/modules/chat/chat.service.ts'

export interface AppConfig {
  environment: string
  useMockWorkers: boolean
  azure: {
    subscriptionId: string
    resourceGroup: string
    cajName: string
    cajWorkerImage: string
    sessionPoolEndpoint: string
    backendCallbackUrl: string
    azureOpenaiEndpoint: string
    azureOpenaiApiKey: string
    azureOpenaiDeploymentName: string
  }
}

export interface AppContext {
  logger: ILogger
  config: AppConfig
}

export interface ServiceContainer {
  appContext: AppContext
  chatService: ChatService
}

export function createContainer(): ServiceContainer {
  const environment = process.env['NODE_ENV'] ?? 'development'
  const logger = createLogger({ environment })
  const useMockWorkers = process.env['USE_MOCK_WORKERS'] !== 'false'
  const config: AppConfig = {
    environment,
    useMockWorkers,
    azure: {
      subscriptionId: process.env['AZURE_SUBSCRIPTION_ID'] ?? '',
      resourceGroup: process.env['AZURE_RESOURCE_GROUP'] ?? '',
      cajName: process.env['CAJ_NAME'] ?? '',
      cajWorkerImage: process.env['CAJ_WORKER_IMAGE'] ?? '',
      sessionPoolEndpoint: process.env['SESSION_POOL_ENDPOINT'] ?? '',
      backendCallbackUrl: process.env['BACKEND_CALLBACK_URL'] ?? '',
      azureOpenaiEndpoint: process.env['AZURE_OPENAI_ENDPOINT'] ?? '',
      azureOpenaiApiKey: process.env['AZURE_OPENAI_API_KEY'] ?? '',
      azureOpenaiDeploymentName: process.env['AZURE_OPENAI_DEPLOYMENT_NAME'] ?? '',
    },
  }
  const appContext: AppContext = { logger, config }

  const chatRepo = new PrismaChatRepository(appContext, prisma)
  const chatService = new ChatService(appContext, chatRepo)

  return { appContext, chatService }
}
