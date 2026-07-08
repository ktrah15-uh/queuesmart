import "./FormInput.css";

function FormInput({ label, type = "text", value, onChange, error, ...rest }) {
  return (
    <div className="form-input">
      <label className="form-input-label">{label}</label>
      <input
        className={`form-input-field ${error ? "form-input-error" : ""}`}
        type={type}
        value={value}
        onChange={onChange}
        {...rest}
      />
      {error && <span className="form-input-message">{error}</span>}
    </div>
  );
}

export default FormInput;