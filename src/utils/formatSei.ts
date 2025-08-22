export function formatSei(amount: number, decimals: number): bigint {
  console.log(`amount: ${amount}, decimals: ${decimals}`);
  return BigInt(amount) * BigInt(10 ** decimals);
}

export function formatWei(amount: number, decimals: number): number {
  return amount / 10 ** decimals;
}
