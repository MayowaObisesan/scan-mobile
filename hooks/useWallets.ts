// hooks/useWallets.ts
import {useCallback, useEffect, useState} from 'react';
import {Keypair, PublicKey} from '@solana/web3.js';
import {
  deleteWallet,
  getActiveWallet,
  getWalletBalance,
  getWalletNames,
  getWallets,
  setActiveWallet,
  setWalletName,
} from '~/solana/wallet';
import {useQueryClient} from "@tanstack/react-query";
import {supabase} from "~/supabase/client";
import {DBTables} from "~/types/enums";

export interface WalletData {
  id: string;
  name: string;
  address: string;
  balance: number;
  isActive: boolean;
  chain: 'solana';
  keypair: Keypair;
}

interface WalletState {
  wallets: Keypair[];
  walletsList: WalletData[];
  balances: { [key: string]: number };
  names: { [key: string]: string };
  activeWallet: Keypair | null;
  activePubkey: string;
  isLoading: boolean;
}

// Add a supabase subscription to listen for changes in the wallets table
export const useRealTimeWallets = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase
      .channel("wallets")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: DBTables.Wallets,
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (payload) => {
          // Update the local DB
          // syncEngine.createMessage(payload.new)
          queryClient.invalidateQueries({queryKey: ["wallets"]});
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: DBTables.Wallets,
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async (payload) => {
          /*
          No longer using the cacheMessage implementation - now using the SQLite & Drizzle implementation.
          if (userId !== payload.new.sender_id) {
            // Update cache for chats of this channel (or thread_id) other users and trigger re-render.
            // Don't update the cache for the sender of this chat that is being updated, because the cache
            // of the user that sent this chat update has already been updated once the chat updated successfully.
            const threadId = payload.new.thread_id;
            const messages = await getCachedMessages(threadId);
            await cacheMessages(threadId, [payload.new, ...messages]);
          }*/

          // Update the local DB
          // syncEngine.updateMessage(payload.new)
          await queryClient.invalidateQueries({queryKey: ["wallets"]});
        },
      )
      .subscribe();

    console.log("Real time wallets subscription");

    return () => {
      supabase.channel("wallets").unsubscribe();
    };
  }, [queryClient]);
};


export function useWallets() {
  const [state, setState] = useState<WalletState>({
    wallets: [],
    walletsList: [],
    balances: {},
    names: {},
    activeWallet: null,
    activePubkey: '',
    isLoading: true,
  });

  const formatWalletsList = useCallback((
    wallets: Keypair[],
    balances: { [key: string]: number },
    names: { [key: string]: string },
    activePubkey: string
  ): WalletData[] => {
    return wallets.map((wallet) => {
      const address = wallet.publicKey.toBase58();
      return {
        id: address,
        name: names[address] || `Wallet ${address.slice(0, 4)}...${address.slice(-4)}`,
        address,
        balance: balances[address] || 0,
        isActive: address === activePubkey,
        chain: 'solana' as const,
        keypair: wallet,
      };
    });
  }, []);

  const loadWallets = useCallback(async () => {
    try {
      setState(prev => ({...prev, isLoading: true}));

      const [list, names] = await Promise.all([
        getWallets(),
        getWalletNames(),
      ]);

      const active = await getActiveWallet();
      const activePubkey = active?.publicKey.toBase58() ?? list[0]?.publicKey.toBase58();

      const balances: { [key: string]: number } = {};
      for (const wallet of list) {
        balances[wallet.publicKey.toBase58()] = await getWalletBalance(wallet.publicKey);
      }

      const walletsList = formatWalletsList(list, balances, names, activePubkey);

      setState({
        wallets: list,
        walletsList,
        balances,
        names,
        activeWallet: active ?? list[0] ?? null,
        activePubkey,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading wallets:', error);
      setState(prev => ({...prev, isLoading: false}));
    }
  }, [formatWalletsList]);

  const selectWallet = useCallback(async (pubkey: string) => {
    try {
      await setActiveWallet(pubkey);
      setState(prev => {
        const walletsList = prev.walletsList.map(wallet => ({
          ...wallet,
          isActive: wallet.address === pubkey,
        }));

        return {
          ...prev,
          activePubkey: pubkey,
          activeWallet: prev.wallets.find(w => w.publicKey.toBase58() === pubkey) ?? null,
          walletsList,
        };
      });
    } catch (error) {
      console.error('Error selecting wallet:', error);
    }
  }, []);

  const refreshBalance = useCallback(async (pubkey: string) => {
    try {
      const balance = await getWalletBalance(new PublicKey(pubkey));
      setState(prev => {
        const walletsList = prev.walletsList.map(wallet => {
          if (wallet.address === pubkey) {
            return { ...wallet, balance };
          }
          return wallet;
        });

        return {
          ...prev,
          balances: { ...prev.balances, [pubkey]: balance },
          walletsList,
        };
      });
    } catch (error) {
      console.error('Error refreshing balance:', error);
    }
  }, []);

  const updateWalletName = useCallback(async (pubkey: string, newName: string) => {
    try {
      await setWalletName(pubkey, newName);
      setState(prev => {
        const newNames = {...prev.names, [pubkey]: newName};
        const walletsList = formatWalletsList(
          prev.wallets,
          prev.balances,
          newNames,
          prev.activePubkey
        );
        return {
          ...prev,
          names: newNames,
          walletsList,
        };
      });
    } catch (error) {
      console.error('Error updating wallet name:', error);
    }
  }, [formatWalletsList]);



  const removeWallet = useCallback(async (pubkey: string) => {
    try {
      await deleteWallet(pubkey);
      setState(prev => {
        const wallets = prev.wallets.filter(w => w.publicKey.toBase58() !== pubkey);
        const {[pubkey]: _, ...balances} = prev.balances;
        const {[pubkey]: __, ...names} = prev.names;

        let newActivePubkey = prev.activePubkey;
        let newActiveWallet = prev.activeWallet;

        if (pubkey === prev.activePubkey) {
          newActivePubkey = wallets[0]?.publicKey.toBase58() ?? '';
          newActiveWallet = wallets[0] ?? null;
        }

        const walletsList = formatWalletsList(wallets, balances, names, newActivePubkey);

        return {
          ...prev,
          wallets,
          walletsList,
          balances,
          names,
          activePubkey: newActivePubkey,
          activeWallet: newActiveWallet,
        };
      });
    } catch (error) {
      console.error('Error removing wallet:', error);
    }
  }, [formatWalletsList]);

  const refreshAllBalances = useCallback(async () => {
    try {
      setState(prev => ({...prev, isLoading: true}));
      const newBalances: { [key: string]: number } = {};

      for (const wallet of state.wallets) {
        const address = wallet.publicKey.toBase58();
        newBalances[address] = await getWalletBalance(wallet.publicKey);
      }

      setState(prev => {
        const walletsList = formatWalletsList(
          prev.wallets,
          newBalances,
          prev.names,
          prev.activePubkey
        );
        return {
          ...prev,
          balances: newBalances,
          walletsList,
          isLoading: false,
        };
      });
    } catch (error) {
      console.error('Error refreshing balances:', error);
      setState(prev => ({...prev, isLoading: false}));
    }
  }, [state.wallets, formatWalletsList]);

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  return {
    ...state,
    loadWallets,
    selectWallet,
    refreshBalance,
    updateWalletName,
    removeWallet,
    refreshAllBalances,
  };
}
