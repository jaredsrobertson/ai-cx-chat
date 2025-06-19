let currentAudio = null;

/**
 * Fetches audio from the TTS API and plays it.
 * @param {string} text The text to convert to speech.
 */
export async function speakText(text) {
  // If there's audio currently playing, stop it
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }

  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch TTS audio');
    }

    // Get the audio data as a blob and create an object URL
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    // Create and play the new audio
    currentAudio = new Audio(url);
    currentAudio.play();

    // Clean up the object URL after the audio finishes playing
    currentAudio.onended = () => {
      URL.revokeObjectURL(url);
      currentAudio = null;
    };

  } catch (error) {
    console.error("Error playing TTS:", error);
  }
}