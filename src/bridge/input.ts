/** Input bridge — translates G2 touch events to app actions */
import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk';
import { InputAction } from '../utils/constants';

export type InputHandler = (action: InputAction) => void;

let bridge: Awaited<ReturnType<typeof waitForEvenAppBridge>> | null = null;
let handler: InputHandler | null = null;

/** Initialize input bridge and register handler */
export async function initInput(onInput: InputHandler): Promise<void> {
  bridge = await waitForEvenAppBridge();
  handler = onInput;

  bridge.onEvenHubEvent((event) => {
    if (!handler) return;

    const txt = event.textEvent;
    if (!txt) return;

    // Map text event types to input actions
    if (txt.name === 'click') {
      handler(InputAction.TAP);
    } else if (txt.name === 'doubleClick') {
      handler(InputAction.DOUBLE_TAP);
    } else if (txt.name === 'scrollDown') {
      handler(InputAction.SCROLL_DOWN);
    } else if (txt.name === 'scrollUp') {
      handler(InputAction.SCROLL_UP);
    }
  });
}

/** Set a new input handler (for screen transitions) */
export function setHandler(onInput: InputHandler): void {
  handler = onInput;
}
