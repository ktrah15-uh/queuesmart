import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import FormInput from "../components/FormInput";
import Button from "../components/Button";
import { email as validateEmail, required } from "../validation/validators";
import { useAuth } from "../contexts/AuthContext";

function Login() {
    const [emailValue, setEmailValue] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState({ email: "", password: "" });
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(event) {
        event.preventDefault();
        setFormError("");

        const emailError = validateEmail(emailValue);
        const passwordError = required(password, "Password");
        setErrors({ email: emailError, password: passwordError });

        if (emailError !== "" || passwordError !== "") return;

        setSubmitting(true);
        try {
            await login(emailValue, password);
            navigate("/");
        } catch (err) {
            if (err.code === "VALIDATION_ERROR") {
                setErrors({
                    email: err.fields.email || "",
                    password: err.fields.password || "",
                });
            } else if (err.code === "INVALID_CREDENTIALS") {
                setFormError("Email or password is incorrect.");
            } else {
                setFormError("Could not reach the server. Is the backend running?");
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div style={{ maxWidth: "400px", margin: "0 auto" }}>
            <h1>Log In</h1>

            {formError && (
                <p style={{ color: "var(--color-danger, #c00)" }} role="alert">
                    {formError}
                </p>
            )}

            <form onSubmit={handleSubmit} noValidate>
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
                    placeholder="Your password"
                />

                <Button type="submit" disabled={submitting}>
                    {submitting ? "Logging in…" : "Log In"}
                </Button>
            </form>

            <p style={{ marginTop: "var(--space-md)", color: "var(--color-text-muted)" }}>
                Don't have an account? <Link to="/register">Register here</Link>.
            </p>
        </div>
    );
}

export default Login;