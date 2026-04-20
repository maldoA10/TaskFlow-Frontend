'use client'

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-bg-primary flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-bg-elevated border border-border-subtle flex items-center justify-center">
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M4 4l24 24" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M16 8C10.5 8 6 11 4 16"
            stroke="#8B8FA3"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.4"
          />
          <path
            d="M10 14C11.5 12.5 13.5 11.5 16 11.5"
            stroke="#8B8FA3"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.4"
          />
          <circle cx="16" cy="22" r="2" fill="#8B8FA3" />
        </svg>
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-text-primary">Sin conexión</h1>
        <p className="text-text-secondary max-w-xs">
          No hay conexión a internet. TaskFlow seguirá funcionando con tus datos locales.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="px-5 py-2.5 rounded-btn bg-accent-indigo text-white text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Reintentar conexión
      </button>
    </main>
  )
}
