/** Console-wide loading skeleton. Renders instantly during page transitions
 *  so the operator never sees a frozen previous page. The shell stays mounted
 *  (it's in the layout); only the page content swaps. */
export default function ConsoleLoading() {
  return (
    <div className="px-7 py-7">
      <style>{LOADING_CSS}</style>
      <div className="al-skel__head">
        <div className="al-skel__bar al-skel__bar--lg" />
        <div className="al-skel__bar al-skel__bar--sm" />
      </div>
      <div className="al-skel__grid">
        <div className="al-skel__card" />
        <div className="al-skel__card" />
        <div className="al-skel__card" />
        <div className="al-skel__card" />
      </div>
      <div className="al-skel__table">
        <div className="al-skel__row al-skel__row--head" />
        <div className="al-skel__row" />
        <div className="al-skel__row" />
        <div className="al-skel__row" />
        <div className="al-skel__row" />
      </div>
    </div>
  )
}

const LOADING_CSS = `
.al-skel__head { margin-bottom: 22px; }
.al-skel__bar {
  height: 14px;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--surface-hover) 0%, var(--surface-border) 50%, var(--surface-hover) 100%);
  background-size: 200% 100%;
  animation: al-skel 1.4s ease-in-out infinite;
}
.al-skel__bar--lg { width: 220px; height: 28px; }
.al-skel__bar--sm { margin-top: 10px; width: 360px; height: 12px; }
.al-skel__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 12px;
  margin-bottom: 22px;
}
.al-skel__card {
  height: 110px;
  border-radius: 14px;
  background: linear-gradient(90deg, var(--surface-hover) 0%, var(--surface-border) 50%, var(--surface-hover) 100%);
  background-size: 200% 100%;
  animation: al-skel 1.4s ease-in-out infinite;
}
.al-skel__table {
  border-radius: 14px;
  border: 1px solid var(--surface-border);
  background: var(--surface-page);
  overflow: hidden;
}
.al-skel__row {
  height: 56px;
  border-top: 1px solid var(--surface-divider);
  background: linear-gradient(90deg, var(--surface-hover) 0%, var(--surface-border) 50%, var(--surface-hover) 100%);
  background-size: 200% 100%;
  animation: al-skel 1.4s ease-in-out infinite;
}
.al-skel__row:first-child { border-top: 0; }
.al-skel__row--head { height: 44px; background: var(--surface-canvas); animation: none; }
@keyframes al-skel {
  0% { background-position: 200% 50%; }
  100% { background-position: -200% 50%; }
}
@media (prefers-reduced-motion: reduce) {
  .al-skel__bar, .al-skel__card, .al-skel__row { animation: none; }
}
`
