export interface TermsAcceptanceGate {
  hasScrolledToEnd: boolean;
  requiredChecks: boolean[];
}

export const canAcceptTerms = ({
  hasScrolledToEnd,
  requiredChecks,
}: TermsAcceptanceGate): boolean =>
  hasScrolledToEnd && requiredChecks.length > 0 && requiredChecks.every(Boolean);

export const hasReachedTermsEnd = ({
  scrollTop,
  clientHeight,
  scrollHeight,
}: Pick<HTMLElement, "scrollTop" | "clientHeight" | "scrollHeight">): boolean =>
  clientHeight > 0 &&
  scrollHeight > 0 &&
  scrollTop + clientHeight >= scrollHeight - 8;
