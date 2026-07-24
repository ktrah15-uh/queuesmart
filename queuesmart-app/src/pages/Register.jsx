import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import FormInput from "../components/FormInput";
import Button from "../components/Button";
import {
    email as validateEmail,
    required,
    minLength,
    matches,
    firstError,
} from "../validation/validators";
import { useAuth } from "../contexts/AuthContext";

function Register() {
    const [name, setName] = useState("");
    const [emailValue, setEmailValue] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [errors, setErrors] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(event) {
        event.preventDefault();
        setFormError("");

        const nameError = firstError(
            () => required(name, "Full name"),
            () => minLength(name, 2, "Full name")
        );
        const emailError = validateEmail(emailValue);
        const passwordError = firstError(
            () => required(password, "Password"),
            () => minLength(password, 8, "Password")
        );
        const confirmError = matches(confirmPassword, password, "Passwords");

        setErrors({
            name: nameError,
            email: emailError,
            password: passwordError,
            confirmPassword: confirmError,
        });

        if (nameError || emailError || passwordError || confirmError) return;

        setSubmitting(true);
        try {
            await register(name, emailValue, password);
            navigate("/");
        } catch (err) {
            if (err.code === "VALIDATION_ERROR") {
                setErrors((prev) => ({
                    ...prev,
                    name: err.fields.name || "",
                    email: err.fields.email || "",
                    password: err.fields.password || "",
                }));
            } else if (err.code === "EMAIL_TAKEN") {
                setErrors((prev) => ({
                    ...prev,
                    email: "An account with this email already exists.",
                }));
            } else {
                setFormError("Could not reach the server. Is the backend running?");
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div style={{ maxWidth: "400px", margin: "0 auto" }}>
            <h1>Create Account</h1>

            {formError && (
                <p style={{ color: "var(--color-danger, #c00)" }} role="alert">
                    {formError}
                </p>
            )}

            <form onSubmit={handleSubmit} noValidate>
                <FormInput
                    label="Full Name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    error={errors.name}
                    placeholder="Your full name"
                />

                <FormInput
                    label="Email"
                    type="email"
                    value={emailValue}
                    onChange={(e) => setEmailValue(e.target.value)}
                    error={errors.email}
                    placeholder="you@example.com"
                />

                <FormInput
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={errors.password}
                    placeholder="At least 8 characters"
                />

                <FormInput
                    label="Confirm Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={errors.confirmPassword}
                    placeholder="Re-enter your password"
                />

                <Button type="submit" disabled={submitting}>
                    {submitting ? "Creating account…" : "Create Account"}
                </Button>
            </form>

            <p style={{ marginTop: "var(--space-md)", color: "var(--color-text-muted)" }}>
                Already have an account? <Link to="/login">Log in here</Link>.
            </p>
        </div>
    );
}

export default Register;