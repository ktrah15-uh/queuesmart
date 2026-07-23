import { useState } from "react";
import Button from "../components/Button";
import FormInput from "../components/FormInput";
import { required, maxLength, isNumber, firstError } from "../validation/validators";

function ServiceManagement() {
  const [services, setServices] = useState([
    { id: 1, name: "General Consultation", description: "Standard meeting with a consultant.", duration: 30, priority: "medium" },
    { id: 2, name: "Urgent Support", description: "Immediate assistance for critical issues.", duration: 15, priority: "high" }
  ]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration: "",
    priority: "low"
  });

  const [errors, setErrors] = useState({
    name: "",
    description: "",
    duration: ""
  });
  const [editingId, setEditingId] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();

    const nameError = firstError(
      () => required(formData.name, "Service Name"),
      () => maxLength(formData.name, 100, "Service Name")
    );

    const descriptionError = required(formData.description, "Description");
    const durationError = isNumber(formData.duration, "Expected Duration");

    setErrors({ name: nameError, description: descriptionError, duration: durationError });

    if (!nameError && !descriptionError && !durationError) {
      if (editingId) {
        setServices(services.map(s => s.id === editingId ? { ...formData, id: editingId, duration: Number(formData.duration) } : s));
        setEditingId(null);
      } else {
        setServices([...services, { ...formData, id: Date.now(), duration: Number(formData.duration) }]);
      }
      setFormData({ name: "", description: "", duration: "", priority: "low" });
    }
  };

  const handleEdit = (service) => {
    setFormData({ ...service });
    setEditingId(service.id);
    setErrors({ name: "", description: "", duration: "" });
  };

  const handleDelete = (id) => {
    setServices(services.filter(s => s.id !== id));
  };

  const cancelEdit = () => {
    setFormData({ name: "", description: "", duration: "", priority: "low" });
    setEditingId(null);
    setErrors({ name: "", description: "", duration: "" });
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-lg)", borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--space-md)" }}>
        <h1>Service Management</h1>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-lg)" }}>

        {/* FORM SECTION */}
        <div style={{ flex: "1 1 300px", padding: "var(--space-md)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)" }}>
          <h2>{editingId ? "Edit Service" : "Create Service"}</h2>
          <form onSubmit={handleSubmit} noValidate>

            <FormInput
              label="Service Name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              placeholder="e.g., IT Support"
            />

            <div className="form-input">
              <label className="form-input-label">Description</label>
              <textarea
                className={`form-input-field ${errors.description ? "form-input-error" : ""}`}
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Briefly describe the service..."
                style={{ resize: "vertical" }}
              />
              {errors.description && <span className="form-input-message">{errors.description}</span>}
            </div>

            <FormInput
              label="Expected Duration (mins)"
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              error={errors.duration}
              placeholder="e.g., 30"
            />

            <div className="form-input">
              <label className="form-input-label">Priority Level</label>
              <select
                className="form-input-field"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "var(--space-md)" }}>
              {editingId && (
                <Button type="button" variant="secondary" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
              <Button type="submit">
                {editingId ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </div>

        {/* LIST SECTION */}
        <div style={{ flex: "1 1 350px", padding: "var(--space-md)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)" }}>
          <h2>Active Services</h2>
          {services.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)" }}>No services available.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              {services.map(service => (
                <div key={service.id} style={{ padding: "var(--space-md)", background: "var(--color-surface)", borderRadius: "var(--radius)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px 0" }}>{service.name}</h3>
                    <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>{service.duration} mins</p>
                    <span style={{ fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", color: service.priority === "high" ? "var(--color-error)" : service.priority === "medium" ? "var(--color-warning)" : "var(--color-text-muted)" }}>
                      {service.priority} Priority
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-xs)", flexDirection: "column" }}>
                    <Button type="button" variant="secondary" onClick={() => handleEdit(service)} style={{ padding: '4px 8px', fontSize: '12px' }}>
                      Edit
                    </Button>
                    <Button type="button" onClick={() => handleDelete(service.id)} style={{ padding: '4px 8px', fontSize: '12px', background: 'var(--color-error)' }}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ServiceManagement;