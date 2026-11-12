import { useCallback, useLayoutEffect, useRef, useState, type UIEvent } from "react";
import type { CurrentMembershipTerms } from "../../types/membership";
import { canAcceptTerms, hasReachedTermsEnd } from "../../utils/membershipTerms";
import { formatDate } from "../../utils/format";
import { Dialog } from "../common/Dialog";

export function MembershipTermsDialog({ terms, busy, error, onAccept, onClose }: {
  terms: CurrentMembershipTerms;
  busy: boolean;
  error: string;
  onAccept: (version: string, contentHash: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const updateReadState = useCallback(() => {
    const element = scrollRef.current;
    if (element && hasReachedTermsEnd(element)) setScrolled(true);
  }, []);
  useLayoutEffect(() => {
    setScrolled(false);
    setChecks({});
    updateReadState();
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(updateReadState);
    if (scrollRef.current) observer?.observe(scrollRef.current);
    window.addEventListener("resize", updateReadState);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateReadState);
    };
  }, [terms.version, terms.contentHash, updateReadState]);
  const requiredChecks = terms.requiredAcknowledgements.map((item) => checks[item.id] === true);
  const allowed = canAcceptTerms({ hasScrolledToEnd: scrolled, requiredChecks });
  const detectEnd = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    if (hasReachedTermsEnd(element)) setScrolled(true);
  };

  return <Dialog title={terms.title} description={`Hiệu lực từ ${formatDate(terms.effectiveFrom)}`}
    onClose={() => { if (!busy) onClose(); }} footer={<>
      <button className="button secondary" disabled={busy} onClick={onClose}>Để sau</button>
      <button className="button primary" disabled={busy || !allowed}
        onClick={() => onAccept(terms.version, terms.contentHash)}>{busy ? "Đang xác nhận…" : "Tôi đồng ý toàn bộ điều khoản"}</button>
    </>}>
    <div ref={scrollRef} className="membership-terms-scroll" onScroll={detectEnd} tabIndex={0}>
      {terms.sections.map((section) => <section key={section.id} className="membership-terms-section">
        <h3>{section.title}</h3><p>{section.body}</p>
      </section>)}
      <p className="terms-scroll-end">Bạn đã đọc đến cuối điều khoản.</p>
    </div>
    {!scrolled && <p className="terms-hint">Vui lòng cuộn và đọc đến cuối trước khi xác nhận.</p>}
    <div className="terms-checks">
      {terms.requiredAcknowledgements.map((item) => <label key={item.id}>
        <input type="checkbox" checked={checks[item.id] ?? false}
          onChange={(event) => setChecks((current) => ({ ...current, [item.id]: event.target.checked }))} />
        <span>{item.label}</span>
      </label>)}
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
  </Dialog>;
}
