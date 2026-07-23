/**
 * QueueSmart - Shared validation helpers.
 * Owner: Killian. Alan / Andres / David: use validateBody(schema) as middleware
 * instead of hand-writing if-checks.
 *
 * Rule keys:
 *   type      'string' | 'email' | 'integer' | 'number' | 'boolean' | 'enum'
 *   required  true/false        (default false)
 *   minLength / maxLength       (strings)
 *   min / max                   (numbers)
 *   values    [...]             (enum only)
 *   default   value             (used when the field is absent)
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

class ValidationError extends Error {
    constructor(fields) {
        super('Validation failed');
        this.name = 'ValidationError';
        this.status = 400;
        this.fields = fields;
    }
}

class ApiError extends Error {
    constructor(status, code, message) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
    }
}

function isMissing(value) {
    return value === undefined || value === null || value === '';
}

/** Validates one field. Returns { value }, { error } or { skip: true }. */
function checkField(name, rawValue, rule) {
  let value = rawValue;

  if (typeof value === 'string' && rule.trim !== false) {
    value = value.trim();
  }

  if (isMissing(value)) {
    if (rule.required) return { error: `${name} is required` };
    if ('default' in rule) return { value: rule.default };
    return { skip: true };
  }

  switch (rule.type) {
    case 'string':
    case 'email': {
      if (typeof value !== 'string') return { error: `${name} must be text` };
      if (rule.minLength && value.length < rule.minLength) {
        return { error: `${name} must be at least ${rule.minLength} characters` };
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        return { error: `${name} must be at most ${rule.maxLength} characters` };
      }
      if (rule.type === 'email') {
        value = value.toLowerCase();
        if (!EMAIL_RE.test(value)) return { error: `${name} must be a valid email address` };
      }
      return { value };
    }

    case 'integer':
    case 'number': {
      const num = typeof value === 'number' ? value : Number(value);
      if (Number.isNaN(num)) return { error: `${name} must be a number` };
      if (rule.type === 'integer' && !Number.isInteger(num)) {
        return { error: `${name} must be a whole number` };
      }
      if (rule.min !== undefined && num < rule.min) {
        return { error: `${name} must be at least ${rule.min}` };
      }
      if (rule.max !== undefined && num > rule.max) {
        return { error: `${name} must be at most ${rule.max}` };
      }
      return { value: num };
    }

    case 'boolean': {
      if (typeof value === 'boolean') return { value };
      if (value === 'true') return { value: true };
      if (value === 'false') return { value: false };
      return { error: `${name} must be true or false` };
    }

    case 'enum': {
      const allowed = rule.values || [];
      const lowered = typeof value === 'string' ? value.toLowerCase() : value;
      if (!allowed.includes(lowered)) {
        return { error: `${name} must be one of: ${allowed.join(', ')}` };
      }
      return { value: lowered };
    }

    default:
      return { value };
  }
}

/**
 * Validates an object against a schema.
 * Returns { valid, value, fields } where fields maps fieldName -> error message.
 */
function validate(schema, body) {
  const source = body && typeof body === 'object' ? body : {};
  const value = {};
  const fields = {};

  for (const [name, rule] of Object.entries(schema)) {
    const result = checkField(name, source[name], rule);
    if (result.error) fields[name] = result.error;
    else if (!result.skip) value[name] = result.value;
  }

  return { valid: Object.keys(fields).length === 0, value, fields };
}

/**
 * Express middleware. On success puts the cleaned data on req.data.
 * Use req.data in your handler, NOT req.body - req.data is trimmed and typed.
 *
 *   router.post('/', validateBody(createServiceSchema), (req, res) => {
 *     const { name, expectedDuration } = req.data;
 *   });
 */
function validateBody(schema) {
  return (req, res, next) => {
    const { valid, value, fields } = validate(schema, req.body);
    if (!valid) return next(new ValidationError(fields));
    req.data = value;
    next();
  };
}

module.exports = { validate, validateBody, ValidationError, ApiError, EMAIL_RE };