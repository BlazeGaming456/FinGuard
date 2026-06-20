import Link from 'next/link'
import Image from 'next/image'

export default function Logo ({ size = 'md', href, className = '' }) {
  const sizes = {
    sm: { box: 24, text: 'text-sm' },
    md: { box: 28, text: 'text-base' },
    lg: { box: 32, text: 'text-lg' }
  }
  const s = sizes[size] || sizes.md

  const content = (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image 
        src="/logo.png" 
        alt="FinGuard Logo" 
        width={s.box} 
        height={s.box} 
        className="shrink-0 object-contain"
      />
      <span className={`${s.text} font-bold tracking-tight bg-gradient-to-r from-accent to-pink-500 bg-clip-text text-transparent`}>
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
