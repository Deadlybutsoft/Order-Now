'use client'

import { useState, useEffect, useRef } from 'react'
import type { MenuItem } from '@/lib/types'
import SpeechRecognition from 'speech-recognition'

interface VoiceModeProps {
  menuItems: MenuItem[]
  onAddToCart: (item: MenuItem, quantity?: number, notes?: string) => void
  onClose: () => void
}

export function VoiceMode({ menuItems, onAddToCart, onClose }: VoiceModeProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState('')
  const [matchedItems, setMatchedItems] = useState<MenuItem[]>([])
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPart
          } else {
            interimTranscript += transcriptPart
          }
        }

        setTranscript(finalTranscript || interimTranscript)

        if (finalTranscript) {
          processVoiceCommand(finalTranscript.toLowerCase())
        }
      }

      recognitionRef.current.onerror = (event) => {
        console.log('[v0] Speech recognition error:', event.error)
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const processVoiceCommand = (text: string) => {
    const quantityMatch = text.match(/(\d+)/)
    const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1

    const matches = menuItems.filter(item => {
      const itemName = item.name.toLowerCase()
      const words = text.split(' ')
      return words.some(word => itemName.includes(word) && word.length > 2)
    })

    if (matches.length > 0) {
      setMatchedItems(matches)
      setFeedback(`Found ${matches.length} item${matches.length > 1 ? 's' : ''} matching your request`)
    } else {
      setFeedback('No items found. Try saying the dish name clearly.')
      setMatchedItems([])
    }
  }

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setFeedback('Voice recognition not supported in this browser')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setTranscript('')
      setMatchedItems([])
      setFeedback('')
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const handleAddItem = (item: MenuItem) => {
    onAddToCart(item, 1)
    setFeedback(`Added ${item.name} to your order!`)
    setMatchedItems(prev => prev.filter(i => i.id !== item.id))
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <header className="border-b border-border p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h2 className="text-xl font-serif font-bold text-foreground">Voice Order</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">
            {isListening ? 'Listening...' : 'Tap the microphone and say your order'}
          </p>
          <p className="text-sm text-muted-foreground">
            Try: &ldquo;I&apos;ll have a pizza&rdquo; or &ldquo;Add two burgers&rdquo;
          </p>
        </div>

        <button
          onClick={toggleListening}
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
            isListening 
              ? 'bg-primary animate-pulse' 
              : 'bg-card border border-border hover:border-primary'
          }`}
        >
          <svg 
            className={`w-10 h-10 ${isListening ? 'text-primary-foreground' : 'text-primary'}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>

        {transcript && (
          <div className="bg-card rounded-2xl border border-border p-4 max-w-md w-full">
            <p className="text-sm text-muted-foreground mb-1">You said:</p>
            <p className="text-foreground">{transcript}</p>
          </div>
        )}

        {feedback && (
          <p className="text-primary font-medium">{feedback}</p>
        )}

        {matchedItems.length > 0 && (
          <div className="w-full max-w-md space-y-3">
            <p className="text-sm text-muted-foreground">Tap to add:</p>
            {matchedItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleAddItem(item)}
                className="w-full bg-card rounded-2xl border border-border p-4 flex items-center gap-4 hover:border-primary transition-all"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                  <img
                    src={item.image || "/placeholder.svg"}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium text-foreground">{item.name}</h3>
                  <p className="text-primary">${item.price.toFixed(2)}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border p-4">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-sm font-medium text-foreground mb-3">Available Items</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleAddItem(item)}
                className="flex-shrink-0 bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
