import Sidebar from '@/components/Sidebar'
import ParticleBackground from '@/components/ParticleBackground'

export default function DashboardLayout ({ children }) {
  return (
    <div className='flex h-screen bg-bg-primary overflow-hidden relative'>
      <ParticleBackground />
      <Sidebar />
      <main className='flex-1 overflow-y-auto relative z-10'>
        <div className='p-6 lg:p-8 max-w-7xl mx-auto w-full'>
          {children}
        </div>
      </main>
    </div>
  )
}
