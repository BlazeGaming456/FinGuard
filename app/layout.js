import { DM_Sans } from 'next/font/google'
import './globals.css'
import { SessionProvider } from 'next-auth/react'

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700']
})

export const metadata = {
  title: 'FinGuard — Personal Finance Intelligence',
  description: 'Upload bank statements, get rule-based advisories, Prophet forecasts, and Monte Carlo risk simulations.'
}

export default function RootLayout ({ children }) {
  return (
    <html lang='en'>
      <body className={`${dmSans.variable} antialiased`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
