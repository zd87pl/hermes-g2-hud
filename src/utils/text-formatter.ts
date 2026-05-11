import { DISPLAY } from './constants';

/** Truncate text to fit display width */
export function truncate(text: string, maxLen: number = DISPLAY.CHARS_PER_LINE): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

/** Pad text to exact width for alignment */
export function padRight(text: string, width: number): string {
  if (text.length >= width) return text;
  return text + ' '.repeat(width - text.length);
}

/** Format a progress bar: "████████░░ 80%" */
export function progressBar(
  percent: number,
  width: number = 20
): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percent}%`;
}

/** Format a single line with label and value */
export function kvLine(
  label: string,
  value: string,
  labelWidth: number = 10
): string {
  return padRight(label, labelWidth) + ' ' + value;
}

/** Format timestamp for display */
export function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Wrap multiline text to display width */
export function wrapText(text: string): string[] {
  const lines: string[] = [];
  for (const line of text.split('\n')) {
    if (line.length <= DISPLAY.CHARS_PER_LINE) {
      lines.push(line);
    } else {
      for (let i = 0; i < line.length; i += DISPLAY.CHARS_PER_LINE) {
        lines.push(line.slice(i, i + DISPLAY.CHARS_PER_LINE));
      }
    }
  }
  return lines;
}
