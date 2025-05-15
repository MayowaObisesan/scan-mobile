// hooks/useExchangeRates.ts
import { useEffect, useState } from 'react';

export function useExchangeRates() {
  const [rates, setRates] = useState<{ [key: string]: number }>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetchRates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd,eur,ngn,gbp');
      const data = await response.json();
      setRates(data.solana);
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  return { rates, isLoading, refresh: fetchRates };
}
