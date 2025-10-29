import { NextRequest, NextResponse } from 'next/server'
import { PollyClient, SynthesizeSpeechCommand, VoiceId } from '@aws-sdk/client-polly'

const POLLY_VOICES = {
  polly: { voiceId: 'Ruth', engine: 'generative' as const },
  danielle: { voiceId: 'Danielle', engine: 'generative' as const },
  patrick: { voiceId: 'Patrick', engine: 'long-form' as const },
  stephen: { voiceId: 'Stephen', engine: 'generative' as const },
} as const

function addLordsPrayerPauses(text: string): string {
  // Check if this is the Lord's Prayer by looking for key phrases
  if (text.includes('Our Father') && text.includes('hallowed be') && text.includes('Amen.')) {
    // Replace full stops with SSML break tags followed by a space
    // This adds 1-second pauses after full stops in the Lord's Prayer
    return text.replace(/\./g, '.<break time=".7s"/> ')
  }
  return text
}

async function handlePollyTTS(text: string, provider: string, type?: string) {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  const region = process.env.AWS_REGION || 'us-east-1'

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials not configured')
  }

  const voiceConfig = POLLY_VOICES[provider as keyof typeof POLLY_VOICES]
  if (!voiceConfig) {
    throw new Error(`Unsupported Polly provider: ${provider}`)
  }

  const pollyClient = new PollyClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  })

  // Add pauses for Lord's Prayer
  const processedText = addLordsPrayerPauses(text)

  const ssmlText = `<speak><prosody rate="90%" volume="soft">${processedText}</prosody></speak>`

  const command = new SynthesizeSpeechCommand({
    Text: ssmlText,
    OutputFormat: 'mp3',
    VoiceId: voiceConfig.voiceId as VoiceId,
    Engine: voiceConfig.engine,
    TextType: 'ssml',
    SpeechMarkTypes: [],
  })

  const response = await pollyClient.send(command)
  if (!response.AudioStream) {
    throw new Error('Failed to generate audio')
  }

  const audioBuffer = await response.AudioStream.transformToByteArray()
  return Buffer.from(audioBuffer)
}

export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get('text')
  const provider = request.nextUrl.searchParams.get('provider') || 'rachel'
  const type = request.nextUrl.searchParams.get('type') // generative or long-form

  if (!text) {
    return NextResponse.json({ error: 'Text parameter required' }, { status: 400 })
  }

  if (provider === 'screenReader') {
    // Screen reader is handled on the frontend, return empty response
    return new NextResponse(new Uint8Array(0), {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    })
  }

  // Handle AWS Polly voices
  if (provider === 'polly' || provider === 'danielle' || provider === 'patrick' || provider === 'stephen') {
    try {
      const buffer = await handlePollyTTS(text, provider, type || undefined)
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
        },
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Polly API error:', errorMessage)
      return NextResponse.json({ error: 'Failed to generate audio with Polly' }, { status: 500 })
    }
  }

  // Handle ElevenLabs TTS
  if (provider === 'rachel' || provider === 'maysie') {
    // Default to ElevenLabs
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY
    if (!elevenlabsApiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 })
    }

    try {
      // Select voice based on provider
      let voiceId: string
      let modelId : string = "eleven_multilingual_v2"
      if (provider === 'maysie') {
        voiceId = 'QPBKI85w0cdXVqMSJ6WB' // Maysie voice ID
        modelId = "eleven_multilingual_v2"
      } else {
        voiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB' // Default: Adam voice for Rachel
      }

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=0`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': elevenlabsApiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: modelId,
          // Tweak voice settings to favour a calm, soft, slower delivery
          voice_settings: {
            stability: 0.95,
            similarity_boost: 0.4,
            style: 0.2,
            use_speaker_boost: false,
            speed: 0.75,
          }
        })
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('ElevenLabs API error:', error)
        return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 })
      }

      const audioBlob = await response.blob()

      return new NextResponse(audioBlob, {
        headers: {
          'Content-Type': 'audio/mpeg',
        },
      })
    } catch (error) {
      console.error('TTS API error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
