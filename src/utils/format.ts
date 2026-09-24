export const formatMoney = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
export const formatDate = (value: string) => {
  // Timestamps are instants in local time; membership dates are calendar days.
  if (value.includes("T")) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "—"
      : new Intl.DateTimeFormat("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(date);
  }
  const dateOnly = value.slice(0, 10);
  const [year, month, day] = dateOnly.split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
};
export const durationLabel = (months: number) =>
  months === 12 ? "1 năm" : months === 3 ? "3 tháng" : "1 tháng";
