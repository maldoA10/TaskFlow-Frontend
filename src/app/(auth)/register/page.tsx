'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, Loader2, Check, X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'Mínimo 8 caracteres', ok: password.length >= 8 },
    { label: 'Letras y números', ok: /[a-zA-Z]/.test(password) && /[0-9]/.test(password) },
  ]
  if (!password) return null
  return (
    <div className="mt-1.5 space-y-1">
      {checks.map((c) => (
        <div key={c.label} className="flex items-center gap-1.5 text-xs">
          {c.ok ? (
            <Check size={11} className="text-accent-emerald flex-shrink-0" />
          ) : (
            <X size={11} className="text-accent-rose flex-shrink-0" />
          )}
          <span className={c.ok ? 'text-accent-emerald' : 'text-text-secondary'}>{c.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const { register, isLoading, error, clearError } = useAuthStore()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError('')
    clearError()

    if (password !== confirm) {
      setLocalError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 8) {
      setLocalError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    try {
      await register(name, email, password)
      router.push('/boards')
    } catch {
      // error guardado en el store
    }
  }

  const displayError = localError || error

  return (
    <div className="w-full max-w-sm relative z-10">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-lg bg-accent-indigo flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="4" width="14" height="2.5" rx="1.25" fill="white" />
            <rect x="3" y="8.5" width="10" height="2.5" rx="1.25" fill="white" fillOpacity="0.7" />
            <rect x="3" y="13" width="6" height="2.5" rx="1.25" fill="white" fillOpacity="0.4" />
            <circle cx="15.5" cy="14" r="3" fill="#10B981" />
            <path
              d="M14 14l1 1 2-2"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="text-xl font-bold text-text-primary tracking-tight">TaskFlow</span>
      </div>

      {/* Card */}
      <div className="bg-bg-secondary border border-border-subtle rounded-modal p-8 shadow-card">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-text-primary">Crear cuenta</h1>
          <p className="text-sm text-text-secondary mt-1">Empieza gratis, sin tarjeta</p>
        </div>

        {displayError && (
          <div className="mb-4 px-3 py-2.5 rounded-btn bg-accent-rose/10 border border-accent-rose/20 text-sm text-accent-rose">
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Nombre completo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              placeholder="Juan García"
              className={cn(
                'w-full px-3.5 py-2.5 rounded-btn text-sm',
                'bg-bg-elevated border border-border-subtle',
                'text-text-primary placeholder:text-text-secondary',
                'focus:outline-none focus:border-border-active focus:ring-1 focus:ring-border-active/50',
                'transition-colors duration-150'
              )}
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="tu@email.com"
              className={cn(
                'w-full px-3.5 py-2.5 rounded-btn text-sm',
                'bg-bg-elevated border border-border-subtle',
                'text-text-primary placeholder:text-text-secondary',
                'focus:outline-none focus:border-border-active focus:ring-1 focus:ring-border-active/50',
                'transition-colors duration-150'
              )}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                className={cn(
                  'w-full px-3.5 py-2.5 pr-10 rounded-btn text-sm',
                  'bg-bg-elevated border border-border-subtle',
                  'text-text-primary placeholder:text-text-secondary',
                  'focus:outline-none focus:border-border-active focus:ring-1 focus:ring-border-active/50',
                  'transition-colors duration-150'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          {/* Confirmar password */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Confirmar contraseña
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Repite la contraseña"
              className={cn(
                'w-full px-3.5 py-2.5 rounded-btn text-sm',
                'bg-bg-elevated border border-border-subtle',
                confirm && confirm !== password
                  ? 'border-accent-rose/50 focus:border-accent-rose'
                  : 'focus:border-border-active',
                'text-text-primary placeholder:text-text-secondary',
                'focus:outline-none focus:ring-1 focus:ring-border-active/50',
                'transition-colors duration-150'
              )}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-btn',
              'bg-accent-indigo text-white text-sm font-semibold',
              'hover:opacity-90 transition-all duration-150',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus:outline-none focus:ring-2 focus:ring-accent-indigo/50'
            )}
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                Crear cuenta <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-text-secondary mt-5">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-accent-indigo hover:underline font-medium">
          Iniciar sesión
        </Link>
      </p>
    </div>
  )
}
