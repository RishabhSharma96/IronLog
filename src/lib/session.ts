export function sanitizeUsername(input: string) {
  return input.trim().toLowerCase();
}

export function isValidUsername(input: string) {
  return /^[a-z0-9_\-.]{3,24}$/.test(input);
}
