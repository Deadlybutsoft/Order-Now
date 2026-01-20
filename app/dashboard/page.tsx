'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getRestaurant, saveRestaurant, generateId, getOrdersAsync, updateOrderStatus } from '@/lib/store'
import type { Restaurant, MenuItem, Order } from '@/lib/types'
import { DashboardHeader } from '@/components/dashboard/header'
import { MenuSection } from '@/components/dashboard/menu-section'

const STATUS_CONFIG = {
  pending: {
    label: 'New',
    color: 'bg-orange-100 text-orange-700',
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
    color: 'bg-green-100 text-green-700',
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

export default function DashboardPage() {
  const router = useRouter()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [activeTab, setActiveTab] = useState<'menu' | 'orders'>('menu')
  const [orders, setOrders] = useState<Order[]>([])
  const [orderFilter, setOrderFilter] = useState<Order['status'] | 'all'>('all')

  useEffect(() => {
    const data = getRestaurant()
    if (!data) {
      router.push('/')
    } else {
      setRestaurant(data)
    }
  }, [router])

  // Load orders with auto-refresh from Supabase
  useEffect(() => {
    if (!restaurant) return

    const loadOrders = async () => {
      const allOrders = await getOrdersAsync(restaurant.id)
      setOrders(allOrders)
    }

    loadOrders()
    const interval = setInterval(loadOrders, 3000)
    return () => clearInterval(interval)
  }, [restaurant])

  const updateRestaurant = useCallback((updated: Restaurant) => {
    setRestaurant(updated)
    saveRestaurant(updated)
  }, [])

  const addMenuItem = useCallback((item: Omit<MenuItem, 'id'>) => {
    if (!restaurant) return
    const newItem: MenuItem = { ...item, id: generateId() }
    updateRestaurant({
      ...restaurant,
      menuItems: [...restaurant.menuItems, newItem]
    })
  }, [restaurant, updateRestaurant])

  const deleteMenuItem = useCallback((id: string) => {
    if (!restaurant) return
    updateRestaurant({
      ...restaurant,
      menuItems: restaurant.menuItems.filter(item => item.id !== id)
    })
  }, [restaurant, updateRestaurant])

  const handleStatusChange = (orderId: string, newStatus: Order['status']) => {
    updateOrderStatus(orderId, newStatus)
  }

  const filteredOrders = orderFilter === 'all'
    ? orders
    : orders.filter(o => o.status === orderFilter)

  const activeOrders = orders.filter(o => o.status !== 'served').length

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <DashboardHeader
        restaurantName={restaurant.name}
        restaurantId={restaurant.id}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        roomId={restaurant.roomId}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'menu' && (
          <MenuSection
            menuItems={restaurant.menuItems}
            onAddItem={addMenuItem}
            onDeleteItem={deleteMenuItem}
            restaurantId={restaurant.id}
            roomId={restaurant.roomId}
          />
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Active Orders Badge */}
            {activeOrders > 0 && (
              <div className="flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-3 rounded-2xl w-fit">
                <span className="w-2 h-2 rounded-full bg-orange-700 animate-pulse" />
                <span className="text-sm font-semibold font-space">{activeOrders} active orders</span>
              </div>
            )}

            {/* Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {(['all', 'pending', 'preparing', 'ready', 'served'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setOrderFilter(status)}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium font-space whitespace-nowrap transition-all ${orderFilter === status
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

            {/* Orders Grid */}
            {filteredOrders.length === 0 ? (
              <div className="text-center py-20 bg-card rounded-[2rem] shadow-sm">
                <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2 font-space">No orders</h3>

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
                            <h3 className="font-semibold text-foreground text-lg font-space">{order.roomName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <span className={`px-4 py-1.5 rounded-full text-sm font-medium font-space ${config.color}`}>
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
                          <span className="text-muted-foreground font-space">Total</span>
                          <span className="text-xl font-bold text-foreground font-space">${order.totalAmount.toFixed(2)}</span>
                        </div>

                        {config.next && (
                          <button
                            onClick={() => handleStatusChange(order.id, config.next!)}
                            className="w-full h-12 bg-foreground text-background rounded-full font-semibold font-space hover:bg-foreground/90 transition-all"
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
        )}
      </main>
    </div>
  )
}
