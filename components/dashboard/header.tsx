'use client'

import { useState } from 'react'

interface DashboardHeaderProps {
  restaurantName: string
  restaurantId: string
  activeTab: 'menu' | 'orders'
  onTabChange: (tab: 'menu' | 'orders') => void
  roomId: string
}

export function DashboardHeader({ restaurantName, restaurantId, activeTab, onTabChange, roomId }: DashboardHeaderProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyLink = () => {
    const link = `${window.location.origin}/menu/${restaurantId}/${roomId}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const tabs = [
    { id: 'menu' as const, label: 'Menu Items' },
    { id: 'orders' as const, label: 'Orders' },
  ]

  return (
    <header className="bg-black/90 backdrop-blur-md sticky top-0 z-10 shadow-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Name */}
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-white/80 font-space">Good Morning</p>
              <h1 className="text-lg font-space font-bold text-white">{restaurantName}</h1>
            </div>
          </div>

          {/* Center Tabs - Pill Style */}
          <nav className="hidden md:flex items-center gap-1 bg-white/10 rounded-full p-1.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-6 py-2.5 rounded-full text-sm font-medium font-space transition-all ${activeTab === tab.id
                  ? 'bg-white text-black shadow-sm'
                  : 'text-white/70 hover:text-white'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* View Order Page Button */}
            <button
              onClick={() => window.open(`/menu/${restaurantId}/${roomId}`, '_blank')}
              className="flex items-center gap-2 h-12 px-5 rounded-full bg-white/10 text-white font-medium hover:bg-white/20 transition-colors border border-white/10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="text-sm font-space">View Order Page</span>
            </button>

            {/* Copy Link Button */}
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 h-12 px-5 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-space">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span className="text-sm font-space">Copy Order Page Link</span>
                </>
              )}
            </button>

            {/* Orders Bell with Badge */}
            <button
              onClick={() => onTabChange('orders')}
              className="relative w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* Order notification badge */}
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
                3
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Tabs */}
        <nav className="md:hidden flex items-center gap-1 bg-white/10 rounded-full p-1.5 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium font-space transition-all ${activeTab === tab.id
                ? 'bg-white text-[#1d7b37] shadow-sm'
                : 'text-white/70 hover:text-white'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
