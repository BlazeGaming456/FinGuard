import { DM_Sans } from 'next/font/google'
import './globals.css'
import { SessionProvider } from 'next-auth/react'
import NextTopLoader from 'nextjs-toploader'

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700']
})

export const metadata = {
  title: 'FinGuard | Your Financial Buddy',
  description: 'AI-powered personal finance intelligence and forecasting.',
  icons: {
    icon: '/icon.png',
  },
}

export default function RootLayout ({ children }) {
  return (
    <html lang='en'>
      <body className={`${dmSans.variable} antialiased`}>
        <NextTopLoader color="#6366f1" showSpinner={false} />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
