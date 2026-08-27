export function lakh(value: number) {
  return `₹${value.toFixed(1)} L`;
}

export function cr(valueInRupees: number) {
  const inCr = valueInRupees / 10000000.0;
  return `₹${inCr.toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
}

export function pct(value: number) {
  return `${Math.round(value)}%`;
}

export function financialProgress(utilized: number, sanctioned: number) {
  return Math.round((utilized / sanctioned) * 100);
}

export function compactNumber(value: number) {
  return value.toLocaleString("en-IN");
}
