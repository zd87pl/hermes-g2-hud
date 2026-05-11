/**
 * Quick Commands screen — predefined Hermes commands + voice input.
 * Lines: header, command items, voice status.
 */
import { ICONS } from '../utils/constants';
import { truncate } from '../utils/text-formatter';
import { QUICK_COMMANDS } from '../services';
import type { HermesCommand } from '../types';

export interface QuickCmdData {
  selectedIndex: number;
  totalCommands: number;
  lastResult?: string;
  recording: boolean;
}

const DISPLAY_ITEMS = 3; // Items per page (line 1 = header)

export function renderQuickCmd(data: QuickCmdData): string[] {
  const lines: string[] = [];

  // Line 1: Header
  const recIcon = data.recording ? '🔴' : '⏺';
  lines.push(`COMMANDS  ${recIcon}  [tap to send, dbl=back, scroll=select]`);

  // Get visible slice based on selected index
  const pageStart = Math.floor(data.selectedIndex / DISPLAY_ITEMS) * DISPLAY_ITEMS;
  const visible = QUICK_COMMANDS.slice(pageStart, pageStart + DISPLAY_ITEMS);

  for (let i = 0; i < visible.length; i++) {
    const cmd = visible[i];
    const idx = pageStart + i;
    const cursor = idx === data.selectedIndex ? '>' : ' ';
    lines.push(`${cursor} ${truncate(cmd.label, 40)}`);
  }

  // Fill remaining with blanks if needed
  while (lines.length < 4) lines.push('');

  return lines;
}
