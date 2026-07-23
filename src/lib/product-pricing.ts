export function calculateDiscountedPrice(priceNgn: number, discountPercentage: number) {
  const price = Math.max(0, Number(priceNgn) || 0);
  const discount = Math.min(100, Math.max(0, Number(discountPercentage) || 0));
  return Number((price * (1 - discount / 100)).toFixed(2));
}

export function tierDiscountApplies(input: {
  selectedTierIds: string[];
  activeTierId?: string | null;
}) {
  if (!input.activeTierId) return false;
  return input.selectedTierIds.length === 0 || input.selectedTierIds.includes(input.activeTierId);
}
