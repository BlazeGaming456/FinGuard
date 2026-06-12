import Link from 'next/link'

export default function Logo ({ size = 'md', href, className = '' }) {
  const sizes = {
    sm: { box: 'w-6 h-6 text-[11px] rounded-md', text: 'text-sm' },
    md: { box: 'w-7 h-7 text-[13px] rounded-lg', text: 'text-base' },
    lg: { box: 'w-8 h-8 text-sm rounded-lg', text: 'text-lg' }
  }
  const s = sizes[size] || sizes.md

  const content = (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`${s.box} bg-gradient-to-br from-accent to-violet-500 flex items-center justify-center font-bold text-white shrink-0`}
      >
        F
      </div>
      <span className={`${s.text} font-semibold tracking-tight text-text-primary`}>
        FinGuard
      </span>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className='no-underline hover:opacity-90 transition-opacity'>
        {content}
      </Link>
    )
  }

  return content
}
