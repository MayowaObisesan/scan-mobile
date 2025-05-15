import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useTransactionHistory } from '~/hooks/useTransactionHistory';

export function useTransactionNotifications(pubkey: string | undefined) {
  const { transactions, refresh } = useTransactionHistory(pubkey);
  const previousTransactions = useRef<string[]>([]);

  useEffect(() => {
    const interval = setInterval(async () => {
      await refresh();

      const newTransactions = transactions.filter(
        (tx) => !previousTransactions.current.includes(tx.signature)
      );

      if (newTransactions.length > 0) {
        newTransactions.forEach((tx) => {
          Notifications.scheduleNotificationAsync({
            content: {
              title: `New Transaction: ${tx.type === 'receive' ? 'Received' : 'Sent'}`,
              body: `${tx.amount.toFixed(4)} SOL - ${tx.status.toUpperCase()}`,
            },
            trigger: null,
          });
        });

        previousTransactions.current = transactions.map((tx) => tx.signature);
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [transactions, refresh]);

  return null;
}
