import { NextRequest, NextResponse } from 'next/server';

/**
 * Google Cloud Speech-to-Text API Proxy
 * 
 * Purpose: Evaluate Korean pronunciation by sending audio to Google's Speech API
 * - API key stored server-side (.env) for security
 * - Returns recognition results + confidence scores
 * 
 * Example request:
 * POST /api/pronunciation
 * {
 *   "audio": "base64_encoded_audio",
 *   "audioFormat": "LINEAR16",
 *   "sampleRate": 16000,
 *   "language": "ko-KR"
 * }
 */

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_SPEECH_API = 'https://speech.googleapis.com/v1/speech:recognize';

/** True only when a real key is present (not the placeholder) */
const API_CONFIGURED =
  !!GOOGLE_API_KEY &&
  GOOGLE_API_KEY !== 'your_google_cloud_api_key_here' &&
  GOOGLE_API_KEY.length > 20;

export async function POST(request: NextRequest) {
  try {
    // Return a soft 200 skip when the key is not configured so the
    // client can gracefully accept the answer without a console 400 error.
    if (!API_CONFIGURED) {
      return NextResponse.json({ success: false, skip: true });
    }

    // Parse request body
    const body = await request.json();
    const { audio, audioFormat = 'LINEAR16', sampleRate = 16000, language = 'ko-KR' } = body;

    // Validate input
    if (!audio) {
      return NextResponse.json(
        { error: 'Audio data is required' },
        { status: 400 }
      );
    }

    // WEBM_OPUS / OGG_OPUS: Google Speech API derives sample-rate from the container,
    // so sampleRateHertz must be omitted (sending it causes a 400 error).
    const isContainerFormat = ['WEBM_OPUS', 'OGG_OPUS'].includes(audioFormat.toUpperCase());
    const configPayload: Record<string, unknown> = {
      encoding: audioFormat.toUpperCase(),
      languageCode: language,
      enableAutomaticPunctuation: false,
      model: 'default',
    };
    if (!isContainerFormat) {
      configPayload.sampleRateHertz = sampleRate;
    }

    // Call Google Cloud Speech-to-Text API
    const response = await fetch(`${GOOGLE_SPEECH_API}?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: configPayload,
        audio: {
          content: audio, // base64 encoded audio
        },
      }),
    });

    const data = await response.json();

    // Handle API errors
    if (!response.ok) {
      console.error('Google API error:', data);
      return NextResponse.json(
        { error: data.error?.message || 'Failed to process audio' },
        { status: response.status }
      );
    }

    // Extract results
    const results = data.results || [];
    const recognizedText = results
      .map((result: any) => result.alternatives?.[0]?.transcript || '')
      .join(' ')
      .trim();

    const confidence = results[0]?.alternatives?.[0]?.confidence || 0;

    // Return processed response
    return NextResponse.json({
      success: true,
      recognizedText,
      confidence, // 0-1 confidence score
      rawResults: results, // Full response for advanced use
    });
  } catch (error) {
    console.error('Pronunciation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
