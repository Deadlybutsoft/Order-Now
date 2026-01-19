'use client'

import React from "react"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { MenuItem } from '@/lib/types'

interface MenuSectionProps {
  menuItems: MenuItem[]
  onAddItem: (item: Omit<MenuItem, 'id'>) => void
  onDeleteItem: (id: string) => void
  restaurantId: string
  roomId: string
}

export function MenuSection({ menuItems, onAddItem, onDeleteItem }: MenuSectionProps) {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.price) return

    onAddItem({
      name: formData.name,
      description: '',
      price: parseFloat(formData.price),
      image: '',
      category: 'Menu'
    })

    setFormData({ name: '', price: '' })
    setShowForm(false)
  }

  const closeForm = () => {
    setShowForm(false)
    setFormData({ name: '', price: '' })
  }

  return (
    <div className="space-y-6">
      {/* Top Bar: Add Item Button */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white font-space">Your Restaurant Menu Items</h2>

        {/* Add Item Button */}
        <button
          onClick={() => setShowForm(true)}
          className="h-12 px-5 rounded-full bg-white text-[#1d7b37] font-medium flex items-center gap-2 hover:bg-white/90 transition-all hover:scale-105 active:scale-95 shadow-sm shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-space text-sm">Add Item</span>
        </button>
      </div>

      {/* Menu Grid - Simple List */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {menuItems.map(item => (
          <div key={item.id} className="bg-white/10 rounded-2xl p-4 group border border-white/5 hover:bg-white/15 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-lg font-space truncate">{item.name}</h3>
                <span className="text-2xl font-bold text-white font-space">${item.price.toFixed(2)}</span>
              </div>
              {/* Delete Button */}
              <button
                onClick={() => onDeleteItem(item.id)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        {/* Empty State Card */}
        {menuItems.length === 0 && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="col-span-full bg-white/5 rounded-2xl border-2 border-dashed border-white/20 hover:border-white/40 transition-all duration-300 py-12 flex flex-col items-center justify-center gap-4"
          >
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white font-space">Add Your First Item</p>
              <p className="text-white/40 text-sm mt-1 font-space">Start building your menu</p>
            </div>
          </button>
        )}
      </div>

      {/* Simple Modal Form - Name & Price Only */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeForm}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-sm bg-[#1d7b37] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/10">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-xl font-bold text-white font-space">Add Menu Item</h2>
              <button
                onClick={closeForm}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Name Input */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-white/80 font-space">Food Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Margherita Pizza"
                  className="h-14 rounded-xl bg-white/10 border-0 text-white placeholder:text-white/40 text-lg font-semibold focus:bg-white/20 transition-colors"
                  autoFocus
                />
              </div>

              {/* Price Input */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-white/80 font-space">Price</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-bold text-lg">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                    className="h-14 pl-10 rounded-xl bg-white/10 border-0 text-white placeholder:text-white/40 text-lg font-semibold focus:bg-white/20 transition-colors"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!formData.name || !formData.price}
                className="w-full h-14 rounded-xl bg-white text-[#1d7b37] hover:bg-white/90 font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                <span className="flex items-center gap-2 font-space">
                  Add to Menu
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
