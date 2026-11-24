import type { DecimalString, IsoDate, Period } from "@vigil/api-types";

const integerFormat = new Intl.NumberFormat("tr-TR");
const amountScales = {
  tl: { fractionDigits: 0, unit: "TL" },
  thousand: { fractionDigits: 3, unit: "bin TL" },
  million: { fractionDigits: 6, unit: "milyon TL" },
};

export type AmountScale = keyof typeof amountScales;

function formatDecimal(coefficient: bigint, fractionDigits: number, prefix = ""): string {
  const negative = coefficient < 0n;
  const magnitude = negative ? -coefficient : coefficient;
  const divisor = 10n ** BigInt(fractionDigits);
  const whole = integerFormat.format(magnitude / divisor);
  const formatted = `${negative ? "-" : ""}${prefix}${whole}`;
  const remainder = magnitude % divisor;
  if (remainder === 0n) return formatted;

  const fraction = remainder.toString().padStart(fractionDigits, "0").replace(/0+$/, "");
  return `${formatted},${fraction}`;
}

/** Format a whole-TL amount, retaining its precision in the requested scale. */
export function formatAmount(amount: bigint, scale: AmountScale = "tl"): string {
  const { fractionDigits, unit } = amountScales[scale];
  return `${formatDecimal(amount, fractionDigits)} ${unit}`;
}

/** Format a decimal ratio from the API as a percentage. */
export function formatPercentage(ratio: DecimalString): string {
  const match = /^(-?\d+)(?:\.(\d+))?$/.exec(ratio);
  const integer = match?.[1];
  if (integer === undefined || match?.[0] !== ratio) throw new TypeError("Expected a decimal ratio.");

  const fraction = match[2] ?? "";
  return formatDecimal(BigInt(integer + fraction) * 100n, fraction.length, "%");
}

/** Convert API basis points to percentage points. */
export function formatPercentagePoints(basisPoints: bigint): string {
  return `${formatDecimal(basisPoints, 2)} yüzde puan`;
}

/** Format an ISO calendar date independently of the local time zone. */
export function formatDate(date: IsoDate): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new RangeError("Expected a valid ISO date (YYYY-MM-DD).");
  }
  return `${date.slice(8, 10)}.${date.slice(5, 7)}.${date.slice(0, 4)}`;
}

export function formatDateRange(start: IsoDate, end: IsoDate): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function formatPeriod({ start, end, type }: Pick<Period, "start" | "end" | "type">): string {
  if (type === "point_in_time") return `${formatDate(end)} itibarıyla`;

  const label = type === "three_month" ? "3 aylık" : "Kümülatif";
  const dates = start === null ? `Dönem sonu ${formatDate(end)}` : formatDateRange(start, end);
  return `${label} · ${dates}`;
}
