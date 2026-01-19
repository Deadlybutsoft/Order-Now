'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { MenuItem, DraftOrderItem, VoiceTranscriptionResult } from '@/lib/types'

interface ScribeVoiceOrderProps {
    menuItems: MenuItem[]
    onAddToCart: (item: MenuItem, quantity: number, notes?: string) => void
    onClose: () => void
    restaurantName: string
}

type VoiceState = 'idle' | 'recording' | 'processing' | 'confirming'

export function ScribeVoiceOrder({
    menuItems,
    onAddToCart,
    onClose,
    restaurantName,
}: ScribeVoiceOrderProps) {
    const [voiceState, setVoiceState] = useState<VoiceState>('idle')
    const [transcript, setTranscript] = useState('')
    const [draftItems, setDraftItems] = useState<DraftOrderItem[]>([])
    const [error, setError] = useState<string | null>(null)
    const [recordingTime, setRecordingTime] = useState(0)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    // Generate keyterms from menu items
    const keyterms = menuItems.map(item => item.name)

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop()
            }
        }
    }, [])

    const startRecording = useCallback(async () => {
        try {
            setError(null)
            setTranscript('')
            setDraftItems([])
            audioChunksRef.current = []

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
                if (timerRef.current) {
                    clearInterval(timerRef.current)
                    timerRef.current = null
                }

                if (audioChunksRef.current.length > 0) {
                    await processAudio()
                }
            }

            mediaRecorderRef.current = mediaRecorder
            mediaRecorder.start(100) // Collect data every 100ms
            setVoiceState('recording')
            setRecordingTime(0)

            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1)
            }, 1000)

        } catch (err) {
            console.error('Error starting recording:', err)
            setError('Could not access microphone. Please allow microphone permissions.')
        }
    }, [])

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop()
            setVoiceState('processing')
        }
    }, [])

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

            // Call our API with Scribe v2
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

            // Match parsed items to actual menu items
            const matchedDraftItems: DraftOrderItem[] = result.parsedItems
                .map(parsed => {
                    const menuItem = menuItems.find(
                        item => item.name.toLowerCase() === parsed.itemName.toLowerCase()
                    )
                    if (menuItem) {
                        return {
                            menuItem,
                            quantity: parsed.quantity,
                            modifiers: parsed.modifiers,
                            confidence: parsed.confidence,
                            isConfirmed: parsed.confidence > 0.8, // Auto-confirm high confidence
                        }
                    }
                    return null
                })
                .filter((item): item is DraftOrderItem => item !== null)

            setDraftItems(matchedDraftItems)
            setVoiceState('confirming')

        } catch (err) {
            console.error('Error processing audio:', err)
            setError(err instanceof Error ? err.message : 'Failed to process audio')
            setVoiceState('idle')
        }
    }

    const toggleItemConfirmation = (index: number) => {
        setDraftItems(prev =>
            prev.map((item, i) =>
                i === index ? { ...item, isConfirmed: !item.isConfirmed } : item
            )
        )
    }

    const updateItemQuantity = (index: number, delta: number) => {
        setDraftItems(prev =>
            prev.map((item, i) =>
                i === index
                    ? { ...item, quantity: Math.max(1, item.quantity + delta) }
                    : item
            )
        )
    }

    const confirmOrder = () => {
        const confirmedItems = draftItems.filter(item => item.isConfirmed)
        confirmedItems.forEach(item => {
            const notes = item.modifiers.length > 0 ? item.modifiers.join(', ') : undefined
            onAddToCart(item.menuItem, item.quantity, notes)
        })

        // Reset and close
        setVoiceState('idle')
        setDraftItems([])
        setTranscript('')
        onClose()
    }

    const resetAndTryAgain = () => {
        setVoiceState('idle')
        setDraftItems([])
        setTranscript('')
        setError(null)
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const draftTotal = draftItems
        .filter(item => item.isConfirmed)
        .reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0)

    return (
        <div className="fixed inset-0 z-50 bg-[#1d7b37] flex flex-col">
            {/* Header */}
            <header className="shrink-0 border-b border-white/10 p-4">
                <div className="max-w-lg mx-auto flex items-center justify-between">
                    <div>
                        <p className="text-white/60 text-xs font-space uppercase tracking-wider">Voice Order</p>
                        <h2 className="text-xl font-serif font-bold text-white">{restaurantName}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-4">
                <div className="max-w-lg mx-auto space-y-6">

                    {/* Idle State - Ready to record */}
                    {voiceState === 'idle' && (
                        <div className="text-center space-y-8 py-12">
                            <div className="space-y-3">
                                <div className="w-20 h-20 mx-auto rounded-full bg-white/10 flex items-center justify-center">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-serif font-bold text-white">Speak Your Order</h3>
                                <p className="text-white/70 max-w-sm mx-auto">
                                    Tap the button below and tell us what you'd like. Our AI will understand your complete order.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <p className="text-sm text-white/50 font-space">Try saying something like:</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {['I\'ll have two pizzas', 'One burger, no pickles', 'Large fries with extra salt'].map((example, i) => (
                                        <span key={i} className="bg-white/10 text-white/80 text-sm px-3 py-1.5 rounded-full font-space">
                                            "{example}"
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={startRecording}
                                className="w-24 h-24 mx-auto rounded-full bg-white flex items-center justify-center text-[#1d7b37] hover:scale-105 active:scale-95 transition-transform shadow-xl"
                            >
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                            </button>

                            {error && (
                                <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-sm">
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Recording State */}
                    {voiceState === 'recording' && (
                        <div className="text-center space-y-8 py-12">
                            <div className="space-y-3">
                                <div className="relative">
                                    <div className="w-24 h-24 mx-auto rounded-full bg-white flex items-center justify-center animate-pulse">
                                        <svg className="w-10 h-10 text-[#1d7b37]" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z" />
                                            <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.93V21a1 1 0 102 0v-3.07A7 7 0 0019 11z" />
                                        </svg>
                                    </div>
                                    {/* Pulsing rings */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-32 h-32 rounded-full border-2 border-white/30 animate-ping" style={{ animationDuration: '1.5s' }} />
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-40 h-40 rounded-full border border-white/20 animate-ping" style={{ animationDuration: '2s' }} />
                                    </div>
                                </div>

                                <p className="text-3xl font-space font-bold text-white">{formatTime(recordingTime)}</p>
                                <p className="text-white/70">Listening... Speak your order clearly</p>
                            </div>

                            <button
                                onClick={stopRecording}
                                className="bg-white text-[#1d7b37] px-8 py-4 rounded-full font-semibold text-lg font-space hover:bg-white/90 transition-colors shadow-lg flex items-center gap-3 mx-auto"
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <rect x="6" y="6" width="12" height="12" rx="2" />
                                </svg>
                                Done Speaking
                            </button>
                        </div>
                    )}

                    {/* Processing State */}
                    {voiceState === 'processing' && (
                        <div className="text-center space-y-6 py-12">
                            <div className="w-20 h-20 mx-auto rounded-full bg-white/10 flex items-center justify-center">
                                <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-serif font-bold text-white">Processing Your Order</h3>
                                <p className="text-white/70 font-space text-sm">Using AI to understand your request...</p>
                            </div>

                            {/* Scribe v2 badge */}
                            <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/10">
                                <span className="text-xs text-white/60 font-space">Powered by</span>
                                <span className="text-sm font-semibold text-white font-space">ElevenLabs Scribe v2</span>
                            </div>
                        </div>
                    )}

                    {/* Confirming State - Show Draft Order */}
                    {voiceState === 'confirming' && (
                        <div className="space-y-6">
                            {/* Transcript */}
                            {transcript && (
                                <div className="bg-white/10 rounded-2xl p-4 border border-white/10">
                                    <p className="text-xs text-white/50 font-space uppercase tracking-wider mb-2">You said:</p>
                                    <p className="text-white font-space">"{transcript}"</p>
                                </div>
                            )}

                            {/* Draft Items */}
                            {draftItems.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-serif font-bold text-white">Your Draft Order</h3>
                                        <span className="text-sm text-white/60 font-space">{draftItems.filter(i => i.isConfirmed).length} items</span>
                                    </div>

                                    <div className="space-y-3">
                                        {draftItems.map((item, index) => (
                                            <div
                                                key={index}
                                                className={`bg-white/10 rounded-2xl p-4 border transition-all ${item.isConfirmed ? 'border-white/30' : 'border-white/5 opacity-60'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-4">
                                                    {/* Checkbox */}
                                                    <button
                                                        onClick={() => toggleItemConfirmation(index)}
                                                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${item.isConfirmed
                                                                ? 'bg-white border-white text-[#1d7b37]'
                                                                : 'border-white/30'
                                                            }`}
                                                    >
                                                        {item.isConfirmed && (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </button>

                                                    {/* Item Image */}
                                                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/20 shrink-0">
                                                        {item.menuItem.image ? (
                                                            <img src={item.menuItem.image} alt={item.menuItem.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <svg className="w-6 h-6 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Item Details */}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-white truncate">{item.menuItem.name}</h4>
                                                        <p className="text-white/70 font-space text-sm">${item.menuItem.price.toFixed(2)} each</p>

                                                        {/* Modifiers */}
                                                        {item.modifiers.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                {item.modifiers.map((mod, i) => (
                                                                    <span key={i} className="bg-white/10 text-white/80 text-xs px-2 py-0.5 rounded-full font-space">
                                                                        {mod}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Confidence indicator */}
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <div className="h-1 w-16 bg-white/10 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-white rounded-full"
                                                                    style={{ width: `${item.confidence * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-white/50 font-space">
                                                                {Math.round(item.confidence * 100)}% match
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Quantity Controls */}
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            onClick={() => updateItemQuantity(index, -1)}
                                                            className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                            </svg>
                                                        </button>
                                                        <span className="w-8 text-center font-semibold text-white font-space">
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() => updateItemQuantity(index, 1)}
                                                            className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#1d7b37]"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 space-y-4">
                                    <div className="w-16 h-16 mx-auto rounded-full bg-white/10 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
                                        </svg>
                                    </div>
                                    <p className="text-white/70">We couldn't find any menu items in your order.</p>
                                    <p className="text-sm text-white/50">Try speaking more clearly or mentioning specific dish names.</p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={resetAndTryAgain}
                                    className="flex-1 bg-white/10 text-white py-4 rounded-2xl font-semibold font-space hover:bg-white/20 transition-colors border border-white/10"
                                >
                                    Try Again
                                </button>
                                {draftItems.some(i => i.isConfirmed) && (
                                    <button
                                        onClick={confirmOrder}
                                        className="flex-1 bg-white text-[#1d7b37] py-4 rounded-2xl font-semibold font-space hover:bg-white/90 transition-colors shadow-lg"
                                    >
                                        Add ${draftTotal.toFixed(2)}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer - Powered By */}
            <footer className="shrink-0 border-t border-white/10 p-4">
                <div className="max-w-lg mx-auto flex items-center justify-center gap-2">
                    <span className="text-xs text-white/40 font-space">Voice AI powered by</span>
                    <span className="text-sm font-semibold text-white/60 font-space">ElevenLabs Scribe v2</span>
                </div>
            </footer>
        </div>
    )
}
