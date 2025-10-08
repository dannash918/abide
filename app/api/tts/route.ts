import { NextRequest, NextResponse } from 'next/server'
import { PollyClient, SynthesizeSpeechCommand, VoiceId } from '@aws-sdk/client-polly'

export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get('text')
  const provider = request.nextUrl.searchParams.get('provider') || 'elevenlabs'
  const rate = parseFloat(request.nextUrl.searchParams.get('rate') || '0.8') // Default speed like ElevenLabs

  if (!text) {
    return NextResponse.json({ error: 'Text parameter required' }, { status: 400 })
  }

  if (provider === 'polly') {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
    const region = process.env.AWS_REGION || 'us-east-1'

    if (!accessKeyId || !secretAccessKey) {
      return NextResponse.json({ error: 'AWS credentials not configured' }, { status: 500 })
    }

    try {
      const pollyClient = new PollyClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      })

      const voiceId = (process.env.AWS_POLLY_VOICE_ID || 'Ruth') as VoiceId // Default: Joanna voice

      const command = new SynthesizeSpeechCommand({
        Text: text,
        OutputFormat: 'mp3',
        VoiceId: voiceId,
        Engine: 'long-form',
      })

      const response = await pollyClient.send(command)

      if (!response.AudioStream) {
        return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 })
      }

      // Convert the AudioStream to bytes
      const audioBuffer = await response.AudioStream.transformToByteArray()
      const buffer = Buffer.from(audioBuffer)

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
        },
      })
    } catch (error) {
      console.error('Polly API error:', error)
      return NextResponse.json({ error: 'Failed to generate audio with Polly' }, { status: 500 })
    }
  } else {
    // Default to ElevenLabs
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY
    if (!elevenlabsApiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 })
    }

    try {
      // Using a default voice ID - replace with your preferred voice
      const voiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB' // Default: Adam voice

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=0`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': elevenlabsApiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            // style: 0.5,
            use_speaker_boost: true,
            speed: 0.8,
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
