import { NextResponse } from 'next/server'

// This endpoint returns the WebSocket URL and API key for client-side streaming
// In production, you'd use a signed token instead of exposing the API key
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { keyterms = [] } = body

        const apiKey = process.env.ELEVENLABS_API_KEY
        if (!apiKey) {
            return NextResponse.json({
                success: false,
                error: 'ElevenLabs API key not configured',
            }, { status: 500 })
        }

        // Build WebSocket URL with query parameters
        const wsUrl = new URL('wss://api.elevenlabs.io/v1/speech-to-text/stream')

        // Add model
        wsUrl.searchParams.append('model_id', 'scribe_v2_realtime')

        // Language detection
        wsUrl.searchParams.append('language_code', 'en')

        return NextResponse.json({
            success: true,
            wsUrl: wsUrl.toString(),
            apiKey: apiKey, // In production, use signed tokens instead
            keyterms: keyterms.slice(0, 100), // Limit to 100 keyterms
        })
    } catch (error) {
        console.error('Stream config error:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to configure stream',
        }, { status: 500 })
    }
}
