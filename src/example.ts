type ValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateUser(name: string): ValidationResult {
  if (!name || name.trim().length < 3) {
    return {
      valid: false,
      error: "Name must be at least 3 characters"
    };
  }

  return { valid: true };
}
