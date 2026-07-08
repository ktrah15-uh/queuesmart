# Shared Components & Helpers — How to Use Them

This app has shared pieces so we don't each rebuild buttons, inputs, and
validation. Please use these instead of writing your own. Questions → ask Killian.

## Design tokens (colors, spacing, fonts)

Defined in `src/styles/tokens.css` and available everywhere automatically.
Use them in any CSS file with `var(--token-name)`:

```css
.my-thing {
  color: var(--color-primary);      /* brand red */
  padding: var(--space-md);         /* 16px */
  border-radius: var(--radius);
}
```

Common ones: `--color-primary`, `--color-primary-dark`, `--color-text`,
`--color-text-muted`, `--color-surface`, `--color-border`, `--color-error`,
`--color-success`, `--color-warning`, `--color-navy`.
Spacing: `--space-xs / sm / md / lg / xl`. Please don't hardcode hex colors or
pixel values — use tokens so the app stays consistent.

## Button

```jsx
import Button from "../components/Button";

<Button onClick={handleClick}>Save</Button>
<Button variant="secondary">Cancel</Button>
<Button type="submit">Submit</Button>
<Button disabled>Can't click</Button>
```

`variant` is `"primary"` (default) or `"secondary"`. Any other prop
(`onClick`, `type`, `disabled`) is forwarded to the real button.

## FormInput (labeled input with built-in error display)

```jsx
import FormInput from "../components/FormInput";

<FormInput
  label="Service Name"
  type="text"                 // text | email | password | number
  value={name}                // from your useState
  onChange={(e) => setName(e.target.value)}
  error={errors.name}         // error string, or "" for no error
  placeholder="e.g. Advising"
/>
```

The error message shows automatically when `error` is a non-empty string,
and the input border turns red. Pass `""` and it looks normal.

## Validation helpers

Import from `src/validation/validators.js`. **Every helper returns an error
message string if invalid, or `""` (empty string) if valid.** So a truthy
return = show the error; `""` = the field is fine.

```jsx
import {
  required, email, maxLength, minLength, isNumber, matches, firstError,
} from "../validation/validators";
```

| Helper | Use for | Example |
|--------|---------|---------|
| `required(value, "Name")` | non-empty fields | `required(desc, "Description")` |
| `email(value)` | email format | `email(emailValue)` |
| `maxLength(value, 100, "Name")` | length caps | service name max 100 chars |
| `minLength(value, 6, "Password")` | minimum length | passwords |
| `isNumber(value, "Duration")` | numeric fields | duration in minutes |
| `matches(a, b, "Passwords")` | two fields equal | confirm password |
| `firstError(...checks)` | run several checks, return first failure | see below |

### Running multiple checks on one field

```jsx
// e.g. service name: required AND max 100 chars
const nameError = firstError(
  () => required(name, "Service name"),
  () => maxLength(name, 100, "Service name")
);
```

## The standard form pattern (copy this shape for any form)

1. One `useState("")` per field.
2. An `errors` state object with one key per field.
3. In your submit handler: call `event.preventDefault()`, run a validator per
   field, `setErrors({...})` with the results, then only proceed if every
   error is `""`.
4. One `<FormInput>` per field, wired to its state and error.

Working examples: see `src/pages/Login.jsx` (simple) and
`src/pages/Register.jsx` (four fields, uses `firstError` and `matches`).
Copy whichever is closest to what you're building.

## Adding a new page/route

Your page files live in `src/pages/`. Routes are defined in `src/App.jsx`.
Your stub pages already exist and are already routed — just fill in the
component. Nav links are in `src/components/Navbar.jsx` if you need to add one.