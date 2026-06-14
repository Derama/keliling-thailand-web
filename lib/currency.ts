export function convertThbToIdr(
  thbAmount: number,
  idrPerThb: number
): number | null {
  if (
    !Number.isFinite(thbAmount) ||
    !Number.isFinite(idrPerThb) ||
    thbAmount <= 0 ||
    idrPerThb <= 0
  ) {
    return null;
  }

  return Math.round(thbAmount * idrPerThb);
}
