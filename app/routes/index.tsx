import { createFileRoute, Link } from '@tanstack/react-router'
import { useSession } from '#/lib/auth-client'
import { TodoList } from '#/features/todo'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <main className="page-wrap px-4 pb-8 pt-14">
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--lagoon)] border-t-transparent" />
        </div>
      </main>
    )
  }

  if (session) {
    return (
      <main className="page-wrap px-4 pb-8 pt-14">
        <div className="island-shell rise-in mb-6 rounded-[2rem] px-6 py-6 sm:px-10">
          <p className="island-kicker mb-2">Welcome back</p>
          <h1 className="text-2xl font-bold text-[var(--sea-ink)]">
            {session.user.name}
          </h1>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            {session.user.email}
          </p>
        </div>
        <TodoList />
      </main>
    )
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
        <p className="island-kicker mb-3">TanStack + Elysia + Prisma</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          Your personal todo app.
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Sign up or log in to start managing your todos with a clean,
          distraction-free interface.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/signup"
            className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] no-underline transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
          >
            Get Started — Sign Up
          </Link>
          <Link
            to="/login"
            className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:-translate-y-0.5 hover:border-[rgba(23,58,64,0.35)]"
          >
            Sign In
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          [
            'Create & Organize',
            'Add todos with optional descriptions. Keep your tasks structured and clear.',
          ],
          [
            'Track Progress',
            'Toggle todos as complete, filter by status, and watch your productivity grow.',
          ],
          [
            'Secure & Private',
            'Your todos are tied to your account. Only you can see and manage them.',
          ],
        ].map(([title, desc], index) => (
          <article
            key={title}
            className="island-shell feature-card rise-in rounded-2xl p-5"
            style={{ animationDelay: `${index * 90 + 80}ms` }}
          >
            <h2 className="mb-2 text-base font-semibold text-[var(--sea-ink)]">
              {title}
            </h2>
            <p className="m-0 text-sm text-[var(--sea-ink-soft)]">{desc}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
