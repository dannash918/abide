import { NextRequest, NextResponse } from 'next/server'

const ELEVEN_BASE = 'https://api.elevenlabs.io'

function findNumericValue(obj: any): number | null {
  if (obj == null) return null
  if (typeof obj === 'number' && !Number.isNaN(obj)) return obj
  if (typeof obj !== 'object') return null

  for (const key of Object.keys(obj)) {
    const val = obj[key]
    if (typeof val === 'number' && !Number.isNaN(val)) return val
    if (typeof val === 'string' && /^\d+(\.\d+)?$/.test(val)) return Number(val)
    if (typeof val === 'object') {
      const nested = findNumericValue(val)
      if (nested !== null) return nested
    }
  }
  return null
}

export async function GET(req: NextRequest) {
  const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY
  if (!elevenlabsApiKey) {
    return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 })
  }

  console.log('[ElevenLabs] token check requested')

  // Call the subscription endpoint which returns character_count and character_limit
  const path = '/v1/user/subscription'
  try {
    console.log(`[ElevenLabs] fetching ${path}`)
    const res = await fetch(`${ELEVEN_BASE}${path}`, {
      headers: {
        'xi-api-key': elevenlabsApiKey,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      console.log(`[ElevenLabs] ${path} returned status ${res.status}`)
      return NextResponse.json({ tokensLeft: null })
    }

    const json = await res.json()

    const count = typeof json.character_count === 'number' ? json.character_count : (typeof json.character_count === 'string' && /^\d+$/.test(json.character_count) ? Number(json.character_count) : null)
    const limit = typeof json.character_limit === 'number' ? json.character_limit : (typeof json.character_limit === 'string' && /^\d+$/.test(json.character_limit) ? Number(json.character_limit) : null)

    if (count !== null && limit !== null) {
      const remaining = Math.max(0, limit - count)
      console.log(`[ElevenLabs] subscription: count=${count}, limit=${limit}, remaining=${remaining}`)
      // Also print a clear line with the number of characters left for easy scanning
      console.log(`[ElevenLabs] characters left: ${remaining}`)
      return NextResponse.json({ tokensLeft: remaining, character_count: count, character_limit: limit })
    }

    console.log('[ElevenLabs] subscription endpoint did not include numeric character_count/character_limit')
    return NextResponse.json({ tokensLeft: null })
  } catch (e) {
    console.log(`[ElevenLabs] ${path} request failed: ${String(e)}`)
    return NextResponse.json({ tokensLeft: null })
  }
}
