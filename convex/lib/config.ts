/**
 * Parse-guard for app instance configJson.
 *
 * configJson is stored as a JSON string (v.string() in schema). Callers that
 * need the parsed object should use this helper rather than bare JSON.parse —
 * it throws a descriptive error on malformed input instead of a confusing
 * "Unexpected token" message.
 */
export function parseConfigJson(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    throw new Error(`Invalid configJson: expected JSON string, got unparseable value`);
  }
}
