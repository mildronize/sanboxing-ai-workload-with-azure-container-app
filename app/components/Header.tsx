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
          to="/chat"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--sea-ink)] no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:px-4 sm:py-2"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <path d="M8 10h.01" />
            <path d="M12 10h.01" />
            <path d="M16 10h.01" />
          </svg>
          AI Sandbox
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
                    className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--sea-ink)] no-underline transition hover:bg-[var(--surface)]"
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
