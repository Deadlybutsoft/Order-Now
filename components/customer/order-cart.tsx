'use client'

import { useState } from 'react'
import type { OrderItem } from '@/lib/types'

interface OrderCartProps {
  items: OrderItem[]
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onRemoveItem: (itemId: string) => void
  onPlaceOrder: () => void
}

export function OrderCart({ items, onUpdateQuantity, onRemoveItem, onPlaceOrder }: OrderCartProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const totalAmount = items.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0)
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  if (items.length === 0) return null

  return (
    <>
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}
      
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border transition-all duration-300 ${
        isExpanded ? 'rounded-t-3xl' : ''
      }`}>
        {isExpanded && (
          <div className="max-w-3xl mx-auto px-4 pt-6 pb-4 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif font-bold text-foreground">Your Order</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.menuItem.id} className="flex items-center gap-3 bg-muted/30 rounded-xl p-3">
                  <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={item.menuItem.image || "/placeholder.svg"}
                      alt={item.menuItem.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground text-sm">{item.menuItem.name}</h4>
                    <p className="text-primary text-sm">${(item.menuItem.price * item.quantity).toFixed(2)}</p>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateQuantity(item.menuItem.id, item.quantity - 1)}
                      className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <span className="w-6 text-center text-foreground font-medium">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.menuItem.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-foreground"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onRemoveItem(item.menuItem.id)}
                      className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-3 flex-1"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-semibold">
                {totalItems}
              </div>
              <div className="text-left">
                <p className="text-sm text-muted-foreground">Your Order</p>
                <p className="font-semibold text-foreground">${totalAmount.toFixed(2)}</p>
              </div>
              <svg className={`w-5 h-5 text-muted-foreground ml-auto transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={onPlaceOrder}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-medium hover:bg-primary/90 transition-all"
            >
              Place Order
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
