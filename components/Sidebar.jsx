'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    section: 'GENERAL',
    links: [
      { label: 'Dashboard', href: '/dashboard', icon: '▦' },
      { label: 'Upload CSV', href: '/upload', icon: '↑' }
    ]
  },
  {
    section: 'ANALYSIS',
    links: [
      { label: 'Forecast', href: '/forecast', icon: '📈' },
      { label: 'Simulate', href: '/simulate', icon: '⚡' }
    ]
  },
  {
    section: 'PERSONAL',
    links: [{ label: 'Settings', href: '/settings', icon: '⚙' }]
  }
]

export default function Sidebar () {
  const pathname = usePathname()

  return (
    <div className='w-56 h-screen bg-bg-secondary border-r border-border flex flex-col'>
      {/* Logo */}
      <div className='p-6 border-b border-border'>
        <h1 className='text-text-primary font-bold text-lg tracking-wide'>
          💰 FINGUARD
        </h1>
      </div>

      {/* Nav links */}
      <nav className='flex-1 p-4 space-y-6 overflow-y-auto'>
        {navItems.map(section => (
          <div key={section.section}>
            <p className='text-text-secondary text-xs font-medium mb-2 tracking-widest'>
              {section.section}
            </p>
            <ul className='space-y-1'>
              {section.links.map(link => {
                const isActive = pathname === link.href
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                        ${
                          isActive
                            ? 'bg-accent text-white'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
                        }`}
                    >
                      <span className='text-base'>{link.icon}</span>
                      {link.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Logout at bottom */}
      <div className='p-4 border-t border-border'>
        <button
          className='flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-danger hover:bg-bg-card w-full transition-colors'
          onClick={() => {
            /* handle logout */
          }}
        >
          <span>→</span>
          Log out
        </button>
      </div>
    </div>
  )
}