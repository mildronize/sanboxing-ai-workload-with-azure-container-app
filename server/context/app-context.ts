import type { ILogger } from '#server/infrastructure/logging/index.ts'
import { createLogger } from '#server/infrastructure/logging/index.ts'
import { prisma } from '#server/lib/prisma.ts'
import { PrismaTodoRepository } from '#server/modules/todo/todo.repository.ts'
import { TodoService } from '#server/modules/todo/todo.service.ts'
import { PrismaChatRepository } from '#server/modules/chat/chat.repository.ts'
import { ChatService } from '#server/modules/chat/chat.service.ts'

export interface AppConfig {
  environment: string
}

export interface AppContext {
  logger: ILogger
  config: AppConfig
}

export interface ServiceContainer {
  appContext: AppContext
  todoService: TodoService
  chatService: ChatService
}

export function createContainer(): ServiceContainer {
  const environment = process.env['NODE_ENV'] ?? 'development'
  const logger = createLogger({ environment })
  const config: AppConfig = { environment }
  const appContext: AppContext = { logger, config }

  const todoRepo = new PrismaTodoRepository(appContext, prisma)
  const todoService = new TodoService(appContext, todoRepo)

  const chatRepo = new PrismaChatRepository(appContext, prisma)
  const chatService = new ChatService(appContext, chatRepo)

  return { appContext, todoService, chatService }
}
