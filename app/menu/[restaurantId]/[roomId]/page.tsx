'use client'

import { useState, useEffect, use, useRef } from 'react'
import { getRestaurant, getRestaurantAsync, addOrder, generateId } from '@/lib/store'
import type { Restaurant, MenuItem, OrderItem, VoiceTranscriptionResult } from '@/lib/types'
import { OrderConfirmation } from '@/components/customer/order-confirmation'

interface PageProps {
  params: Promise<{
    restaurantId: string
    roomId: string
  }>
}

type RecordingState = 'idle' | 'recording' | 'processing'

export default function CustomerMenuPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [availableItems, setAvailableItems] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<OrderItem[]>([])
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Voice recording states
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [transcript, setTranscript] = useState('')
  const [lastDetectedItems, setLastDetectedItems] = useState<string[]>([])
  const [audioError, setAudioError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const autoOrderTimerRef = useRef<NodeJS.Timeout | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [liveTranscript, setLiveTranscript] = useState('') // Live words as they come in

  // Auto-order countdown state
  const [autoOrderCountdown, setAutoOrderCountdown] = useState<number | null>(null)

  useEffect(() => {
    // First try localStorage for instant load
    const localData = getRestaurant()
    if (localData && localData.id === resolvedParams.restaurantId) {
      setRestaurant(localData)
      setAvailableItems(localData.menuItems)
      return
    }

    // Then fetch from Supabase for cross-device access
    const fetchRestaurant = async () => {
      const data = await getRestaurantAsync(resolvedParams.restaurantId)
      if (!data) {
        setError('Restaurant not found')
        return
      }
      setRestaurant(data)
      setAvailableItems(data.menuItems)
    }
    fetchRestaurant()
  }, [resolvedParams.restaurantId])

  // Generate keyterms from menu items
  const keyterms = availableItems.map(item => item.name)

  // Cancel auto-order countdown (defined early so cart functions can use it)
  const cancelAutoOrder = () => {
    if (autoOrderTimerRef.current) {
      clearInterval(autoOrderTimerRef.current)
      autoOrderTimerRef.current = null
    }
    setAutoOrderCountdown(null)
  }

  const addToCart = (item: MenuItem, qty: number = 1, notes?: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItem.id === item.id)
      if (existing) {
        return prev.map(i =>
          i.menuItem.id === item.id ? { ...i, quantity: i.quantity + qty, notes: notes || i.notes } : i
        )
      }
      return [...prev, { menuItem: item, quantity: qty, notes }]
    })

    // Animate: flash the item as "just added"
    setLastDetectedItems(prev => [...prev, item.id])
    setTimeout(() => {
      setLastDetectedItems(prev => prev.filter(id => id !== item.id))
    }, 1000)
  }

  const updateCartItem = (itemId: string, newQuantity: number) => {
    cancelAutoOrder() // Cancel countdown if editing
    if (newQuantity <= 0) {
      setCart(prev => prev.filter(i => i.menuItem.id !== itemId))
    } else {
      setCart(prev => prev.map(i =>
        i.menuItem.id === itemId ? { ...i, quantity: newQuantity } : i
      ))
    }
  }

  const removeFromCart = (itemId: string) => {
    cancelAutoOrder() // Cancel countdown if removing
    setCart(prev => prev.filter(i => i.menuItem.id !== itemId))
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const placeOrder = () => {
    if (!restaurant || cart.length === 0) return
    const newOrderId = generateId()
    addOrder({
      id: newOrderId,
      restaurantId: restaurant.id,
      roomId: restaurant.roomId,
      roomName: 'Order Now',
      items: cart,
      status: 'pending',
      createdAt: new Date().toISOString(),
      totalAmount: cartTotal
    })
    setOrderId(newOrderId)
    setOrderPlaced(true)
    setCart([])
  }

  // Voice Recording Functions - Batch API (reliable)
  const startRecording = async () => {
    try {
      audioChunksRef.current = []
      setTranscript('')
      setLiveTranscript('')

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        if (audioChunksRef.current.length > 0) {
          await processAudio()
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100)
      setRecordingState('recording')
      setLiveTranscript('Listening...') // Show feedback while recording

    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Could not access microphone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setRecordingState('processing')
      setLiveTranscript('Processing...')
    }
  }

  const processAudio = async () => {
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })

      // Convert to base64
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
      })
      reader.readAsDataURL(audioBlob)

      const audioBase64 = await base64Promise

      // Call Scribe v2 API
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          keyterms,
          mimeType: 'audio/webm',
        }),
      })

      const result: VoiceTranscriptionResult = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Transcription failed')
      }

      setTranscript(result.transcript)
      setLiveTranscript('')

      // Add detected items to cart
      let itemsAdded = 0
      result.parsedItems.forEach(parsed => {
        const menuItem = availableItems.find(
          item => item.name.toLowerCase() === parsed.itemName.toLowerCase()
        )
        if (menuItem) {
          const notes = parsed.modifiers.length > 0 ? parsed.modifiers.join(', ') : undefined
          addToCart(menuItem, parsed.quantity, notes)
          itemsAdded++
        }
      })

      setRecordingState('idle')

      // Start auto-order countdown if items were added
      if (itemsAdded > 0) {
        startAutoOrderCountdown()
      }

    } catch (err) {
      console.error('Error processing audio:', err)
      setAudioError(err instanceof Error ? err.message : 'Failed to process audio. Try again.')
      setRecordingState('idle')
      setLiveTranscript('')
      setTimeout(() => setAudioError(null), 5000)
    }
  }

  // Toggle recording - tap to start, tap again to stop
  const toggleRecording = () => {
    if (recordingState === 'idle') {
      startRecording()
    } else if (recordingState === 'recording') {
      stopRecording()
    }
    // If processing, do nothing
  }


  // Auto-order countdown functions
  const startAutoOrderCountdown = () => {
    // Clear any existing timer
    if (autoOrderTimerRef.current) {
      clearInterval(autoOrderTimerRef.current)
    }

    setAutoOrderCountdown(5)

    autoOrderTimerRef.current = setInterval(() => {
      setAutoOrderCountdown(prev => {
        if (prev === null || prev <= 1) {
          // Time's up - place the order
          if (autoOrderTimerRef.current) {
            clearInterval(autoOrderTimerRef.current)
            autoOrderTimerRef.current = null
          }
          // Trigger order placement
          placeOrderNow()
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  const placeOrderNow = () => {
    cancelAutoOrder()
    placeOrder()
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">{error}</h1>
          <p className="text-white/60">Please check the QR code and try again.</p>
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (orderPlaced && orderId) {
    return <OrderConfirmation orderId={orderId} restaurantName={restaurant.name} roomName="Order" />
  }

  return (
    <div className="h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Audio Error Toast */}
      {audioError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm font-medium">{audioError}</span>
          <button onClick={() => setAudioError(null)} className="ml-2 text-white/80 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Header */}
      <header className="shrink-0 px-6 py-4 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-white/40 text-xs font-space uppercase tracking-widest">Order Now</p>
            <h1 className="text-2xl font-serif font-bold text-white">{restaurant.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-white/40 text-xs font-space">Powered by</p>
              <p className="text-white/80 text-sm font-space font-semibold">Scribe v2</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Split Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* LEFT SIDE - Menu Grid */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-3xl">
            <h2 className="text-lg font-semibold text-white mb-4 font-space">Menu</h2>

            {availableItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/40">No menu items available</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableItems.map(item => {
                  const inCart = cart.find(c => c.menuItem.id === item.id)
                  const justAdded = lastDetectedItems.includes(item.id)

                  return (
                    <div
                      key={item.id}
                      className={`relative bg-white/5 rounded-2xl p-4 border transition-all duration-300 ${justAdded
                        ? 'border-green-500 scale-105 shadow-lg shadow-green-500/20'
                        : inCart
                          ? 'border-white/30'
                          : 'border-white/5'
                        }`}
                    >
                      {/* Name & Price */}
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-white text-lg truncate flex-1">{item.name}</h3>
                        <span className="text-xl font-bold text-white font-space shrink-0">${item.price.toFixed(2)}</span>
                      </div>

                      {/* Cart badge */}
                      {inCart && (
                        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-green-500 text-white text-sm font-bold flex items-center justify-center shadow-lg">
                          {inCart.quantity}
                        </div>
                      )}

                      {/* Just added indicator */}
                      {justAdded && (
                        <div className="absolute inset-0 bg-green-500/30 rounded-2xl flex items-center justify-center">
                          <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                            ✓ Added
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE - Live Cart */}
        <div className="w-80 lg:w-96 shrink-0 border-l border-white/10 bg-white/[0.02] flex flex-col">
          {/* Cart Header */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white font-space">Your Order</h2>
              <span className="text-white/40 text-sm font-space">{cartCount} items</span>
            </div>
          </div>

          {/* Live Transcript Display */}
          {(liveTranscript || transcript) && (
            <div className="px-4 py-3 bg-white/5 border-b border-white/10">
              <p className="text-xs text-white/40 font-space mb-1">
                {recordingState === 'recording' ? '🎤 Listening...' : 'You said:'}
              </p>
              <p className="text-white/80 text-sm">
                {transcript && <span>{transcript} </span>}
                {liveTranscript && (
                  <span className="text-green-400 animate-pulse">{liveTranscript}</span>
                )}
              </p>
            </div>
          )}

          {/* Cart Items */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <p className="text-white/40 text-sm">Tap the mic button and speak your order</p>
                <p className="text-white/20 text-xs mt-2">Try: "Two pizzas and a coke"</p>
              </div>
            ) : (
              cart.map(item => {
                const justAdded = lastDetectedItems.includes(item.menuItem.id)
                return (
                  <div
                    key={item.menuItem.id}
                    className={`bg-white/5 rounded-xl p-3 border transition-all duration-500 ${justAdded ? 'border-green-500 animate-pulse' : 'border-white/5'}`}
                  >
                    {/* Header: Name + Delete */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-white text-base">{item.menuItem.name}</h3>
                      <button
                        onClick={() => removeFromCart(item.menuItem.id)}
                        className="text-white/30 hover:text-red-400 transition-colors shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-yellow-500/80 mb-2">{item.notes}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateCartItem(item.menuItem.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="text-white font-bold text-lg w-8 text-center font-space">{item.quantity}</span>
                        <button
                          onClick={() => updateCartItem(item.menuItem.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-black"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                      <span className="text-white font-bold text-lg font-space">
                        ${(item.menuItem.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Cart Total & Place Order */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/60 font-space">Total</span>
                <span className="text-2xl font-bold text-white font-space">${cartTotal.toFixed(2)}</span>
              </div>

              {/* Auto-order countdown */}
              {autoOrderCountdown !== null ? (
                <div className="space-y-3">
                  <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold font-space">
                          {autoOrderCountdown}
                        </div>
                        <span className="text-green-400 text-sm font-space">Auto-ordering in {autoOrderCountdown}s...</span>
                      </div>
                      <button
                        onClick={cancelAutoOrder}
                        className="text-white/60 hover:text-white text-sm font-space underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={placeOrderNow}
                    className="w-full bg-green-500 text-white py-4 rounded-2xl font-semibold text-lg font-space hover:bg-green-600 transition-colors"
                  >
                    Place Order Now
                  </button>
                </div>
              ) : (
                <button
                  onClick={placeOrder}
                  className="w-full bg-white text-black py-4 rounded-2xl font-semibold text-lg font-space hover:bg-white/90 transition-colors"
                >
                  Place Order
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Voice Bar */}
      <footer className="shrink-0 px-6 py-4 border-t border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-4">

            {/* Recording State Display */}
            {recordingState === 'processing' && (
              <div className="flex items-center gap-3 text-white/60">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="font-space text-sm">Processing with Scribe v2...</span>
              </div>
            )}

            {recordingState === 'recording' && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-red-500 rounded-full animate-pulse"
                      style={{
                        height: `${12 + Math.random() * 20}px`,
                        animationDelay: `${i * 0.1}s`
                      }}
                    />
                  ))}
                </div>
                <span className="text-red-400 font-space text-sm">Listening... tap to stop</span>
              </div>
            )}

            {recordingState === 'idle' && (
              <span className="text-white/40 font-space text-sm hidden sm:block">
                Tap to speak your order
              </span>
            )}

            {/* Mic Button - Tap to start, tap again to stop */}
            <button
              onClick={toggleRecording}
              disabled={recordingState === 'processing'}
              className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all ${recordingState === 'recording'
                ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/30'
                : recordingState === 'processing'
                  ? 'bg-white/10 cursor-wait'
                  : 'bg-white hover:scale-105 active:scale-95'
                }`}
            >
              {recordingState === 'processing' ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : recordingState === 'recording' ? (
                // Stop icon when recording
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                // Mic icon when idle
                <svg
                  className="w-7 h-7 text-black"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}

              {/* Pulsing ring when recording */}
              {recordingState === 'recording' && (
                <>
                  <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-75" />
                  <div className="absolute inset-[-8px] rounded-full border border-red-500/30 animate-pulse" />
                </>
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
