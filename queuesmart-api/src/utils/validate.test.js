/**
 * QueueSmart - Tests for shared validation helpers. Owner: Killian.
 */
const { validate, validateBody, ValidationError, ApiError, EMAIL_RE } =
    require('./validate');

describe('validate() - required fields', () => {
    const schema = { name: { type: 'string', required: true } };

    test('accepts a present value', () => {
        const result = validate(schema, { name: 'Killian' });
        expect(result.valid).toBe(true);
        expect(result.value.name).toBe('Killian');
    });

    test('rejects a missing field', () => {
        const result = validate(schema, {});
        expect(result.valid).toBe(false);
        expect(result.fields.name).toMatch(/required/);
    });

    test('treats empty string and whitespace-only as missing', () => {
        expect(validate(schema, { name: '' }).valid).toBe(false);
        expect(validate(schema, { name: '   ' }).valid).toBe(false);
    });

    test('rejects null and handles a non-object body', () => {
        expect(validate(schema, { name: null }).valid).toBe(false);
        expect(validate(schema, undefined).valid).toBe(false);
    });

    test('optional field is omitted rather than set to undefined', () => {
        const result = validate({ note: { type: 'string' } }, {});
        expect(result.valid).toBe(true);
        expect('note' in result.value).toBe(false);
    });

    test('applies a default when the field is absent', () => {
        const result = validate(
            { role: { type: 'enum', values: ['user', 'admin'], default: 'user' } },
            {}
        );
        expect(result.value.role).toBe('user');
    });
});

describe('validate() - strings', () => {
    test('trims surrounding whitespace', () => {
        const result = validate({ name: { type: 'string' } }, { name: '  Killian  ' });
        expect(result.value.name).toBe('Killian');
    });

    test('enforces minLength and maxLength', () => {
        const schema = { name: { type: 'string', minLength: 2, maxLength: 5 } };
        expect(validate(schema, { name: 'A' }).fields.name).toMatch(/at least/);
        expect(validate(schema, { name: 'ABCDEF' }).fields.name).toMatch(/at most/);
        expect(validate(schema, { name: 'ABC' }).valid).toBe(true);
    });

    test('rejects a non-string value', () => {
        const result = validate({ name: { type: 'string' } }, { name: 42 });
        expect(result.fields.name).toMatch(/text/);
    });
});

describe('validate() - email', () => {
    test('lowercases a valid address', () => {
        const result = validate({ email: { type: 'email' } }, { email: 'A@B.COM' });
        expect(result.value.email).toBe('a@b.com');
    });

    test.each(['no-at-sign', 'a@b', 'a b@c.com', '@b.com', 'a@.com'])(
        'rejects %s',
        (bad) => {
            expect(validate({ email: { type: 'email' } }, { email: bad }).valid).toBe(false);
        }
    );

    test('EMAIL_RE is exported and usable on its own', () => {
        expect(EMAIL_RE.test('killian@uh.edu')).toBe(true);
    });
});

describe('validate() - numbers', () => {
    test('coerces a numeric string to a number', () => {
        const result = validate({ n: { type: 'integer' } }, { n: '30' });
        expect(result.value.n).toBe(30);
        expect(typeof result.value.n).toBe('number');
    });

    test('rejects non-numeric text', () => {
        expect(validate({ n: { type: 'number' } }, { n: 'abc' }).fields.n)
            .toMatch(/number/);
    });

    test('integer rejects a decimal but number accepts it', () => {
        expect(validate({ n: { type: 'integer' } }, { n: 2.5 }).fields.n)
            .toMatch(/whole number/);
        expect(validate({ n: { type: 'number' } }, { n: 2.5 }).valid).toBe(true);
    });

    test('enforces min and max', () => {
        const schema = { n: { type: 'integer', min: 1, max: 10 } };
        expect(validate(schema, { n: 0 }).fields.n).toMatch(/at least/);
        expect(validate(schema, { n: 11 }).fields.n).toMatch(/at most/);
        expect(validate(schema, { n: 5 }).valid).toBe(true);
    });
});

describe('validate() - booleans and enums', () => {
    test('accepts booleans and the strings "true"/"false"', () => {
        const schema = { flag: { type: 'boolean' } };
        expect(validate(schema, { flag: true }).value.flag).toBe(true);
        expect(validate(schema, { flag: 'true' }).value.flag).toBe(true);
        expect(validate(schema, { flag: 'false' }).value.flag).toBe(false);
        expect(validate(schema, { flag: 'yes' }).valid).toBe(false);
    });

    test('enum is case-insensitive and rejects unlisted values', () => {
        const schema = { priority: { type: 'enum', values: ['low', 'high'] } };
        expect(validate(schema, { priority: 'HIGH' }).value.priority).toBe('high');
        expect(validate(schema, { priority: 'urgent' }).fields.priority)
            .toMatch(/must be one of/);
    });
});

describe('validate() - multiple fields', () => {
    test('reports every invalid field at once, not just the first', () => {
        const schema = {
            name: { type: 'string', required: true },
            email: { type: 'email', required: true },
            age: { type: 'integer', required: true },
        };
        const result = validate(schema, { email: 'bad' });
        expect(Object.keys(result.fields).sort()).toEqual(['age', 'email', 'name']);
    });
});

describe('validateBody() middleware', () => {
    const schema = { name: { type: 'string', required: true, maxLength: 5 } };

    function run(body) {
        const req = { body };
        const next = jest.fn();
        validateBody(schema)(req, {}, next);
        return { req, next };
    }

    test('puts cleaned data on req.data and calls next with no error', () => {
        const { req, next } = run({ name: '  Kil  ' });
        expect(req.data).toEqual({ name: 'Kil' });
        expect(next).toHaveBeenCalledWith();
    });

    test('does not mutate req.body', () => {
        const { req } = run({ name: '  Kil  ' });
        expect(req.body.name).toBe('  Kil  ');
    });

    test('passes a ValidationError to next on bad input', () => {
        const { req, next } = run({ name: 'TooLongName' });
        const err = next.mock.calls[0][0];
        expect(err).toBeInstanceOf(ValidationError);
        expect(err.status).toBe(400);
        expect(err.fields.name).toMatch(/at most/);
        expect(req.data).toBeUndefined();
    });
});

describe('error classes', () => {
    test('ValidationError carries status 400 and a fields map', () => {
        const err = new ValidationError({ email: 'bad' });
        expect(err.name).toBe('ValidationError');
        expect(err.status).toBe(400);
        expect(err.fields).toEqual({ email: 'bad' });
        expect(err).toBeInstanceOf(Error);
    });

    test('ApiError carries status, code and message', () => {
        const err = new ApiError(404, 'NOT_FOUND', 'Service not found');
        expect(err.name).toBe('ApiError');
        expect(err.status).toBe(404);
        expect(err.code).toBe('NOT_FOUND');
        expect(err.message).toBe('Service not found');
    });
});
