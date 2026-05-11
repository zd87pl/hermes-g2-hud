/** Display bridge — renders text to G2 display containers */
import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk';
import { DISPLAY } from '../utils/constants';

/** Max 4 text containers on G2 display */
const MAX_LINES = DISPLAY.MAX_TEXT_CONTAINERS;

let bridge: Awaited<ReturnType<typeof waitForEvenAppBridge>> | null = null;

/** Initialize the display bridge */
export async function initDisplay(): Promise<void> {
  bridge = await waitForEvenAppBridge();
}

/** Render 1–4 lines of text to the G2 display containers */
export async function render(lines: string[]): Promise<void> {
  if (!bridge) return;

  const displayLines = lines.slice(0, MAX_LINES);
  while (displayLines.length < MAX_LINES) {
    displayLines.push('');
  }

  for (let i = 0; i < MAX_LINES; i++) {
    try {
      await bridge.setTextContainer(i, displayLines[i] || ' ');
    } catch {
      // Container may not exist yet — skip
    }
  }
}

/** Clear all display containers */
export async function clear(): Promise<void> {
  await render(['', '', '', '']);
}

/** Show a single notification line briefly */
export async function notify(line: string): Promise<void> {
  await render([line, '', '', '']);
}
