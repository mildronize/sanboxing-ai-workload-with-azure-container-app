import { useState } from "react"
import { ClipboardListIcon, RefreshCwIcon } from "lucide-react"
import { Button } from "#/components/ui/button"
import { Badge } from "#/components/ui/badge"
import { AddTodoForm } from "./AddTodoForm"
import { TodoItem } from "./TodoItem"
import { useGetTodos, type Todo } from "../hooks/useTodos"

type FilterType = "all" | "pending" | "completed"

export function TodoList() {
  const [filter, setFilter] = useState<FilterType>("all")
  const { data: todos = [] as Todo[], isLoading, error, refetch } = useGetTodos()

  const filteredTodos = todos.filter((todo) => {
    switch (filter) {
      case "pending":
        return !todo.completed
      case "completed":
        return todo.completed
      default:
        return true
    }
  })

  const pendingCount = todos.filter((t) => !t.completed).length
  const completedCount = todos.filter((t) => t.completed).length

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-[var(--sea-ink-soft)]">
        <RefreshCwIcon className="size-6 animate-spin" />
        <p className="text-sm">Loading your todos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
        <p className="text-sm text-red-600 dark:text-red-400">
          {error instanceof Error ? error.message : "Failed to load todos"}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => void refetch()}
        >
          <RefreshCwIcon className="size-3.5" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--sea-ink)]">My Todos</h2>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            Stay organized and get things done
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          disabled={isLoading}
        >
          <RefreshCwIcon className="size-3.5" />
          Refresh
        </Button>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--sea-ink)]">
          Total: {todos.length}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-400">
          Pending: {pendingCount}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-400">
          Completed: {completedCount}
        </span>
      </div>

      {/* Add todo form */}
      <AddTodoForm />

      {/* Filter tabs */}
      {todos.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--sea-ink)]">
              Your Tasks{" "}
              <Badge variant="secondary" className="ml-1">
                {filteredTodos.length}
              </Badge>
            </h3>
          </div>

          <div className="flex gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1">
            {(
              [
                { value: "all", label: "All", count: todos.length },
                { value: "pending", label: "Pending", count: pendingCount },
                { value: "completed", label: "Completed", count: completedCount },
              ] as const
            ).map(({ value, label, count }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  filter === value
                    ? "bg-[var(--surface-strong)] text-[var(--sea-ink)] shadow-sm"
                    : "text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
                }`}
              >
                {label}
                <span
                  className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                    filter === value
                      ? "bg-[var(--lagoon)] text-white"
                      : "bg-[var(--line)] text-[var(--sea-ink-soft)]"
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Todo items */}
      {filteredTodos.length > 0 ? (
        <div className="flex flex-col gap-2">
          {filteredTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
            />
          ))}
        </div>
      ) : todos.length === 0 ? (
        <div className="island-shell flex flex-col items-center gap-2 rounded-xl px-4 py-10 text-center">
          <ClipboardListIcon className="size-10 text-[var(--sea-ink-soft)]/40" />
          <h4 className="text-sm font-medium text-[var(--sea-ink-soft)]">
            No todos yet
          </h4>
          <p className="text-xs text-[var(--sea-ink-soft)]/70">
            Create your first todo to get started!
          </p>
        </div>
      ) : (
        <div className="island-shell flex flex-col items-center gap-2 rounded-xl px-4 py-10 text-center">
          <ClipboardListIcon className="size-10 text-[var(--sea-ink-soft)]/40" />
          <h4 className="text-sm font-medium text-[var(--sea-ink-soft)]">
            No {filter} todos
          </h4>
          <p className="text-xs text-[var(--sea-ink-soft)]/70">
            {filter === "pending"
              ? "Great job! You've completed all your tasks."
              : "No completed todos yet. Keep working!"}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-1"
            onClick={() => setFilter("all")}
          >
            View all todos
          </Button>
        </div>
      )}
    </div>
  )
}
