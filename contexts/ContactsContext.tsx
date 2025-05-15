// contexts/ContactsContext.tsx
import React, {createContext, useContext} from 'react';
import {
  I_ChatContactsHooksData,
  I_PhoneContactsHooksData,
  useChatContacts, useChatContactsProfile,
  usePhoneContacts
} from '~/hooks/useContacts';
import {User} from "@supabase/auth-js";

interface PhoneContactsContextType extends I_PhoneContactsHooksData {
}

interface ChatContactsContextType extends I_ChatContactsHooksData {
}

const ContactsContext = createContext<{} | undefined>(undefined);
const PhoneContactsContext = createContext<PhoneContactsContextType | undefined>(undefined);
const ChatContactsContext = createContext<ChatContactsContextType | undefined>(undefined);

export function ContactsProvider({authUser, children}: { authUser: User; children: React.ReactNode }) {
  return (
    <ContactsContext.Provider value={{authUser}}>
      <PhoneContactsProvider authUser={authUser}>
        <ChatContactsProvider authUser={authUser}>
          {children}
        </ChatContactsProvider>
      </PhoneContactsProvider>
    </ContactsContext.Provider>
  );
}

export function PhoneContactsProvider({authUser, children}: { authUser: User; children: React.ReactNode }) {
  const phoneContactsData = usePhoneContacts();

  return (
    <PhoneContactsContext.Provider value={phoneContactsData}>
      {children}
    </PhoneContactsContext.Provider>
  );
}

export function ChatContactsProvider({authUser, children}: { authUser: User; children: React.ReactNode }) {
  const chatContactsData = useChatContacts(authUser);
  const {data: chatContactsProfileData} = useChatContactsProfile(authUser);

  return (
    <ChatContactsContext.Provider value={{...chatContactsData, ...chatContactsProfileData}}>
      {children}
    </ChatContactsContext.Provider>
  );
}

export function useContactsContext() {
  const context = useContext(ContactsContext);
  if (!context) {
    throw new Error('useContactsContext must be used within a ContactsProvider');
  }
  return context;
}

export function usePhoneContactsContext() {
  const context = useContext(PhoneContactsContext);
  if (!context) {
    throw new Error('usePhoneContactsContext must be used within a ContactsProvider');
  }
  return context;
}

export function useChatContactsContext() {
  const context = useContext(ChatContactsContext);
  if (!context) {
    throw new Error('useChatContactsContext must be used within a ContactsProvider');
  }
  return context;
}
