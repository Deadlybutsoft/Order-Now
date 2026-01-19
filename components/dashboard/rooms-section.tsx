'use client'

import React from "react"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Room, MenuItem } from '@/lib/types'

interface RoomsSectionProps {
  rooms: Room[]
  menuItems: MenuItem[]
  restaurantId: string
  onAddRoom: (name: string, menuItemIds: string[]) => void
  onDeleteRoom: (id: string) => void
}

export function RoomsSection({ rooms, menuItems, restaurantId, onAddRoom, onDeleteRoom }: RoomsSectionProps) {
  const [showForm, setShowForm] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomName.trim()) return

    onAddRoom(roomName.trim(), selectedItems.length > 0 ? selectedItems : menuItems.map(m => m.id))
    setRoomName('')
    setSelectedItems([])
    setShowForm(false)
  }

  const toggleItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const copyLink = (roomId: string) => {
    const link = `${window.location.origin}/menu/${restaurantId}/${roomId}`
    navigator.clipboard.writeText(link)
    setCopiedLink(roomId)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Tables / Rooms</h2>
          <p className="text-muted-foreground mt-1">Create table links for customers to order</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          disabled={menuItems.length === 0}
          className="rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {showForm ? 'Cancel' : '+ Add Table'}
        </Button>
      </div>

      {menuItems.length === 0 && (
        <div className="bg-muted/50 rounded-2xl p-4 text-center">
          <p className="text-muted-foreground">Add menu items first before creating tables</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-3xl p-6 space-y-4 border-2 border-double border-primary">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Table / Room Name *</label>
            <Input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g. Table 1, VIP Room, Patio"
              className="rounded-xl bg-input border-border"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Select Menu Items (leave empty to include all)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-muted/30 rounded-xl">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className={`p-2 rounded-xl text-sm text-left transition-all ${
                    selectedItems.includes(item.id)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-foreground hover:border-primary'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90">
            Create Table Link
          </Button>
        </form>
      )}

      {rooms.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-3xl border border-border">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No tables yet</h3>
          <p className="text-muted-foreground">Create table links to share with customers</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => (
            <div key={room.id} className="bg-card rounded-2xl p-5 space-y-4 border-primary border-double border-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{room.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {room.menuItems.length} items available
                  </p>
                </div>
                <button
                  onClick={() => onDeleteRoom(room.id)}
                  className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => copyLink(room.id)}
                  variant="outline"
                  className="flex-1 rounded-xl border-border text-foreground bg-transparent hover:bg-muted"
                >
                  {copiedLink === room.id ? (
                    <>
                      <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Link
                    </>
                  )}
                </Button>
                <a
                  href={`/menu/${restaurantId}/${room.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
