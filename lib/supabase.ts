import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for database tables
export interface DBRestaurant {
    id: string
    name: string
    created_at: string
    room_id: string
    menu_items: any[] // JSON array of menu items
}

export interface DBOrder {
    id: string
    restaurant_id: string
    room_id: string
    room_name: string
    items: any[] // JSON array of order items
    status: string
    created_at: string
    total_amount: number
}
