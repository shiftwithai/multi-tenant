export function normalizePhoneNumber(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');

  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.startsWith('1') && digitsOnly.length > 11) {
    return `+${digitsOnly.slice(0, 11)}`;
  }

  return `+1${digitsOnly.slice(-10)}`;
}

export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  const digits = normalized.replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('1')) {
    const areaCode = digits.slice(1, 4);
    const prefix = digits.slice(4, 7);
    const lineNumber = digits.slice(7, 11);
    return `+1 (${areaCode}) ${prefix}-${lineNumber}`;
  }

  return normalized;
}
