/** The approved Orbit Book symbol and wordmark, shared by both layouts. */
export function Brand() {
  return (
    <span className="revelink-brand">
      <img
        className="revelink-symbol"
        src="/brand/revelink-symbol.svg"
        width="32"
        height="32"
        alt=""
        aria-hidden="true"
      />
      <span className="revelink-wordmark">Revelink</span>
    </span>
  );
}
