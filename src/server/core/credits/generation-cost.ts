export const CREDIT_COST_REDESIGN_VARIANT = 1;

export function calculateGenerationCost(requestedVariants: number): number {
  if (
    !Number.isInteger(requestedVariants) ||
    requestedVariants < 1 ||
    requestedVariants > 4
  ) {
    throw new RangeError("requestedVariants must be an integer from 1 to 4");
  }

  return requestedVariants * CREDIT_COST_REDESIGN_VARIANT;
}
