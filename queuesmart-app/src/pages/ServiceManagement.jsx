import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import FormInput from "../components/FormInput";
import { useAuth } from "../contexts/AuthContext";
import { servicesApi } from "../api/client";
import { required, maxLength, isNumber, firstError } from "../validation/validators";

const emptyForm = { name: "", description: "", duration: "", priority: "low" };

function ServiceManagementContent() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState({ name: "", description: "", duration: "" });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    setLoading(true);
    setLoadError("");
    try {
      const data = await servicesApi.list();
      setServices(data);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const nameError = firstError(
      () => required(formData.name, "Service Name"),
      () => maxLength(formData.name, 100, "Service Name")
    );
    const descriptionError = required(formData.description, "Description");
    const durationError = isNumber(formData.duration, "Expected Duration");

    setErrors({ name: nameError, description: descriptionError, duration: durationError });
    if (nameError || descriptionError || durationError) return;

    const payload = {
      name: formData.name,
      description: formData.description,
      expectedDuration: Number(formData.duration),
      priority: formData.priority,
    };

    setSubmitting(true);
    try {
      if (editingId) {
        await servicesApi.update(editingId, payload);
      } else {
        await servicesApi.create(payload);
      }
      await loadServices();
      setFormData(emptyForm);
      setEditingId(null);
      setErrors({ name: "", description: "", duration: "" });
    } catch (err) {
      // surface backend validation errors (per-field) alongside any client-side ones
      setErrors((prev) => ({
        ...prev,
        name: err.fields?.name || prev.name,
        description: err.fields?.description || prev.description,
        duration: err.fields?.expectedDuration || prev.duration,
      }));
      if (!Object.keys(err.fields || {}).length) alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(service) {
    setFormData({
      name: service.name,
      description: service.description,
      duration: String(service.expectedDuration),
      priority: service.priority,
    });
    setEditingId(service.id);
    setErrors({ name: "", description: "", duration: "" });
  }

  async function handleDelete(id) {
    try {
      await servicesApi.remove(id);
      await loadServices();
    } catch (err) {
      alert(err.message);
    }
  }

  function cancelEdit() {
    setFormData(emptyForm);
    setEditingId(null);
    setErrors({ name: "", description: "", duration: "" });
  }

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
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingId ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </div>

        {/* LIST SECTION */}
        <div style={{ flex: "1 1 350px", padding: "var(--space-md)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)" }}>
          <h2>Active Services</h2>
          {loading ? (
            <p style={{ color: "var(--color-text-muted)" }}>Loading services...</p>
          ) : loadError ? (
            <p style={{ color: "var(--color-error)" }}>{loadError}</p>
          ) : services.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)" }}>No services available.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              {services.map(service => (
                <div key={service.id} style={{ padding: "var(--space-md)", background: "var(--color-surface)", borderRadius: "var(--radius)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: "0 0 4px 0" }}>{service.name}</h3>
                    <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
                      {service.expectedDuration} mins · {service.isOpen ? "open" : "closed"}
                    </p>
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

function ServiceManagement() {
  const { loading, isLoggedIn, isAdmin } = useAuth();

  if (loading) {
    return <p style={{ textAlign: "center", marginTop: "var(--space-xl)", color: "var(--color-text-muted)" }}>Loading...</p>;
  }

  if (!isLoggedIn || !isAdmin) {
    return (
      <div style={{ maxWidth: "400px", margin: "var(--space-xl) auto", textAlign: "center" }}>
        <h2>Admin sign-in required</h2>
        <p style={{ color: "var(--color-text-muted)" }}>
          {isLoggedIn
            ? "Your account doesn't have admin access."
            : "Please log in with an admin account to manage services."}
        </p>
        <Link to="/login">Go to Login</Link>
      </div>
    );
  }

  return <ServiceManagementContent />;
}

export default ServiceManagement;
