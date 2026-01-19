import React from "react"
import type { Metadata } from 'next'
import { Space_Grotesk, Instrument_Sans, Inter, Roboto_Flex, Instrument_Serif } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: '--font-space-grotesk'
})

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: '--font-instrument-sans'
})

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: '--font-instrument-serif',
  style: 'normal',
})

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter'
})

const robotoFlex = Roboto_Flex({
  subsets: ["latin"],
  variable: '--font-roboto-flex'
})

export const metadata: Metadata = {
  title: 'Order Now - Voice-First Restaurant Ordering',
  description: 'AI-powered voice ordering system using ElevenLabs Scribe v2',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${instrumentSans.variable} ${instrumentSerif.variable} ${inter.variable} ${robotoFlex.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
