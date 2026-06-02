const LOCAL_DATE_TIME_WITHOUT_ZONE =
  /^\d{4}-\d{2}-\d{2}[T ][\d:.]+(?:\.\d+)?$/;
const HAS_EXPLICIT_TIME_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i;

export const parseBackendDate = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  if (!normalized) return null;

  const withZone =
    LOCAL_DATE_TIME_WITHOUT_ZONE.test(normalized) &&
    !HAS_EXPLICIT_TIME_ZONE.test(normalized)
      ? `${normalized.replace(' ', 'T')}Z`
      : normalized;

  const date = new Date(withZone);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const getBackendDateTime = (value: unknown) =>
  parseBackendDate(value)?.getTime() ?? 0;
