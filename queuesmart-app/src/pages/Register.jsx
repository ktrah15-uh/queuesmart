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

    const navigate = useNavigate();

    function handleSubmit(event) {
        event.preventDefault();

        const nameError = required(name, "Full name");
        const emailError = validateEmail(emailValue);

        const passwordError = firstError(
            () => required(password, "Password"),
            () => minLength(password, 6, "Password")
        );

        const confirmError = matches(confirmPassword, password, "Passwords");

        setErrors({
            name: nameError,
            email: emailError,
            password: passwordError,
            confirmPassword: confirmError,
        });

        if (
            nameError === "" &&
            emailError === "" &&
            passwordError === "" &&
            confirmError === ""
        ) {
            alert("Registration successful (mock).");
            navigate("/login");
        }
    }

    return (
        <div style={{ maxWidth: "400px", margin: "0 auto" }}>
            <h1>Create Account</h1>

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
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={errors.confirmPassword}
                    placeholder="Re-enter your password"
                />

                <Button type="submit">Create Account</Button>
            </form>

            <p style={{ marginTop: "var(--space-md)", color: "var(--color-text-muted)" }}>
                Already have an account? <Link to="/login">Log in here</Link>.
            </p>
        </div>
    );
}

export default Register;