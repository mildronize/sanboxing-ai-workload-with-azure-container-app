import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Treaty } from '@elysiajs/eden'
import { api } from '#/lib/eden'

// Derive Todo type from Eden's inferred return type — no manual interface needed
type GetTodosResponse = Treaty.Data<ReturnType<typeof api.api.todos.get>>
export type Todo = GetTodosResponse extends (infer T)[] ? T : never

export function useGetTodos() {
  return useQuery({
    queryKey: ['todos'],
    queryFn: async () => {
      const { data, error } = await api.api.todos.get()
      if (error) throw error
      return data
    },
  })
}

export function useCreateTodo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { title: string; description?: string }) => {
      const { data, error } = await api.api.todos.post(body)
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  })
}

export function useUpdateTodo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      id: string
      title?: string
      description?: string | null
      completed?: boolean
    }) => {
      const { id, description, ...rest } = params
      const body: { title?: string; description?: string; completed?: boolean } = { ...rest }
      if (description !== undefined) {
        body.description = description ?? undefined
      }
      const { data, error } = await api.api.todos({ id }).patch(body)
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  })
}

export function useDeleteTodo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.api.todos({ id }).delete()
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }),
  })
}
