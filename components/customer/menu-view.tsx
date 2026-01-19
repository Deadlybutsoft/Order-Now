'use client'

import { useState } from 'react'
import type { MenuItem, OrderItem } from '@/lib/types'

interface CustomerMenuViewProps {
  items: MenuItem[]
  onAddToCart: (item: MenuItem, quantity?: number, notes?: string) => void
  cart: OrderItem[]
}

export function CustomerMenuView({ items, onAddToCart, cart }: CustomerMenuViewProps) {
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')

  const categories = [...new Set(items.map(item => item.category))]

  const getCartQuantity = (itemId: string) => {
    const cartItem = cart.find(i => i.menuItem.id === itemId)
    return cartItem?.quantity || 0
  }

  const handleAddItem = () => {
    if (selectedItem) {
      onAddToCart(selectedItem, quantity, notes)
      setSelectedItem(null)
      setQuantity(1)
      setNotes('')
    }
  }

  return (
    <>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {categories.map(category => (
          <section key={category} className="space-y-4">
            <h2 className="text-xl font-serif font-bold text-foreground">{category}</h2>
            <div className="space-y-3">
              {items.filter(item => item.category === category).map(item => {
                const cartQty = getCartQuantity(item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="w-full bg-card rounded-2xl border border-border p-4 flex gap-4 text-left hover:border-primary/50 transition-all group"
                  >
                    <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-foreground">{item.name}</h3>
                        <span className="text-primary font-semibold">${item.price.toFixed(2)}</span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                      )}
                      {cartQty > 0 && (
                        <div className="mt-2 inline-flex items-center gap-1 bg-primary/10 text-primary text-sm px-2 py-1 rounded-lg">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {cartQty} in cart
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </main>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card rounded-3xl border border-border overflow-hidden">
            <div className="aspect-video relative">
              <img
                src={selectedItem.image || "/placeholder.svg"}
                alt={selectedItem.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => {
                  setSelectedItem(null)
                  setQuantity(1)
                  setNotes('')
                }}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-serif font-bold text-foreground">{selectedItem.name}</h3>
                <p className="text-primary text-lg font-semibold mt-1">${selectedItem.price.toFixed(2)}</p>
                {selectedItem.description && (
                  <p className="text-muted-foreground mt-2">{selectedItem.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Special Instructions</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests?"
                  className="w-full h-20 rounded-xl bg-input border border-border p-3 text-foreground placeholder:text-muted-foreground resize-none"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-foreground hover:bg-muted/80"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="text-xl font-semibold text-foreground w-8 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-foreground hover:bg-muted/80"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={handleAddItem}
                  className="flex-1 ml-4 bg-primary text-primary-foreground py-3 rounded-2xl font-medium hover:bg-primary/90 transition-all"
                >
                  Add ${(selectedItem.price * quantity).toFixed(2)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
