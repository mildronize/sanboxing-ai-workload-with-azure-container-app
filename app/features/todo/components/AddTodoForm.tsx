import { useState, useCallback } from "react"
import { PlusIcon, XIcon } from "lucide-react"
import { Button } from "#/components/ui/button"
import { Input } from "#/components/ui/input"
import { Textarea } from "#/components/ui/textarea"
import { Card, CardContent } from "#/components/ui/card"
import { useCreateTodo } from "../hooks/useTodos"

export function AddTodoForm() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)

  const createTodo = useCreateTodo()

  const handleExpand = useCallback(() => {
    setIsExpanded(true)
  }, [])

  const handleCancel = useCallback(() => {
    setTitle("")
    setDescription("")
    setError(null)
    setIsExpanded(false)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError("Title is required")
      return
    }

    setError(null)

    try {
      await createTodo.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
      })
      setTitle("")
      setDescription("")
      setIsExpanded(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create todo")
    }
  }, [title, description, createTodo])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel()
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        void handleSubmit()
      }
    },
    [handleCancel, handleSubmit]
  )

  if (!isExpanded) {
    return (
      <button
        onClick={handleExpand}
        className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--sea-ink-soft)] transition hover:border-[var(--lagoon-deep)] hover:bg-[var(--surface-strong)] hover:text-[var(--sea-ink)]"
      >
        <PlusIcon className="size-4" />
        <span>Add a new todo...</span>
      </button>
    )
  }

  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--sea-ink)]">
            Add New Todo
          </h3>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="todo-title"
            className="text-xs font-medium text-[var(--sea-ink-soft)]"
          >
            Title <span className="text-red-500">*</span>
          </label>
          <Input
            id="todo-title"
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            aria-invalid={error !== null}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="todo-description"
            className="text-xs font-medium text-[var(--sea-ink-soft)]"
          >
            Description
          </label>
          <Textarea
            id="todo-description"
            placeholder="Optional description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
        </div>

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--sea-ink-soft)]">
            <kbd className="rounded border border-[var(--line)] px-1">⌘ Enter</kbd> to save,{" "}
            <kbd className="rounded border border-[var(--line)] px-1">Esc</kbd> to cancel
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={createTodo.isPending}
            >
              <XIcon className="size-3.5" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSubmit()}
              disabled={createTodo.isPending}
            >
              <PlusIcon className="size-3.5" />
              {createTodo.isPending ? "Adding..." : "Add Todo"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
