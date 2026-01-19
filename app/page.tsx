'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getRestaurant, saveRestaurant, generateId } from '@/lib/store'
import type { Restaurant } from '@/lib/types'

export default function HomePage() {
  const router = useRouter()
  const [restaurantName, setRestaurantName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    const existing = getRestaurant()
    if (existing) {
      router.push('/dashboard')
    } else {
      setIsLoading(false)
    }
  }, [router])

  const handleCreateRestaurant = () => {
    if (!restaurantName.trim()) return

    const restaurant: Restaurant = {
      id: generateId(),
      name: restaurantName.trim(),
      createdAt: new Date().toISOString(),
      menuItems: [],
      roomId: generateId()
    }

    saveRestaurant(restaurant)
    router.push('/dashboard')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background overflow-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-foreground/[0.02] to-transparent blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-foreground/[0.03] to-transparent blur-3xl" />
      </div>

      <div className="relative min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-6 lg:px-12 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 lg:px-12 pb-12">
          {/* Hero Content */}
          <div className="max-w-3xl w-full text-center space-y-12">

            {/* Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-instrument-serif text-white leading-tight tracking-tight">
              Voice-first restaurant ordering.<br />
              <span className="opacity-90">Powered by AI. Just speak to order.</span>
            </h1>

            {/* Input Group */}
            <div className="max-w-md mx-auto">
              <div className={`relative transition-all duration-300 ${isFocused ? 'scale-[1.02]' : ''}`}>
                <input
                  type="text"
                  placeholder="Enter your restaurant name"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateRestaurant()}
                  className="w-full h-16 pl-6 pr-40 rounded-full bg-card border-2 border-border text-foreground font-space text-lg placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30 transition-all shadow-lg shadow-foreground/5"
                />
                <button
                  onClick={handleCreateRestaurant}
                  disabled={!restaurantName.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-12 px-6 rounded-full bg-foreground text-white font-semibold font-space text-base hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  Get Started
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </main>
  )
}
