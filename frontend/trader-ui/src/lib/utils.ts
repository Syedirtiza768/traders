/**
 * Format a number as currency (PKR by default)
 */
export function formatCurrency(amount: number, currency = 'PKR'): string {
  if (currency === 'PKR') {
    return `PKR ${amount.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a compact number (e.g., 1.2M, 500K)
 */
export function formatCompact(amount: number): string {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toFixed(0);
}

/**
 * Format a date string
 */
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get a status badge color
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'Draft': 'bg-gray-100 text-gray-700',
    'To Deliver and Bill': 'bg-blue-100 text-blue-700',
    'To Bill': 'bg-yellow-100 text-yellow-700',
    'To Deliver': 'bg-orange-100 text-orange-700',
    'Completed': 'bg-green-100 text-green-700',
    'Cancelled': 'bg-red-100 text-red-700',
    'Paid': 'bg-green-100 text-green-700',
    'Unpaid': 'bg-red-100 text-red-700',
    'Partly Paid': 'bg-yellow-100 text-yellow-700',
    'Overdue': 'bg-red-100 text-red-700',
    'Submitted': 'bg-blue-100 text-blue-700',
    'Return': 'bg-purple-100 text-purple-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

/**
 * Truncate text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
