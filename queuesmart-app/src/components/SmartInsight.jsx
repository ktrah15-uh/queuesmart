import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useQueue } from "../contexts/QueueContext";
import Button from "./Button";

function SmartInsight({ serviceId, position }) {
  const navigate = useNavigate();
  const { joinQueue, leaveQueue, activeTicketId } = useQueue();
  const [insight, setInsight] = useState(null);

  useEffect(() => {
    async function loadInsight() {
      if (!serviceId) {
        setInsight(null);
        return;
      }
      let path = "/smart/services/" + serviceId + "/insight";
      if (typeof position === "number" && position > 0) {
        path = path + "?position=" + position;
      }
      try {
        const data = await api.get(path);
        setInsight(data || null);
      } catch (err) {
        setInsight(null);
      }
    }
    loadInsight();
  }, [serviceId, position]);

  if (!insight || !insight.estimate) {
    return null;
  }

  const estimate = insight.estimate;
  const alternative = insight.alternative;
  const bestTime = insight.bestTime;
  const fromHistory = estimate.basis === "history";

  async function handleJoinAlternative() {
    if (activeTicketId) {
      await leaveQueue(activeTicketId);
    }
    const ticketId = await joinQueue(alternative.serviceId);
    if (ticketId) {
      navigate("/status");
    }
  }

  let chart = null;
  if (bestTime && bestTime.byHour && bestTime.byHour.length > 0 && bestTime.quietest !== null && bestTime.quietest !== undefined) {
    let maxVisits = 1;
    for (let i = 0; i < bestTime.byHour.length; i++) {
      if (bestTime.byHour[i].visits > maxVisits) {
        maxVisits = bestTime.byHour[i].visits;
      }
    }

    const bars = [];
    for (let i = 0; i < bestTime.byHour.length; i++) {
      const entry = bestTime.byHour[i];
      const barHeight = Math.max(4, Math.round((entry.visits / maxVisits) * 48));
      const isQuietest = entry.hour === bestTime.quietest;
      bars.push(
        <div
          key={entry.hour}
          title={entry.hour + ":00 - " + entry.visits + " visits, avg wait " + entry.avgWaitMinutes + " min"}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", justifyContent: "flex-end" }}
        >
          <div
            style={{
              width: "100%",
              height: barHeight + "px",
              borderRadius: "2px",
              background: isQuietest ? "var(--color-success)" : "var(--color-border)",
            }}
          />
          <span style={{ fontSize: "0.6rem", color: isQuietest ? "var(--color-success)" : "var(--color-text-muted)" }}>
            {entry.hour}
          </span>
        </div>
      );
    }

    chart = (
      <div style={{ marginTop: "var(--space-md)" }}>
        {bestTime.note && (
          <p style={{ margin: "0 0 var(--space-xs) 0", fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
            {bestTime.note}
          </p>
        )}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "64px" }}>
          {bars}
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: "var(--space-md) 0", padding: "var(--space-lg)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", textAlign: "left" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-xs)" }}>
        <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "1px", margin: 0 }}>
          Smart Insight
        </p>
        <span
          style={{
            fontSize: "0.7rem",
            padding: "2px 8px",
            borderRadius: "999px",
            border: "1px solid " + (fromHistory ? "var(--color-success)" : "var(--color-border)"),
            color: fromHistory ? "var(--color-success)" : "var(--color-text-muted)",
          }}
        >
          {fromHistory ? "learned from history" : "scheduled estimate"}
        </span>
      </div>

      <h2 style={{ fontSize: "2.5rem", margin: 0 }}>
        {estimate.estimatedMinutes} <span style={{ fontSize: "1rem" }}>min</span>
      </h2>
      {estimate.explanation && (
        <p style={{ margin: "var(--space-xs) 0 0 0", fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
          {estimate.explanation}
        </p>
      )}

      {alternative && (
        <div style={{ marginTop: "var(--space-md)", padding: "var(--space-md)", border: "1px solid var(--color-primary)", borderRadius: "var(--radius)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-sm)" }}>
          <div>
            <strong>{alternative.serviceName}</strong>
            <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)" }}>
              ~{alternative.estimatedMinutes} min wait - save {alternative.savingMinutes} min
            </p>
          </div>
          <Button onClick={handleJoinAlternative}>Join Instead</Button>
        </div>
      )}

      {chart}
    </div>
  );
}

export default SmartInsight;
