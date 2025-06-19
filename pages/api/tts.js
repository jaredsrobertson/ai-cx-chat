export default async function handler(req, res) {
  const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
  if (!elevenLabsApiKey) {
    console.error('ElevenLabs API key not configured.');
    return res.status(500).json({ error: 'TTS service not configured.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Voice: Rachel
    // Add the latency optimization parameter to the URL
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=4`;

    const headers = {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': elevenLabsApiKey,
    };

    const body = JSON.stringify({
      text: text,
      model_id: 'eleven_flash_v2_5',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    });

    const response = await fetch(url, { method: 'POST', headers, body });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error('ElevenLabs API Error:', errorBody);
      return res.status(response.status).json({ error: 'Failed to generate speech from provider.' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    
    // Pipe the audio stream to the response
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();

  } catch (error) {
    console.error('TTS API Error:', error);
    res.status(500).json({ error: 'Failed to generate speech.' });
  }
}