import { Link } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'
import { useSession, signOut } from '#/lib/auth-client'

export default function Header() {
  const { data: session, isPending } = useSession()

  async function handleSignOut() {
    await signOut()
    window.location.href = '/'
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav className="page-wrap flex items-center gap-3 py-3 sm:py-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--sea-ink)] no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:px-4 sm:py-2"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          Todo App
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {!isPending && (
            <>
              {session ? (
                <div className="flex items-center gap-3">
                  <span className="hidden text-sm text-[var(--sea-ink-soft)] sm:inline">
                    {session.user.name}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-3 py-1.5 text-xs font-semibold text-[var(--sea-ink)] transition hover:border-[rgba(23,58,64,0.35)] hover:bg-white/80"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-3 py-1.5 text-xs font-semibold text-[var(--sea-ink)] no-underline transition hover:border-[rgba(23,58,64,0.35)] hover:bg-white/80"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-3 py-1.5 text-xs font-semibold text-[var(--lagoon-deep)] no-underline transition hover:bg-[rgba(79,184,178,0.24)]"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
