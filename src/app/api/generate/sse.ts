/**
 * Encodes a Server-Sent Events message.
 *
 * Format:
 *   event: <eventType>\n
 *   data: <JSON>\n
 *   \n
 */
export function sseEncode(eventType: string, data: object): string {
  return `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
}
