import { useId, useState, type FormEvent } from "react";
import { fieldLimits, type AuthorSummary } from "../shared/contracts.js";

export type AuthorSummaryState =
  | { status: "idle" }
  | { status: "loading"; displayName: string }
  | { status: "success"; summary: AuthorSummary }
  | { status: "error"; displayName: string; message: string };

interface AuthorSummaryPanelProps {
  state: AuthorSummaryState;
  onLookup: (displayName: string) => void;
  onRetry: () => void;
}

/**
 * Standalone panel for looking up a contributor's author summary. Reachable
 * from a manual lookup input (always visible here) and from a trigger on
 * each feedback card's "By {displayName}" text (wired in App.tsx).
 */
export function AuthorSummaryPanel({
  state,
  onLookup,
  onRetry,
}: AuthorSummaryPanelProps) {
  const [lookupValue, setLookupValue] = useState("");
  const inputId = useId();
  const statusId = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onLookup(lookupValue);
  }

  return (
    <section
      className="panel summary-panel"
      aria-labelledby="author-summary-title"
    >
      <h2 id="author-summary-title">Author summary</h2>
      <form onSubmit={submit}>
        <label htmlFor={inputId}>Look up a display name</label>
        <input
          id={inputId}
          name="author-lookup"
          value={lookupValue}
          maxLength={fieldLimits.displayName}
          aria-describedby={statusId}
          onChange={(event) => setLookupValue(event.target.value)}
        />
        <button type="submit">Look up</button>
      </form>
      <div id={statusId} className="summary-status" aria-live="polite">
        {state.status === "loading" && (
          <p role="status">Loading summary for {state.displayName}…</p>
        )}
        {state.status === "success" && (
          <dl className="summary-result">
            <div>
              <dt>Display name</dt>
              <dd>{state.summary.displayName || "(none)"}</dd>
            </div>
            <div>
              <dt>Feedback items</dt>
              <dd>{state.summary.itemCount}</dd>
            </div>
            <div>
              <dt>Total votes</dt>
              <dd>{state.summary.totalVotes}</dd>
            </div>
          </dl>
        )}
        {state.status === "error" && (
          <div className="error">
            <span>{state.message}</span>
            <button type="button" onClick={onRetry}>
              Try again
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
