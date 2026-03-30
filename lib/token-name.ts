export const TOKEN_NAME_REGEX = /^[a-z][a-z0-9]*\.[a-z][a-z0-9-]*$/;

export const TOKEN_NAME_MAX_LENGTH = 49;

const RESERVED_TOKEN_SEGMENTS = new Set(["undefined", "null"]);

export const TOKEN_NAME_FORMAT_ERROR =
  "Token names must follow the format: category.descriptor (e.g. enter.default)";

export function getTokenNameValidationError(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Token name is required";
  }
  if (trimmed.length > TOKEN_NAME_MAX_LENGTH) {
    return `Token names must be ${TOKEN_NAME_MAX_LENGTH} characters or fewer`;
  }
  if (!TOKEN_NAME_REGEX.test(trimmed)) {
    return TOKEN_NAME_FORMAT_ERROR;
  }

  const [category, descriptor] = trimmed.toLowerCase().split(".");
  if (RESERVED_TOKEN_SEGMENTS.has(category) || RESERVED_TOKEN_SEGMENTS.has(descriptor)) {
    return "Token name uses a reserved segment";
  }

  return null;
}

export function createAutoTokenName(category: string, suffix?: string) {
  const safeCategory = /^[a-z][a-z0-9]*$/.test(category) ? category : "enter";
  const tail = suffix ?? Date.now().toString(36).slice(-6);
  return `${safeCategory}.token-${tail}`;
}
