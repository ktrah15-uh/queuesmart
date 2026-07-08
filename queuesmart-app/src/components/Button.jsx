import "./Button.css";

// Reusable button to be used across the whole app
// `variant` prop allows for different button styles (e.g., primary, secondary, etc.)
function Button({ children, variant = "primary", ...rest }) {
    return (
        <button className={`btn btn-${variant}`} {...rest}>
            {children}
        </button>
    );
}

export default Button;