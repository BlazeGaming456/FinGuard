'use client'

import ParticleBackground from '@/components/ParticleBackground'
import Logo from '@/components/Logo'

const defaultAside = (
  <>
    <span className='inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-accent'>
      FinGuard
    </span>
    <div>
      <h2 className='text-3xl sm:text-4xl font-semibold tracking-tight text-white'>Stay on top of every transaction.</h2>
      <p className='mt-4 text-sm leading-6 text-text-secondary max-w-xl'>Upload your statements, monitor spending, and get instant financial clarity with smart insights built for modern budgets.</p>
    </div>
    <div className='grid gap-3 mt-8'>
      <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
        <p className='text-sm font-semibold text-white'>Automatic expense categorization</p>
        <p className='mt-2 text-sm text-text-secondary'>See where your money goes with clean, visual summaries.</p>
      </div>
      <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
        <p className='text-sm font-semibold text-white'>Forecast and simulate</p>
        <p className='mt-2 text-sm text-text-secondary'>Plan cash flow, budgets and future balance trends with confidence.</p>
      </div>
    </div>
  </>
)

export default function AuthLayout ({ children, aside }) {
  return (
    <div className='relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-10'>
      <ParticleBackground />
      <div className='relative z-10 w-full max-w-[1120px]'>
        <div className='grid gap-6 lg:grid-cols-[1.03fr_0.97fr] items-center'>
          <div className='glass-card relative overflow-hidden rounded-[2rem] border border-white/10 p-8 sm:p-12 min-h-[580px]'>
            <div className='absolute -right-16 top-8 h-40 w-40 rounded-full bg-accent/10 blur-3xl' />
            <div className='relative z-10 flex h-full flex-col justify-center gap-8'>
              {aside ?? defaultAside}
            </div>
          </div>

          <div className='glass-card rounded-[2rem] border border-white/10 p-8 sm:p-10 shadow-[0_30px_80px_rgba(0,0,0,0.2)]'>
            <div className='flex justify-center mb-8'>
              <Logo size='lg' href='/' />
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
