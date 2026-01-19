export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: string
}

export interface Room {
  id: string
  name: string
  menuItems: string[] // menu item ids
}

export interface Restaurant {
  id: string
  name: string
  createdAt: string
  menuItems: MenuItem[]
  roomId: string
}

export interface OrderItem {
  menuItem: MenuItem
  quantity: number
  notes?: string
}

export interface Order {
  id: string
  restaurantId: string
  roomId: string
  roomName: string
  items: OrderItem[]
  status: 'pending' | 'preparing' | 'ready' | 'served'
  createdAt: string
  totalAmount: number
}

// Voice Order Types for Scribe v2 Integration
export interface ParsedOrderItem {
  itemName: string
  quantity: number
  modifiers: string[]
  confidence: number
}

export interface DraftOrderItem {
  menuItem: MenuItem
  quantity: number
  modifiers: string[]
  confidence: number
  isConfirmed: boolean
}

export interface VoiceTranscriptionResult {
  success: boolean
  transcript: string
  parsedItems: ParsedOrderItem[]
  entities: Array<{
    text: string
    type: string
    startChar: number
    endChar: number
  }>
  error?: string
}
