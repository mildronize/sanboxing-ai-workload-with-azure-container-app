import { useState, useCallback } from "react"
import { MoreHorizontalIcon, PencilIcon, TrashIcon, CheckIcon, XIcon } from "lucide-react"
import { Checkbox } from "#/components/ui/checkbox"
import { Button } from "#/components/ui/button"
import { Input } from "#/components/ui/input"
import { Textarea } from "#/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog"
import { useUpdateTodo, useDeleteTodo, type Todo } from "../hooks/useTodos"

interface TodoItemProps {
  todo: Todo
}

export function TodoItem({ todo }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editTitle, setEditTitle] = useState(todo.title)
  const [editDescription, setEditDescription] = useState(todo.description ?? "")
  const [error, setError] = useState<string | null>(null)

  const updateTodo = useUpdateTodo()
  const deleteTodo = useDeleteTodo()

  const handleToggle = useCallback(async () => {
    try {
      await updateTodo.mutateAsync({ id: todo.id, completed: !todo.completed })
    } catch {
      // silently fail — could add a toast here
    }
  }, [todo.id, todo.completed, updateTodo])

  const handleEditOpen = useCallback(() => {
    setEditTitle(todo.title)
    setEditDescription(todo.description ?? "")
    setError(null)
    setIsEditing(true)
  }, [todo.title, todo.description])

  const handleEditCancel = useCallback(() => {
    setIsEditing(false)
    setError(null)
  }, [])

  const handleEditSave = useCallback(async () => {
    if (!editTitle.trim()) {
      setError("Title is required")
      return
    }
    setError(null)
    try {
      await updateTodo.mutateAsync({
        id: todo.id,
        title: editTitle.trim(),
        description: editDescription.trim() || null,
      })
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update todo")
    }
  }, [todo.id, editTitle, editDescription, updateTodo])

  const handleDelete = useCallback(async () => {
    try {
      await deleteTodo.mutateAsync(todo.id)
      setIsDeleteDialogOpen(false)
    } catch {
      // silently fail
    }
  }, [todo.id, deleteTodo])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        handleEditCancel()
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        void handleEditSave()
      }
    },
    [handleEditCancel, handleEditSave]
  )

  if (isEditing) {
    return (
      <div className="island-shell flex flex-col gap-3 rounded-xl px-4 py-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`edit-title-${todo.id}`}
            className="text-xs font-medium text-[var(--sea-ink-soft)]"
          >
            Title <span className="text-red-500">*</span>
          </label>
          <Input
            id={`edit-title-${todo.id}`}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            aria-invalid={error !== null}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`edit-desc-${todo.id}`}
            className="text-xs font-medium text-[var(--sea-ink-soft)]"
          >
            Description
          </label>
          <Textarea
            id={`edit-desc-${todo.id}`}
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEditCancel}
            disabled={updateTodo.isPending}
          >
            <XIcon className="size-3.5" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => void handleEditSave()}
            disabled={updateTodo.isPending}
          >
            <CheckIcon className="size-3.5" />
            {updateTodo.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="island-shell flex items-start gap-3 rounded-xl px-4 py-3 transition hover:shadow-md">
        <Checkbox
          checked={todo.completed}
          onCheckedChange={() => void handleToggle()}
          disabled={updateTodo.isPending}
          className="mt-0.5 shrink-0"
          id={`todo-check-${todo.id}`}
        />

        <div className="min-w-0 flex-1">
          <label
            htmlFor={`todo-check-${todo.id}`}
            className={`block cursor-pointer text-sm font-medium leading-snug ${
              todo.completed
                ? "text-[var(--sea-ink-soft)] line-through"
                : "text-[var(--sea-ink)]"
            }`}
          >
            {todo.title}
          </label>
          {todo.description && (
            <p
              className={`mt-0.5 text-xs leading-relaxed ${
                todo.completed
                  ? "text-[var(--sea-ink-soft)]/60 line-through"
                  : "text-[var(--sea-ink-soft)]"
              }`}
            >
              {todo.description}
            </p>
          )}
          <p className="mt-1 text-xs text-[var(--sea-ink-soft)]/50">
            {new Date(todo.createdAt).toLocaleDateString()}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-[var(--sea-ink-soft)]"
              aria-label="Todo options"
            >
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEditOpen}>
              <PencilIcon className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <TrashIcon className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Todo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            Are you sure you want to delete{" "}
            <span className="font-medium text-[var(--sea-ink)]">
              "{todo.title}"
            </span>
            ? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteTodo.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleteTodo.isPending}
            >
              {deleteTodo.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
