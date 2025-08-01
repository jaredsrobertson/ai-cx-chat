import { createApiHandler, createStandardResponse } from '@/lib/apiUtils';
import { logger } from '@/lib/logger';
import { CONFIG } from '@/lib/config';

const ttsHandler = async (req, res) => {
    const { text } = req.body;

    if (!text) {
        return res.status(400).json(createStandardResponse(false, null, 'Text is required'));
    }

    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
        logger.error('ElevenLabs API key not configured.');
        return res.status(500).json(createStandardResponse(false, null, 'TTS service is not configured.'));
    }
    
    const voiceId = CONFIG.TTS.VOICE_ID;
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
                model_id: CONFIG.TTS.MODEL,
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }),
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.json();
            logger.error('ElevenLabs API Error:', errorBody);
            return res.status(apiResponse.status).json(createStandardResponse(false, null, 'Failed to generate audio from TTS service.'));
        }

        res.setHeader('Content-Type', 'audio/mpeg');
        
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
        logger.error('Error in TTS API handler:', error);
        res.status(500).json(createStandardResponse(false, null, 'Internal server error while streaming audio.'));
    }
};

export default createApiHandler(ttsHandler, {
  allowedMethods: ['POST'],
});