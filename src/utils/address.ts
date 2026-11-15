export interface AddressParts {
  address: string | null;
  postalCode: string | null;
  postalCodeLocality: string | null;
  locality: string | null;
}

/** Linha de morada única (D9): morada, código postal e localidade, sem partes vazias. */
export function formatAddressLine(c: AddressParts): string | null {
  const parts = [c.address, c.postalCode, c.postalCodeLocality ?? c.locality].filter(
    (p): p is string => !!p && p.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(', ') : null;
}
