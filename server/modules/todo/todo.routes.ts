import { Elysia, t } from 'elysia'
import { authPlugin } from '#server/lib/auth-plugin'
import type { ServiceContainer } from '#server/context/app-context'
import { TodoPlain, TodoPlainInputCreate, TodoPlainInputUpdate } from '#generated/prismabox/Todo'

const CreateTodoBody = t.Pick(TodoPlainInputCreate, ['title', 'description'])
const UpdateTodoBody = TodoPlainInputUpdate

export function createTodoRoutes(container: ServiceContainer) {
  return new Elysia({ prefix: '/api/todos' })
    .use(authPlugin)
    .get('/', ({ user }) => container.todoService.getAll(user.id), {
      withAuth: true,
      response: t.Array(TodoPlain),
    })
    .get('/:id', ({ user, params: { id } }) => container.todoService.getById(id, user.id), {
      withAuth: true,
      params: t.Object({ id: t.String() }),
      response: TodoPlain,
    })
    .post('/', ({ user, body }) => container.todoService.create(user.id, body), {
      withAuth: true,
      body: CreateTodoBody,
      response: TodoPlain,
    })
    .patch('/:id', ({ user, params: { id }, body }) => container.todoService.update(id, user.id, body), {
      withAuth: true,
      params: t.Object({ id: t.String() }),
      body: UpdateTodoBody,
      response: TodoPlain,
    })
    .delete('/:id', async ({ user, params: { id } }) => {
      await container.todoService.delete(id, user.id)
      return { success: true }
    }, {
      withAuth: true,
      params: t.Object({ id: t.String() }),
    })
}
