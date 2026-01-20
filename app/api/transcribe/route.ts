import { NextRequest, NextResponse } from 'next/server'

export interface TranscriptionRequest {
    audioBase64: string
    keyterms: string[]
    mimeType?: string
}

export interface ParsedOrderItem {
    itemName: string
    quantity: number
    modifiers: string[]
    confidence: number
}

export interface TranscriptionResponse {
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

// Helper function to parse quantities from text
function parseQuantity(text: string): number {
    const numberWords: Record<string, number> = {
        'one': 1, 'a': 1, 'an': 1,
        'two': 2, 'couple': 2,
        'three': 3,
        'four': 4,
        'five': 5,
        'six': 6,
        'seven': 7,
        'eight': 8,
        'nine': 9,
        'ten': 10,
    }

    // Check for numeric digits
    const digitMatch = text.match(/(\d+)/)
    if (digitMatch) {
        return parseInt(digitMatch[1], 10)
    }

    // Check for word numbers
    const lowerText = text.toLowerCase()
    for (const [word, num] of Object.entries(numberWords)) {
        if (lowerText.includes(word)) {
            return num
        }
    }

    return 1 // Default quantity
}

// Helper function to extract modifiers
function extractModifiers(text: string): string[] {
    const modifierPatterns = [
        /no\s+(\w+)/gi,
        /without\s+(\w+)/gi,
        /extra\s+(\w+)/gi,
        /with\s+(\w+)/gi,
        /add\s+(\w+)/gi,
        /less\s+(\w+)/gi,
        /more\s+(\w+)/gi,
        /spicy/gi,
        /mild/gi,
        /hot/gi,
        /cold/gi,
        /large/gi,
        /small/gi,
        /medium/gi,
    ]

    const modifiers: string[] = []

    for (const pattern of modifierPatterns) {
        const matches = text.matchAll(pattern)
        for (const match of matches) {
            modifiers.push(match[0].toLowerCase().trim())
        }
    }

    return [...new Set(modifiers)] // Remove duplicates
}

// Smart matching function to find menu items in transcript
function findMenuItemsInTranscript(
    transcript: string,
    keyterms: string[],
    entities: Array<{ text: string; type: string; startChar: number; endChar: number }>
): ParsedOrderItem[] {
    const lowerTranscript = transcript.toLowerCase()
    const parsedItems: ParsedOrderItem[] = []

    // Sort keyterms by length (longer first) to match more specific items first
    const sortedKeyterms = [...keyterms].sort((a, b) => b.length - a.length)

    // Find all cardinal (number) entities for quantity matching
    const cardinalEntities = entities.filter(e =>
        e.type === 'cardinal' || e.type === 'CARDINAL' || e.type === 'number'
    )

    console.log('Cardinal entities found:', cardinalEntities)

    for (const term of sortedKeyterms) {
        const lowerTerm = term.toLowerCase()
        const termIndex = lowerTranscript.indexOf(lowerTerm)

        if (termIndex !== -1) {
            let quantity = 1 // Default

            // First, try to find a cardinal entity near this menu item
            // Look for entities that appear before the item (within 50 chars)
            const nearbyCardinal = cardinalEntities.find(entity => {
                const entityEnd = entity.endChar
                // Entity should be before the item and within reasonable distance
                return entityEnd <= termIndex && (termIndex - entityEnd) < 50
            })

            if (nearbyCardinal) {
                // Parse the entity text to get the number
                quantity = parseQuantity(nearbyCardinal.text)
                console.log(`Found entity "${nearbyCardinal.text}" → quantity ${quantity} for "${term}"`)
            } else {
                // Fallback: Look backwards from the item for quantity words (increased to 50 chars)
                const beforeText = transcript.substring(Math.max(0, termIndex - 50), termIndex)
                console.log(`Looking for quantity in: "${beforeText}" for "${term}"`)
                quantity = parseQuantity(beforeText)
                console.log(`Fallback quantity: ${quantity} for "${term}"`)
            }

            // Look around the item for modifiers
            const contextStart = Math.max(0, termIndex - 50)
            const contextEnd = Math.min(transcript.length, termIndex + term.length + 50)
            const context = transcript.substring(contextStart, contextEnd)
            const modifiers = extractModifiers(context)

            // Calculate confidence based on exact match vs partial
            const exactMatch = new RegExp(`\\b${lowerTerm}\\b`, 'i').test(transcript)
            const confidence = exactMatch ? 0.95 : 0.7

            parsedItems.push({
                itemName: term, // Use original casing from keyterms
                quantity,
                modifiers,
                confidence,
            })
            console.log(`Added to cart: ${quantity}x ${term}`)
        }
    }

    console.log('Final parsed items:', JSON.stringify(parsedItems, null, 2))
    return parsedItems
}

export async function POST(request: NextRequest) {
    try {
        const body: TranscriptionRequest = await request.json()
        const { audioBase64, keyterms, mimeType = 'audio/webm' } = body

        if (!audioBase64) {
            return NextResponse.json<TranscriptionResponse>({
                success: false,
                transcript: '',
                parsedItems: [],
                entities: [],
                error: 'No audio data provided',
            }, { status: 400 })
        }

        const apiKey = process.env.ELEVENLABS_API_KEY
        if (!apiKey) {
            return NextResponse.json<TranscriptionResponse>({
                success: false,
                transcript: '',
                parsedItems: [],
                entities: [],
                error: 'ElevenLabs API key not configured',
            }, { status: 500 })
        }

        // Convert base64 to Buffer
        const audioBuffer = Buffer.from(audioBase64, 'base64')

        // Create FormData with the audio file
        const formData = new FormData()

        // Create a Blob and append as file
        const audioBlob = new Blob([audioBuffer], { type: mimeType })
        formData.append('file', audioBlob, 'recording.webm')
        formData.append('model_id', 'scribe_v2')
        formData.append('tag_audio_events', 'true')

        // Add keyterms (up to 100)
        const limitedKeyterms = keyterms.slice(0, 100)
        limitedKeyterms.forEach(term => {
            formData.append('keyterms[]', term)
        })

        // Add entity detection
        formData.append('entity_detection[]', 'cardinal')
        formData.append('entity_detection[]', 'ordinal')
        formData.append('entity_detection[]', 'money')

        // Call ElevenLabs API directly
        const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
            },
            body: formData,
        })

        if (!response.ok) {
            const errorData = await response.text()
            console.error('ElevenLabs API error:', errorData)
            throw new Error(`API Error: ${response.status} - ${errorData}`)
        }

        const result = await response.json()
        const transcript = result.text || ''

        // Log transcript for debugging
        console.log('Transcript:', transcript)
        console.log('Raw entities:', result.entities)

        // Extract entities from the response (if available)
        const rawEntities = result.entities || []
        const entities = rawEntities.map((entity: any) => ({
            text: entity.text,
            type: entity.entity_type || entity.entityType || entity.type,
            startChar: entity.start_char || entity.startChar || 0,
            endChar: entity.end_char || entity.endChar || 0,
        }))

        // Parse the transcript to find menu items, using entities for better quantity detection
        const parsedItems = findMenuItemsInTranscript(transcript, keyterms, entities)

        return NextResponse.json<TranscriptionResponse>({
            success: true,
            transcript,
            parsedItems,
            entities,
        })

    } catch (error) {
        console.error('Transcription error:', error)
        return NextResponse.json<TranscriptionResponse>({
            success: false,
            transcript: '',
            parsedItems: [],
            entities: [],
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        }, { status: 500 })
    }
}
