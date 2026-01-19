'use client'

import type { Restaurant, Order } from './types'

const RESTAURANT_KEY = 'menuflow_restaurant'
const ORDERS_KEY = 'menuflow_orders'

export function getRestaurant(): Restaurant | null {
  if (typeof window === 'undefined') return null
  const data = localStorage.getItem(RESTAURANT_KEY)
  return data ? JSON.parse(data) : null
}

export function saveRestaurant(restaurant: Restaurant): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(RESTAURANT_KEY, JSON.stringify(restaurant))
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      alert('Storage is full. Please remove some menu items or use smaller images.')
    }
  }
}

export function getOrders(): Order[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(ORDERS_KEY)
  return data ? JSON.parse(data) : []
}

export function saveOrders(orders: Order[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.error('Storage quota exceeded for orders')
    }
  }
}

export function addOrder(order: Order): void {
  const orders = getOrders()
  orders.push(order)
  saveOrders(orders)
}

export function updateOrderStatus(orderId: string, status: Order['status']): void {
  const orders = getOrders()
  const index = orders.findIndex(o => o.id === orderId)
  if (index !== -1) {
    orders[index].status = status
    saveOrders(orders)
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}
