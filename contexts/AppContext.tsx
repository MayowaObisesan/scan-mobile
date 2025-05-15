// contexts/AppDataContext.tsx
import React, { createContext, useContext, useMemo } from 'react'
import { useAuth } from '~/hooks/useAuth'
import { useProfile, useUpdateProfile } from '~/hooks/useProfile'
import { useWallets } from '~/hooks/useWallets'
import { useContactInfo } from '~/hooks/useContacts'
import { WalletData } from '~/hooks/useWallets'
import { ContactInfo } from '~/hooks/useContacts'
import {Profiles, ProfilesInsert} from "~/types";
import {AuthProvider} from "~/contexts/AuthContext";
import {ContactsProvider} from "~/contexts/ContactsContext";
import {ProfileProvider} from "~/contexts/ProfileContext";
import {WalletProvider} from "~/contexts/WalletContext";
import {ChatsProvider} from "~/contexts/ChatsContext";

interface AppDataContextState {
  // Auth
  user: {
    id: string | null
    phone: string | null
    email: string | null
  } | null
  isAuthenticated: boolean
  authLoading: boolean

  // Profile
  profile: Profiles | null
  profileLoading: boolean
  updateProfile: (data: Partial<ProfilesInsert>) => Promise<void>

  // Wallets
  wallets: {
    list: WalletData[]
    active: WalletData | null
    isLoading: boolean
    selectWallet: (pubkey: string) => Promise<void>
    refreshBalance: (pubkey: string) => Promise<void>
    updateName: (pubkey: string, name: string) => Promise<void>
    remove: (pubkey: string) => Promise<void>
  }

  // Contacts
  contacts: {
    info: ContactInfo | null
    isLoading: boolean
    refresh: () => Promise<void>
  }
}

const AppDataContext = createContext<AppDataContextState | undefined>(undefined)

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id!)
  const updateProfile = useUpdateProfile()
  const {
    walletsList,
    activeWallet,
    isLoading: walletsLoading,
    selectWallet,
    refreshBalance,
    updateWalletName,
    removeWallet,
  } = useWallets()
  const { contactInfo, isLoading: contactsLoading, refetch: refreshContacts } = useContactInfo(profile?.phone)

  const value = useMemo(() => ({
    // Auth state
    user: user ? {
      id: user.id,
      phone: user.phone ?? null,
      email: user.email ?? null
    } : null,
    isAuthenticated: !!user,
    authLoading,

    // Profile state
    profile: profile ?? null,
    profileLoading,
    updateProfile,

    // Wallets state
    wallets: {
      list: walletsList,
      active: activeWallet ? {
        id: activeWallet.publicKey.toBase58(),
        name: activeWallet.publicKey.toBase58(),
        address: activeWallet.publicKey.toBase58(),
        keypair: activeWallet,
        chain: 'solana',
        isActive: true,
        balance: 0
      } : null,
      isLoading: walletsLoading,
      selectWallet,
      refreshBalance,
      updateName: updateWalletName,
      remove: removeWallet
    },

    // Contacts state
    contacts: {
      info: contactInfo,
      isLoading: contactsLoading,
      refresh: refreshContacts
    }
  }), [
    user, authLoading,
    profile, profileLoading, updateProfile,
    walletsList, activeWallet, walletsLoading,
    contactInfo, contactsLoading
  ])

  return (
    <AppDataContext.Provider value={value}>
      <AuthProvider>
        <ContactsProvider authUser={user!}>
          <ProfileProvider>
            <WalletProvider>
              {children}
            </WalletProvider>
          </ProfileProvider>
        </ContactsProvider>
      </AuthProvider>
    </AppDataContext.Provider>
  )
}

export function useAppDataContext() {
  const context = useContext(AppDataContext)
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider')
  }
  return context
}
