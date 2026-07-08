// Required field validator
export function required(value, fieldName = "This field") {
  if (value === null || value === undefined || String(value).trim() === "") {
    return `${fieldName} is required.`;
  }
  return "";
}

// Email format validator
export function email(value) {
  if (String(value).trim() === "") {
    return "Email is required.";
  }

  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!pattern.test(value)) {
    return "Enter a valid email address.";
  }
  return "";
}

// Max length validation
export function maxLength(value, max, fieldName = "This field") {
  if (String(value).length > max) {
    return `${fieldName} must be ${max} characters or fewer.`;
  }
  return "";
}

// Min length validation (passwords)
export function minLength(value, min, fieldName = "This field") {
  if (String(value).length < min) {
    return `${fieldName} must be at least ${min} characters.`;
  }
  return "";
}

// Number validation - fails if not a valid number or is negative
export function isNumber(value, fieldName = "This field") {
  if (String(value).trim() === "") {
    return `${fieldName} is required.`;
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    return `${fieldName} must be a number.`;
  }
  if (num < 0) {
    return `${fieldName} cannot be negative.`;
  }
  return "";
}

// Confirm matching
export function matches(value, otherValue, fieldName = "Values") {
  if (value !== otherValue) {
    return `${fieldName} do not match.`;
  }
  return "";
}

// Runs multiple validators and returns the first error message found, or an empty string if all pass
export function firstError(...checks) {
  for (const check of checks) {
    const result = check();
    if (result) return result;
  }
  return "";
}
