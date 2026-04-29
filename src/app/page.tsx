import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-bg-primary flex flex-col items-center justify-center relative overflow-hidden">
      {/* Fondo con gradiente animado */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-accent-indigo opacity-10 blur-3xl animate-pulse-slow" />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-accent-sky opacity-10 blur-3xl animate-pulse-slow"
          style={{ animationDelay: '1.5s' }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent-indigo opacity-5 blur-3xl" />
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center max-w-2xl">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent-indigo flex items-center justify-center shadow-elevated">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="4" y="6" width="20" height="3" rx="1.5" fill="white" />
              <rect x="4" y="12" width="14" height="3" rx="1.5" fill="white" fillOpacity="0.7" />
              <rect x="4" y="18" width="8" height="3" rx="1.5" fill="white" fillOpacity="0.4" />
              <circle cx="22" cy="19.5" r="4" fill="#10B981" />
              <path
                d="M20 19.5l1.5 1.5 3-3"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-3xl font-bold text-text-primary tracking-tight">TaskFlow</span>
        </div>

        {/* Tagline */}
        <div className="space-y-3">
          <h1 className="text-5xl font-bold text-text-primary leading-tight">
            Tareas colaborativas <span className="text-accent-indigo">sin limites</span>
          </h1>
          <p className="text-lg text-text-secondary max-w-md mx-auto leading-relaxed">
            Organiza proyectos, gestiona tareas y colabora con tu equipo — incluso sin conexión a
            internet.
          </p>
        </div>

        {/* Badges de features */}
        <div className="flex flex-wrap justify-center gap-2">
          {['Offline-first', 'Sincronización automática', 'Kanban', 'Instalable'].map((f) => (
            <span
              key={f}
              className="px-3 py-1 rounded-full text-xs font-medium bg-bg-elevated border border-border-subtle text-text-secondary"
            >
              {f}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <Link
            href="/register"
            className="flex-1 px-6 py-3 rounded-btn bg-accent-indigo text-white font-semibold text-sm text-center transition-all duration-150 hover:opacity-90 hover:scale-[1.02] shadow-card"
          >
            Comenzar gratis
          </Link>
          <Link
            href="/login"
            className="flex-1 px-6 py-3 rounded-btn border border-border-subtle text-text-primary font-semibold text-sm text-center transition-all duration-150 hover:bg-bg-elevated hover:border-border-active"
          >
            Iniciar sesión
          </Link>
        </div>

        {/* Indicador PWA */}
        <p className="text-xs text-text-secondary flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald inline-block" />
          Funciona sin internet · Instalable como app
        </p>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 text-xs text-text-secondary opacity-50">
        TaskFlow - Electiva III - 2026
      </footer>
    </main>
  )
}
