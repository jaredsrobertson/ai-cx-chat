export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
    }

    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ success: false, error: 'Text is required' });
    }

    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
        console.error('ElevenLabs API key not configured.');
        return res.status(500).json({ success: false, error: 'TTS service is not configured.' });
    }
    
    const voiceId = '21m00Tcm4TlvDq8ikWAM'; // Voice: Rachel
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=4`;

    try {
        const apiResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': elevenLabsApiKey,
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_flash_v2_5', // A fast, high-quality model
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }),
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.json();
            console.error('ElevenLabs API Error:', errorBody);
            return res.status(apiResponse.status).json({ success: false, error: 'Failed to generate audio from TTS service.' });
        }

        res.setHeader('Content-Type', 'audio/mpeg');
        
        // Correctly read from the ReadableStream and write to the Next.js response
        const reader = apiResponse.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            res.write(value);
        }
        res.end();

    } catch (error) {
        console.error('Error in TTS API handler:', error);
        res.status(500).json({ success: false, error: 'Internal server error while streaming audio.' });
    }
}