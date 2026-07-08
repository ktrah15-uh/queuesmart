import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import FormInput from "../components/FormInput";
import Button from "../components/Button";
import { email as validateEmail, required } from "../validation/validators";

function Login() {
  const [emailValue, setEmailValue] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState({ email: "", password: "" });

  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault();

    const emailError = validateEmail(emailValue);
    const passwordError = required(password, "Password");

    setErrors({ email: emailError, password: passwordError });

    if (emailError === "" && passwordError === "") {
        alert("Login successful (mock).");
      navigate("/");
    }
  }

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto" }}>
      <h1>Log In</h1>

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

        <Button type="submit">Log In</Button>
      </form>

      <p style={{ marginTop: "var(--space-md)", color: "var(--color-text-muted)" }}>
        Don't have an account? <Link to="/register">Register here</Link>.
      </p>
    </div>
  );
}

export default Login;