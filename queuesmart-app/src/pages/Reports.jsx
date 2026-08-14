import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import { useAuth } from "../contexts/AuthContext";
import { servicesApi, reportsApi } from "../api/client";

const REPORT_TYPES = [
  { value: "users", label: "Users" },
  { value: "services", label: "Services" },
  { value: "participation", label: "Participation Log" },
];

const DATE_KEY_RE = /(At|Activity)$/;

function humanizeKey(key) {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatCell(key, value) {
  if (value === null || value === undefined || value === "") return "—";
  if (DATE_KEY_RE.test(key)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString();
  }
  return String(value);
}

function todayFilename(type, ext) {
  return `queuesmart-${type}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

function ReportsContent() {
  const [services, setServices] = useState([]);
  const [reportType, setReportType] = useState("users");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [serviceId, setServiceId] = useState("");

  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [downloading, setDownloading] = useState({ csv: false, pdf: false });

  useEffect(() => {
    (async () => {
      try {
        setServices(await servicesApi.list());
      } catch {
        // service dropdown is a convenience filter, not worth blocking the screen over
      }
    })();
  }, []);

  function currentFilters() {
    return { from: from || undefined, to: to || undefined, serviceId: serviceId || undefined };
  }

  async function handleRun(e) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setRunning(true);
    try {
      const data = await reportsApi.get(reportType, currentFilters());
      setResult(data);
    } catch (err) {
      setError(err.message || "Could not run report");
      setFieldErrors(err.fields || {});
      setResult(null);
    } finally {
      setRunning(false);
    }
  }

  async function handleDownload(format) {
    setError("");
    setDownloading((prev) => ({ ...prev, [format]: true }));
    try {
      const blob = await reportsApi.download(reportType, format, currentFilters());
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = todayFilename(reportType, format);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err.message || `Could not download ${format.toUpperCase()}`);
      setFieldErrors(err.fields || {});
    } finally {
      setDownloading((prev) => ({ ...prev, [format]: false }));
    }
  }

  const summary = result?.summary;
  const rows = result?.rows || [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-lg)", borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--space-md)" }}>
        <h1>Reports</h1>
      </div>

      <form
        onSubmit={handleRun}
        style={{ padding: "var(--space-md)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", marginBottom: "var(--space-lg)", display: "flex", gap: "var(--space-md)", flexWrap: "wrap", alignItems: "flex-end" }}
      >
        <div className="form-input" style={{ marginBottom: 0 }}>
          <label className="form-input-label">Report</label>
          <select className="form-input-field" value={reportType} onChange={(e) => setReportType(e.target.value)}>
            {REPORT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="form-input" style={{ marginBottom: 0 }}>
          <label className="form-input-label">From</label>
          <input
            className={`form-input-field ${fieldErrors.from ? "form-input-error" : ""}`}
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          {fieldErrors.from && <span className="form-input-message">{fieldErrors.from}</span>}
        </div>

        <div className="form-input" style={{ marginBottom: 0 }}>
          <label className="form-input-label">To</label>
          <input
            className={`form-input-field ${fieldErrors.to ? "form-input-error" : ""}`}
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          {fieldErrors.to && <span className="form-input-message">{fieldErrors.to}</span>}
        </div>

        <div className="form-input" style={{ marginBottom: 0, minWidth: "180px" }}>
          <label className="form-input-label">Service</label>
          <select
            className={`form-input-field ${fieldErrors.serviceId ? "form-input-error" : ""}`}
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            <option value="">All services</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <Button type="submit" disabled={running}>
          {running ? "Running..." : "Run"}
        </Button>

        <div style={{ display: "flex", gap: "var(--space-sm)", marginLeft: "auto" }}>
          <Button type="button" variant="secondary" onClick={() => handleDownload("csv")} disabled={downloading.csv}>
            {downloading.csv ? "Preparing CSV..." : "Download CSV"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => handleDownload("pdf")} disabled={downloading.pdf}>
            {downloading.pdf ? "Preparing PDF..." : "Download PDF"}
          </Button>
        </div>
      </form>

      {error && <p style={{ color: "var(--color-error)", marginBottom: "var(--space-md)" }}>{error}</p>}

      {summary && (
        <div style={{ display: "flex", gap: "var(--space-md)", marginBottom: "var(--space-lg)", flexWrap: "wrap" }}>
          <StatBox label="Total entries" value={summary.totalEntries} />
          <StatBox label="Served" value={summary.served} />
          <StatBox label="Left" value={summary.left} />
          <StatBox label="No-show" value={summary.noShow} />
          <StatBox label="Unique users" value={summary.uniqueUsers} />
          <StatBox label="Avg wait" value={summary.avgWaitMinutes == null ? "n/a" : `${summary.avgWaitMinutes} min`} />
          <StatBox label="Currently waiting" value={summary.currentlyWaiting} />
        </div>
      )}

      {result && (
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            padding: "var(--space-md)",
            overflowX: "auto",
          }}
        >
          {rows.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "var(--space-md)" }}>
              No records match these filters.
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col} style={thStyle}>{humanizeKey(col)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.userId ?? row.serviceId ?? row.historyId ?? i}>
                    {columns.map((col) => (
                      <td key={col} style={tdStyle}>{formatCell(col, row[col])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div style={statBoxStyle}>
      <div style={statNumStyle}>{value}</div>
      <div>{label}</div>
    </div>
  );
}

function Reports() {
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
            : "Please log in with an admin account to view reports."}
        </p>
        <Link to="/login">Go to Login</Link>
      </div>
    );
  }

  return <ReportsContent />;
}

const thStyle = {
  textAlign: "left",
  padding: "10px 8px",
  borderBottom: "1px solid var(--color-border)",
  fontSize: "12px",
  textTransform: "uppercase",
  color: "var(--color-text-muted)",
  whiteSpace: "nowrap",
};

const tdStyle = {
  textAlign: "left",
  padding: "10px 8px",
  borderBottom: "1px solid var(--color-border)",
  fontSize: "var(--font-size-sm)",
  whiteSpace: "nowrap",
};

const statBoxStyle = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius)",
  padding: "14px 18px",
  flex: 1,
  minWidth: "120px",
  textAlign: "center",
  fontSize: "13px",
  color: "var(--color-text-muted)",
};

const statNumStyle = {
  fontSize: "26px",
  fontWeight: "bold",
  color: "var(--color-primary)",
};

export default Reports;
