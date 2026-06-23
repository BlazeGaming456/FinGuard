'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import Logo from '@/components/Logo'

const navItems = [
  {
    section: 'General',
    links: [
      { label: 'Upload data', href: '/upload', icon: '↑' },
      { label: 'Dashboard', href: '/dashboard', icon: '▦' }
    ]
  },
  {
    section: 'Analysis',
    links: [
      { label: 'Forecast', href: '/forecast', icon: '◈' },
      { label: 'Simulate', href: '/simulate', icon: '◎' }
    ]
  },
  {
    section: 'Account',
    links: [{ label: 'Settings', href: '/settings', icon: '⚙' }]
  }
]

export default function Sidebar () {
  const pathname = usePathname()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  return (
    <>
      <button 
        className="lg:hidden fixed top-5 right-5 z-50 p-2.5 rounded-xl bg-bg-secondary/80 backdrop-blur-md border border-border text-text-primary shadow-lg hover:bg-white/[0.05] transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
          )}
        </svg>
      </button>

      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 z-30 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`w-60 h-screen glass-sidebar flex flex-col shrink-0 absolute lg:relative z-40 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className='p-5 border-b border-border'>
          <Logo size='md' href='/dashboard' />
        </div>

        <nav className='flex-1 p-4 space-y-6 overflow-y-auto'>
          {navItems.map(section => (
            <div key={section.section}>
              <p className='text-text-secondary text-[10px] font-semibold mb-2 tracking-[0.14em] uppercase px-3'>
                {section.section}
              </p>
              <ul className='space-y-0.5'>
                {section.links.map(link => {
                  const isActive = pathname === link.href
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                          ${
                            isActive
                              ? 'bg-accent/15 text-accent-light border border-accent/25 shadow-[0_0_20px_rgba(99,102,241,0.12)]'
                              : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03] border border-transparent'
                          }`}
                      >
                        <span
                          className={`text-base ${
                            isActive ? 'text-accent-light' : ''
                          }`}
                        >
                          {link.icon}
                        </span>
                        {link.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className='p-4 border-t border-border'>
          <button
            className='flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-danger hover:bg-danger/5 w-full border border-transparent hover:border-danger/20 cursor-pointer disabled:opacity-50'
            disabled={isLoggingOut}
            onClick={() => {
              setIsLoggingOut(true)
              signOut({ callbackUrl: '/' })
            }}
          >
            <span>→</span>
            {isLoggingOut ? 'Logging out...' : 'Log out'}
          </button>
        </div>
      </aside>
    </>
  )
}
