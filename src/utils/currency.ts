/**
 * Currency formatting utility
 * Provides consistent currency display across the app with proper mobile styling
 */

/**
 * Format a number as Pakistani Rupees
 * @param amount - The amount to format
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number | string | null | undefined,
  options: {
    showSymbol?: boolean;
    symbol?: string;
    compact?: boolean;
  } = {}
): string => {
  const {
    showSymbol = true,
    symbol = '₨',
    compact = false
  } = options;

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  
  if (isNaN(numAmount)) {
    return showSymbol ? `${symbol} 0` : '0';
  }

  let formatted: string;
  
  if (compact && numAmount >= 1000) {
    // For large numbers, use compact notation (e.g., 10K, 1.5M)
    if (numAmount >= 1000000) {
      formatted = (numAmount / 1000000).toFixed(1) + 'M';
    } else if (numAmount >= 1000) {
      formatted = (numAmount / 1000).toFixed(1) + 'K';
    } else {
      formatted = numAmount.toLocaleString();
    }
  } else {
    formatted = numAmount.toLocaleString('en-PK', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  if (showSymbol) {
    return `${symbol} ${formatted}`;
  }
  
  return formatted;
};

/**
 * Currency component props for React components
 */
export interface CurrencyProps {
  amount: number | string | null | undefined;
  className?: string;
  symbolClassName?: string;
  amountClassName?: string;
  showSymbol?: boolean;
  compact?: boolean;
}

/**
 * Format currency with separate styling for symbol and amount
 * Useful for mobile views where symbol needs different font styling
 */
export const formatCurrencyWithStyles = (
  amount: number | string | null | undefined,
  options: CurrencyProps = {}
): { symbol: string; amount: string; full: string } => {
  const {
    showSymbol = true,
    symbol = '₨'
  } = options;

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  
  if (isNaN(numAmount)) {
    const zero = '0';
    return {
      symbol: showSymbol ? symbol : '',
      amount: zero,
      full: showSymbol ? `${symbol} ${zero}` : zero
    };
  }

  const formatted = numAmount.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  return {
    symbol: showSymbol ? symbol : '',
    amount: formatted,
    full: showSymbol ? `${symbol} ${formatted}` : formatted
  };
};


