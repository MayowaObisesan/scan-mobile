// contexts/WalletContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react'
import { Keypair, PublicKey } from '@solana/web3.js'
import {
  getWallets,
  getActiveWallet,
  setActiveWallet,
  getWalletBalance,
  setWalletName,
  deleteWallet,
  generateWallet
} from '~/solana/wallet'
import { useWallets } from '~/hooks/useWallets'

export interface WalletData {
  id: string
  name: string
  address: string
  keypair: Keypair
  chain: 'solana'
  isActive: boolean
  balance: number
}

interface WalletContextState {
  wallets: Keypair[];
  walletsList: WalletData[]
  activePubkey: string | null
  activeWallet: Keypair | null
  balances: { [key: string]: number };
  // isLoading: boolean
  // error: Error | null
  selectWallet: (pubkey: string) => Promise<void>
  refreshBalance: (pubkey: string) => Promise<void>
  updateWalletName: (pubkey: string, name: string) => Promise<void>
  removeWallet: (pubkey: string) => Promise<void>
  addWallet: () => Promise<void>
  loadWallets: () => Promise<void>
}

const WalletContext = createContext<WalletContextState | undefined>(undefined)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // const [wallets, setWallets] = useState<Keypair[]>([])
  // const [walletsList, setWalletsList] = useState<WalletData[]>([])
  // const [activeWallet, setActiveWalletState] = useState<Keypair | null>(null)
  // const [isLoading, setIsLoading] = useState(true)
  // const [error, setError] = useState<Error | null>(null)
  const {activePubkey, activeWallet, loadWallets, selectWallet, refreshBalance, removeWallet, updateWalletName, wallets, walletsList} = useWallets();

  /*const loadWallets = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Load wallets and active wallet
      const [wallets, active] = await Promise.all([
        getWallets(),
        getActiveWallet()
      ])

      // Get balances for each wallet
      const walletsWithData = await Promise.all(
        wallets.map(async (keypair): Promise<WalletData> => {
          const pubkey = keypair.publicKey.toBase58()
          const balance = await getWalletBalance(keypair.publicKey)

          return {
            id: pubkey,
            name: pubkey,
            address: pubkey,
            keypair,
            chain: 'solana',
            isActive: active?.publicKey.toBase58() === pubkey,
            balance
          }
        })
      )

      setWallets(wallets)
      setWalletsList(walletsWithData)
      setActiveWalletState(active)

    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load wallets'))
      console.error('Error loading wallets:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const selectWallet = async (pubkey: string) => {
    try {
      await setActiveWallet(pubkey)
      const wallet = walletsList.find(w => w.id === pubkey)?.keypair || null
      setActiveWalletState(wallet)

      setWalletsList(current =>
        current.map(w => ({
          ...w,
          isActive: w.id === pubkey
        }))
      )
    } catch (e) {
      console.error('Error selecting wallet:', e)
      throw e
    }
  }

  const refreshBalance = async (pubkey: string) => {
    try {
      const balance = await getWalletBalance(new PublicKey(pubkey))
      setWalletsList(current =>
        current.map(w => w.id === pubkey ? { ...w, balance } : w)
      )
    } catch (e) {
      console.error('Error refreshing balance:', e)
      throw e
    }
  }

  const updateWalletName = async (pubkey: string, name: string) => {
    try {
      await setWalletName(pubkey, name)
      setWalletsList(current =>
        current.map(w => w.id === pubkey ? { ...w, name } : w)
      )
    } catch (e) {
      console.error('Error updating wallet name:', e)
      throw e
    }
  }

  const removeWallet = async (pubkey: string) => {
    try {
      await deleteWallet(pubkey)
      setWalletsList(current => current.filter(w => w.id !== pubkey))
      setWallets(current => current.filter(w => w.publicKey.toBase58() !== pubkey))
    } catch (e) {
      console.error('Error removing wallet:', e)
      throw e
    }
  }*/

  const addWallet = async () => {
    try {
      const newWallet = await generateWallet()
      const balance = await getWalletBalance(newWallet.publicKey)

      const walletData: WalletData = {
        id: newWallet.publicKey.toBase58(),
        name: newWallet.publicKey.toBase58(),
        address: newWallet.publicKey.toBase58(),
        keypair: newWallet,
        chain: 'solana',
        isActive: false,
        balance
      }

      // setWalletsList(current => [...current, walletData])
      // setWallets(current => [...current, newWallet])
      walletsList.push(walletData)
      wallets.push(newWallet)
    } catch (e) {
      console.error('Error adding wallet:', e)
      throw e
    }
  }

  useEffect(() => {
    loadWallets()
  }, [])

  return (
    <WalletContext.Provider value={{
      wallets,
      walletsList,
      activeWallet,
      activePubkey: activeWallet && activeWallet.publicKey.toBase58(),
      balances: walletsList.reduce((acc, wallet) => {
        acc[wallet.id] = wallet.balance
        return acc
      }, {} as Record<string, number>),
      // isLoading,
      // error,
      selectWallet,
      refreshBalance,
      updateWalletName,
      removeWallet,
      addWallet,
      loadWallets,
    }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWalletContext() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWalletContext must be used within WalletProvider')
  }
  return context
}
