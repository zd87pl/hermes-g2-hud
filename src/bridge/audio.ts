/** Audio bridge — captures mic input from G2 for voice commands */
import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk';

let bridge: Awaited<ReturnType<typeof waitForEvenAppBridge>> | null = null;
let recording = false;
let audioChunks: Uint8Array[] = [];
let levelCallback: ((level: number) => void) | null = null;

/** Initialize audio bridge */
export async function initAudio(): Promise<void> {
  bridge = await waitForEvenAppBridge();
}

/** Start capturing microphone audio */
export async function startRecording(
  onLevel?: (level: number) => void
): Promise<void> {
  if (!bridge || recording) return;

  audioChunks = [];
  levelCallback = onLevel || null;
  recording = true;

  bridge.onEvenHubEvent((event) => {
    if (!recording) return;
    const audio = event.audioEvent;
    if (!audio?.data) return;

    audioChunks.push(new Uint8Array(audio.data));

    if (levelCallback && audio.data.length > 0) {
      // Simple RMS level calculation
      let sum = 0;
      for (let i = 0; i < audio.data.length; i += 2) {
        const sample = (audio.data[i + 1] << 8) | audio.data[i];
        sum += sample * sample;
      }
      const rms = Math.sqrt(sum / (audio.data.length / 2));
      levelCallback(Math.min(rms / 32768, 1));
    }
  });

  await bridge.audioControl(true);
}

/** Stop capturing and return PCM audio data */
export async function stopRecording(): Promise<Uint8Array> {
  if (!bridge || !recording) return new Uint8Array(0);

  recording = false;
  await bridge.audioControl(false);

  // Concatenate all chunks
  const totalLength = audioChunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of audioChunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  audioChunks = [];
  return result;
}

/** Check if currently recording */
export function isRecording(): boolean {
  return recording;
}

/** Get approximate audio level (0–1) */
export function getLevel(): number {
  // Simple level meter from last chunk
  const last = audioChunks[audioChunks.length - 1];
  if (!last || last.length === 0) return 0;

  let sum = 0;
  for (let i = 0; i < last.length; i += 2) {
    const sample = (last[i + 1] << 8) | last[i];
    sum += sample * sample;
  }
  return Math.min(Math.sqrt(sum / (last.length / 2)) / 32768, 1);
}
