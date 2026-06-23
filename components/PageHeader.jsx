export default function PageHeader ({ title, subtitle, badge, children }) {
  return (
    <div className='stagger-item flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-2'>
      <div className="pr-12 lg:pr-0">
        {badge && (
          <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent-light text-[11px] uppercase tracking-widest mb-3'>
            <span className='w-1.5 h-1.5 rounded-full bg-accent animate-pulse' />
            {badge}
          </div>
        )}
        <h1 className='text-2xl sm:text-3xl font-bold tracking-tight text-text-primary'>
          {title}
        </h1>
        {subtitle && (
          <p className='text-text-secondary text-sm mt-1.5 leading-relaxed max-w-xl'>
            {subtitle}
          </p>
        )}
      </div>
      {children && <div className='flex items-center gap-3 shrink-0'>{children}</div>}
    </div>
  )
}
