'use client'

interface OrderConfirmationProps {
  orderId: string
  restaurantName: string
  roomName: string
}

export function OrderConfirmation({ orderId, restaurantName }: OrderConfirmationProps) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Success Icon */}
        <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mx-auto">
          <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-4xl font-serif font-bold text-black">Order Placed!</h1>
        </div>

        {/* Action Button */}
        <button
          onClick={() => window.location.reload()}
          className="w-full h-14 rounded-full bg-black text-white font-bold text-lg hover:bg-black/90 transition-colors font-space shadow-xl shadow-black/5"
        >
          Order More Items
        </button>
      </div>
    </div>
  )
}
