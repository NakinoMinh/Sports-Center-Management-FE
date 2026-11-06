export function transferQrLink(origin: string, token: string): string {
  const base = new URL(origin);
  if (!["https:", "http:"].includes(base.protocol) || base.username || base.password || !/^[a-f\d]{64}$/i.test(token)) {
    throw new Error("Không thể tạo đường dẫn thanh toán. Vui lòng thử lại.");
  }
  const url = new URL("/payments/transfer/confirm", base.origin);
  // Keep the limited payment capability out of HTTP URL logs and referrers.
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}
