'use client'

import { supabase } from './supabase'
import type { Restaurant, Order } from './types'

// Keep localStorage as fallback and for initial load speed
const RESTAURANT_KEY = 'menuflow_restaurant'
const ORDERS_KEY = 'menuflow_orders'

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

// ============ RESTAURANT FUNCTIONS ============

// Get restaurant from Supabase (with localStorage cache)
export async function getRestaurantAsync(id?: string): Promise<Restaurant | null> {
  try {
    if (id) {
      // Fetch specific restaurant by ID
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) return null

      return {
        id: data.id,
        name: data.name,
        createdAt: data.created_at,
        roomId: data.room_id,
        menuItems: data.menu_items || []
      }
    } else {
      // Fetch first restaurant (for backward compatibility)
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .limit(1)
        .single()

      if (error || !data) return null

      return {
        id: data.id,
        name: data.name,
        createdAt: data.created_at,
        roomId: data.room_id,
        menuItems: data.menu_items || []
      }
    }
  } catch (e) {
    console.error('Error fetching restaurant:', e)
    return null
  }
}

// Sync function for backward compatibility (uses localStorage)
export function getRestaurant(): Restaurant | null {
  if (typeof window === 'undefined') return null
  const data = localStorage.getItem(RESTAURANT_KEY)
  return data ? JSON.parse(data) : null
}

// Save restaurant to both Supabase and localStorage
export async function saveRestaurantAsync(restaurant: Restaurant): Promise<void> {
  // Save to localStorage for instant access
  if (typeof window !== 'undefined') {
    localStorage.setItem(RESTAURANT_KEY, JSON.stringify(restaurant))
  }

  // Save to Supabase for cross-device access
  try {
    const { error } = await supabase
      .from('restaurants')
      .upsert({
        id: restaurant.id,
        name: restaurant.name,
        created_at: restaurant.createdAt,
        room_id: restaurant.roomId,
        menu_items: restaurant.menuItems
      }, { onConflict: 'id' })

    if (error) {
      console.error('Error saving restaurant to Supabase:', error)
    }
  } catch (e) {
    console.error('Error saving restaurant:', e)
  }
}

// Sync function for backward compatibility
export function saveRestaurant(restaurant: Restaurant): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(RESTAURANT_KEY, JSON.stringify(restaurant))
  // Also save to Supabase async
  saveRestaurantAsync(restaurant)
}

// ============ ORDER FUNCTIONS ============

// Get orders from Supabase
export async function getOrdersAsync(restaurantId?: string): Promise<Order[]> {
  try {
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false })

    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId)
    }

    const { data, error } = await query

    if (error || !data) return []

    return data.map(order => ({
      id: order.id,
      restaurantId: order.restaurant_id,
      roomId: order.room_id,
      roomName: order.room_name,
      items: order.items,
      status: order.status,
      createdAt: order.created_at,
      totalAmount: order.total_amount
    }))
  } catch (e) {
    console.error('Error fetching orders:', e)
    return []
  }
}

// Sync function for backward compatibility
export function getOrders(): Order[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(ORDERS_KEY)
  return data ? JSON.parse(data) : []
}

// Save orders to localStorage (sync)
export function saveOrders(orders: Order[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
}

// Add order to both Supabase and localStorage
export async function addOrderAsync(order: Order): Promise<void> {
  // Save to localStorage
  const orders = getOrders()
  orders.push(order)
  saveOrders(orders)

  // Save to Supabase
  try {
    const { error } = await supabase
      .from('orders')
      .insert({
        id: order.id,
        restaurant_id: order.restaurantId,
        room_id: order.roomId,
        room_name: order.roomName,
        items: order.items,
        status: order.status,
        created_at: order.createdAt,
        total_amount: order.totalAmount
      })

    if (error) {
      console.error('Error saving order to Supabase:', error)
    }
  } catch (e) {
    console.error('Error saving order:', e)
  }
}

// Sync function for backward compatibility
export function addOrder(order: Order): void {
  const orders = getOrders()
  orders.push(order)
  saveOrders(orders)
  // Also save to Supabase async
  addOrderAsync(order)
}

// Update order status
export async function updateOrderStatusAsync(orderId: string, status: Order['status']): Promise<void> {
  // Update localStorage
  const orders = getOrders()
  const index = orders.findIndex(o => o.id === orderId)
  if (index !== -1) {
    orders[index].status = status
    saveOrders(orders)
  }

  // Update Supabase
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)

    if (error) {
      console.error('Error updating order status in Supabase:', error)
    }
  } catch (e) {
    console.error('Error updating order status:', e)
  }
}

// Sync function for backward compatibility
export function updateOrderStatus(orderId: string, status: Order['status']): void {
  const orders = getOrders()
  const index = orders.findIndex(o => o.id === orderId)
  if (index !== -1) {
    orders[index].status = status
    saveOrders(orders)
  }
  // Also update Supabase async
  updateOrderStatusAsync(orderId, status)
}
