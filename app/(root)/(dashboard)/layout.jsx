import Sidebar from '@/components/Sidebar'

export default function DashboardLayout ({ children }) {
  return (
    <div className='flex h-screen bg-bg-primary overflow-hidden'>
      <Sidebar />
      <main className='flex-1 overflow-y-auto p-6'>{children}</main>
    </div>
  )
}