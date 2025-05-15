// hooks/useTransactionHistory.ts
import { useEffect, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import {connection} from "~/solana/connection";

export interface I_Transaction {
  signature: string;
  timestamp: number;
  type: 'send' | 'receive';
  amount: number;
  otherParty: string;
  status: 'confirmed' | 'pending' | 'failed';
}

export function useTransactionHistory(pubkey: string | undefined) {
  const [transactions, setTransactions] = useState<I_Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTransactions = async () => {
    if (!pubkey) return;

    setIsLoading(true);
    try {
      const signatures = await connection.getSignaturesForAddress(
        new PublicKey(pubkey),
        { limit: 10 }
      );

      const txDetails = await Promise.all(
        signatures.map(async (sig) => {
          const tx = await connection.getParsedTransaction(sig.signature);
          const amount = tx?.meta?.postBalances[0] - tx?.meta?.preBalances[0];

          return {
            signature: sig.signature,
            timestamp: sig.blockTime || 0,
            type: amount > 0 ? 'receive' : 'send',
            amount: Math.abs(amount) / 1e9,
            otherParty: tx?.transaction.message.accountKeys[1].pubkey.toString() || '',
            status: sig.confirmationStatus as 'confirmed' | 'pending' | 'failed'
          };
        })
      );

      setTransactions(txDetails);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [pubkey]);

  return { transactions, isLoading, refresh: fetchTransactions };
}
