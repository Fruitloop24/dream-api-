import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { DreamAPIProvider } from '@/lib/useDreamAPI'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'My SaaS',
  description: 'Build something amazing',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <DreamAPIProvider>
          {children}
        </DreamAPIProvider>
      </body>
    </html>
  )
}
