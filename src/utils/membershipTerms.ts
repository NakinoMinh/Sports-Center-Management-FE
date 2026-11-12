export interface TermsAcceptanceGate {
  hasScrolledToEnd: boolean;
  requiredChecks: boolean[];
}

export const canAcceptTerms = ({
  hasScrolledToEnd,
  requiredChecks,
}: TermsAcceptanceGate): boolean =>
  hasScrolledToEnd && requiredChecks.length > 0 && requiredChecks.every(Boolean);
