'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getRestaurant, getOrders, updateOrderStatus } from '@/lib/store'
import type { Restaurant, Order } from '@/lib/types'

const STATUS_CONFIG = {
  pending: {
    label: 'New',
    color: 'bg-amber-100 text-amber-700',
    next: 'preparing' as const,
    nextLabel: 'Start Preparing'
  },
  preparing: {
    label: 'Preparing',
    color: 'bg-blue-100 text-blue-700',
    next: 'ready' as const,
    nextLabel: 'Mark Ready'
  },
  ready: {
    label: 'Ready',
    color: 'bg-emerald-100 text-emerald-700',
    next: 'served' as const,
    nextLabel: 'Mark Served'
  },
  served: {
    label: 'Served',
    color: 'bg-muted text-muted-foreground',
    next: null,
    nextLabel: null
  }
}

export default function OrdersPage() {
  const router = useRouter()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<Order['status'] | 'all'>('all')

  const loadData = useCallback(() => {
    const restaurantData = getRestaurant()
    if (!restaurantData) {
      router.push('/')
      return
    }
    setRestaurant(restaurantData)
    
    const ordersData = getOrders().filter(o => o.restaurantId === restaurantData.id)
    setOrders(ordersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
  }, [router])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 3000)
    return () => clearInterval(interval)
  }, [loadData])

  const handleStatusChange = (orderId: string, newStatus: Order['status']) => {
    updateOrderStatus(orderId, newStatus)
    loadData()
  }

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(o => o.status === filter)

  const activeOrders = orders.filter(o => o.status !== 'served').length

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <a
                href="/dashboard"
                className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </a>
              <div>
                <p className="text-xs text-muted-foreground">Orders for</p>
                <h1 className="text-lg font-serif font-bold text-foreground">{restaurant.name}</h1>
              </div>
            </div>

            {activeOrders > 0 && (
              <div className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-full">
                <span className="w-2 h-2 rounded-full bg-background animate-pulse" />
                <span className="text-sm font-medium">{activeOrders} active</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filter Pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {(['all', 'pending', 'preparing', 'ready', 'served'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === status
                  ? 'bg-foreground text-background'
                  : 'bg-card text-foreground hover:bg-muted shadow-sm'
              }`}
            >
              {status === 'all' ? 'All Orders' : STATUS_CONFIG[status].label}
              {status !== 'all' && (
                <span className="ml-2 opacity-70">
                  ({orders.filter(o => o.status === status).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-[2rem] shadow-sm">
            <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No orders yet</h3>
            <p className="text-muted-foreground">Orders will appear here when customers place them</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOrders.map((order) => {
              const config = STATUS_CONFIG[order.status]
              return (
                <div key={order.id} className="bg-card rounded-[1.75rem] overflow-hidden shadow-sm">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-foreground text-lg">{order.roomName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${config.color}`}>
                        {config.label}
                      </span>
                    </div>

                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-sm font-semibold text-foreground">
                              {item.quantity}
                            </span>
                            <span className="text-foreground font-medium">{item.menuItem.name}</span>
                          </div>
                          <span className="text-muted-foreground">${(item.menuItem.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-5 border-t border-border bg-muted/30">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-muted-foreground">Total</span>
                      <span className="text-xl font-bold text-foreground">${order.totalAmount.toFixed(2)}</span>
                    </div>

                    {config.next && (
                      <button
                        onClick={() => handleStatusChange(order.id, config.next!)}
                        className="w-full h-12 bg-foreground text-background rounded-full font-semibold hover:bg-foreground/90 transition-all"
                      >
                        {config.nextLabel}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
