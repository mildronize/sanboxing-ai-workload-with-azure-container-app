import type { PrismaClient, Todo } from "#generated/client/client.ts";
import type { AppContext } from "#server/context/app-context.ts";
import type { ILogger } from "#server/infrastructure/logging/index.ts";

export type { Todo };

export type CreateTodoData = Pick<Todo, 'title'> & Partial<Pick<Todo, 'description'>>;
export type UpdateTodoData = Partial<Pick<Todo, 'title' | 'description' | 'completed'>>;

// Contract — service depends on this, not the concrete class
export interface ITodoRepository {
  findAll(): Promise<Todo[]>;
  findById(id: string): Promise<Todo | null>;
  findByUserId(userId: string): Promise<Todo[]>;
  create(userId: string, data: CreateTodoData): Promise<Todo>;
  update(id: string, data: UpdateTodoData): Promise<Todo | null>;
  delete(id: string): Promise<boolean>;
}

// Prisma implementation
export class PrismaTodoRepository implements ITodoRepository {
  private logger: ILogger

  constructor(
    appContext: AppContext,
    private prisma: PrismaClient,
  ) {
    this.logger = appContext.logger
  }

  findAll(): Promise<Todo[]> {
    this.logger.debug("PrismaTodoRepository.findAll");
    return this.prisma.todo.findMany();
  }

  findById(id: string): Promise<Todo | null> {
    this.logger.debug("PrismaTodoRepository.findById", { id });
    return this.prisma.todo.findUnique({ where: { id } });
  }

  findByUserId(userId: string): Promise<Todo[]> {
    this.logger.debug("PrismaTodoRepository.findByUserId", { userId });
    return this.prisma.todo.findMany({ where: { userId } });
  }

  create(userId: string, data: CreateTodoData): Promise<Todo> {
    this.logger.info("PrismaTodoRepository.create", { userId, title: data.title });
    return this.prisma.todo.create({
      data: {
        title: data.title,
        description: data.description,
        userId,
      },
    });
  }

  async update(id: string, data: UpdateTodoData): Promise<Todo | null> {
    this.logger.info("PrismaTodoRepository.update", { id });
    try {
      return await this.prisma.todo.update({ where: { id }, data });
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    this.logger.info("PrismaTodoRepository.delete", { id });
    try {
      await this.prisma.todo.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
}
