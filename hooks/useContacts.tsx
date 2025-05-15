// hooks/useContacts.ts
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as Contacts from 'expo-contacts';
import { requestContactPermission } from '~/services/contacts';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '~/supabase/client';
import {Contact, ContactType} from "expo-contacts";
import {DBTables} from "~/types/enums";
import {useAuth} from "~/hooks/useAuth";
import {Profiles} from "~/types";
import {useUser} from "~/hooks/useUser";
import {useAuthContext} from "~/contexts/AuthContext";
import {User} from "@supabase/auth-js";
import {getCachedThread} from "~/services/chat";
import {threadRepository} from "~/db/threads";
import {Thread, threads} from "~/db/schema";
import { db } from '~/db';
import {eq, or} from "drizzle-orm";
import {profileRepository} from "~/db/profiles";
import {contactsRepository} from "~/db/contacts";
import {useQuery} from "@tanstack/react-query";

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  setItemsPerPage: (items: number) => void;
}

export interface I_ContactsHooksData {
  totalContacts: number;
  isLoading: boolean;
  error: Error | null;
  refetch: (force?: boolean) => Promise<void>;
  invalidateCache: () => void;
  searchContacts: (query: string) => void;
  searchQuery: string;
  pagination: PaginationInfo;
}

export interface I_PhoneContactsHooksData extends I_ContactsHooksData{
  scanAccounts: ContactInfo[]
  phoneContacts: Contact[];
  sortContacts: (field: keyof Contact, order: 'asc' | 'desc') => void;
  sortConfig: {
    field: keyof Contact;
    order: 'asc' | 'desc';
  };
}

export interface I_ChatContactsHooksData extends I_ContactsHooksData{
  unpaginatedContacts: ContactInfo[];
  chatContacts: ContactInfo[];
  sortContacts: (field: keyof ContactInfo, order: 'asc' | 'desc') => void;
  sortConfig: {
    field: keyof ContactInfo;
    order: 'asc' | 'desc';
  };
}

export interface ContactInfo {
  id: string;
  name: string;
  phone: string;
  firstName: string | undefined;
  lastName: string | undefined;
  phoneticFirstName: string | undefined;
  phoneticLastName: string | undefined;
  namePrefix: string | undefined;
  birthday: Contacts.Date | undefined;
  rawImage: Contacts.Image | string | undefined;
  isMyContact: boolean;
  chatThread?: Thread;
}

const contactCache = new Map<string, ContactInfo>();

let chatContactsCache: { timestamp: number; scanContactsData: ContactInfo[]; contactsData?: Contact[] } | null = null;
let phoneContactsCache: { timestamp: number; scanContactsData: ContactInfo[]; contactsData?: Contact[] } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function chatContacts() {
  await contactsRepository.myContacts();
}

export function useChatContactsProfile(user: User) {
  return useQuery({
    queryKey: ['contacts-profile', user?.id],
    queryFn: () => contactsRepository.myChatContactsProfile(user),
    // staleTime: Infinity, // Cache the result indefinitely
    // staleTime: 10 * 60 * 60, // Cache for 1 minute
    // gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour,
  });
}

export function useContactInfo(phoneNumber: string) {
  return useQuery({
    queryKey: ['contacts-info', phoneNumber],
    queryFn: () => contactsRepository.getContactByPhone(phoneNumber),
  })
}

export function useChatContacts(user: User) {
  const [scanContacts, setScanContacts] = useState<ContactInfo[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ContactInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const appState = useRef(AppState.currentState);

  // Sort state
  const [sortConfig, setSortConfig] = useState<{
    field: keyof ContactInfo;
    order: 'asc' | 'desc';
  }>({ field: 'name', order: 'asc' });

  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  const fetchContacts = useCallback(async (force = false) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      if (!force && chatContactsCache && Date.now() - chatContactsCache.timestamp < CACHE_DURATION) {
        setScanContacts(chatContactsCache.scanContactsData);
        console.log("USE CHAT CONTACTS - CONTACTS CACHE", chatContactsCache.scanContactsData);
        setIsLoading(false);
        return;
      }

      const permissionGranted = await requestContactPermission();
      if (!permissionGranted) {
        setScanContacts([]);
        return;
      }

      const { data: allContacts } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Name,
          Contacts.Fields.ID,
          Contacts.Fields.FirstName,
          Contacts.Fields.LastName,
          Contacts.Fields.PhoneticFirstName,
          Contacts.Fields.PhoneticLastName,
          Contacts.Fields.NamePrefix,
          Contacts.Fields.Birthday,
          Contacts.Fields.Image
        ],
        sort: Contacts.SortTypes.FirstName
      });

      const flatPhones = new Set<string>();
      const phoneToContact = new Map<string, ContactInfo>();

      const batchSize = 100;
      for (let i = 0; i < allContacts.length; i += batchSize) {
        const batch = allContacts.slice(i, i + batchSize);
        batch.forEach(contact => {
          (contact.phoneNumbers || []).forEach(phoneObj => {
            if (phoneObj.number) {
              const number = phoneObj.number.replace(/\D/g, '');
              if (number?.length >= 9) {
                flatPhones.add(number);
                phoneToContact.set(number, {
                  id: contact.id || '',
                  name: contact.name || '',
                  phone: number,
                  firstName: contact.firstName,
                  lastName: contact.lastName,
                  phoneticFirstName: contact.phoneticFirstName,
                  phoneticLastName: contact.phoneticLastName,
                  namePrefix: contact.namePrefix,
                  birthday: contact.birthday,
                  rawImage: contact.rawImage,
                  isMyContact: false,
                });
              }
            }
          });
        });
      }

      /*const {data: chatThreadsData} = await supabase
        .from(DBTables.ChatThreads)
        .select('*')
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`);*/

      // Fetch the thread Data now because we have fetched it at the load of this app,
      // and it is now in the local DB
      const chatThreadsData = await db.query.threads.findMany({
        where: or(
          eq(threads.user1Id, user?.id),
          eq(threads.user2Id, user?.id)
        )
      });
      // console.log("FETCHING CONTACTS", chatThreadsData);

      // Fetch all Profiles from the Local DB
      const data = await profileRepository.getProfiles()

      // const { data, error } = await supabase
      //   .from(DBTables.Profiles)
      //   .select("*")
      //   .in('phone', Array.from([...flatPhones, ...chatThreadsData || []]));

      // console.log("chatThreadsData", data, user?.id);

      if (error) throw error;

      const result = data.map((profile: Profiles) => {
        const contactInfo = phoneToContact.get(profile.phone);
        const chatThread = chatThreadsData?.find(thread => thread.user1Id === profile.id && thread.user2Id === user?.id || thread.user1Id === user?.id && thread.user2Id === profile.id);
        return {
          id: profile.id,
          name: contactInfo?.name || profile.username!,
          phone: contactInfo?.phone || profile.phone,
          firstName: contactInfo?.firstName,
          lastName: contactInfo?.lastName,
          phoneticFirstName: contactInfo?.phoneticFirstName,
          phoneticLastName: contactInfo?.phoneticLastName,
          namePrefix: contactInfo?.namePrefix,
          birthday: contactInfo?.birthday,
          rawImage: contactInfo?.rawImage || profile?.avatar_url!,
          isMyContact: !!contactInfo,
          chatThread: chatThread,
          // latestMessage: threadRepository.getLatestLocalThreadMessage(chatThread?.id!),
        };
      });

      chatContactsCache = {
        timestamp: Date.now(),
        scanContactsData: result,
      };

      setScanContacts(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch contacts'));
      console.error("Error fetching contacts:", e);
    } finally {
      setIsLoading(false);
    }
    // TODO: Remove this user once the auth user object has been securely stored on device
  }, [user]);

  // Sort contacts
  const sortContacts = useCallback((field: keyof ContactInfo, order: 'asc' | 'desc') => {
    setSortConfig({ field, order });
    setFilteredContacts(prev =>
      [...prev].sort((a, b) => {
        const aValue = a[field] || '';
        const bValue = b[field] || '';
        const comparison = String(aValue).localeCompare(String(bValue));
        return order === 'asc' ? comparison : -comparison;
      })
    );
  }, []);

  // Search contacts
  const searchContacts = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1); // Reset to first page when searching

    if (!query.trim()) {
      setFilteredContacts(scanContacts);
      return;
    }

    const normalizedQuery = query.toLowerCase();
    const results = scanContacts.filter(contact =>
      contact.name.toLowerCase().includes(normalizedQuery) ||
      contact.phone?.includes(normalizedQuery) ||
      contact.firstName?.toLowerCase().includes(normalizedQuery) ||
      contact.lastName?.toLowerCase().includes(normalizedQuery)
    );

    setFilteredContacts(results);
  }, [scanContacts]);

  // Get paginated results
  const paginatedContacts = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredContacts.slice(startIndex, endIndex);
  }, [filteredContacts, page, itemsPerPage]);

  // Calculate pagination info
  const paginationInfo = useMemo(() => ({
    currentPage: page,
    totalPages: Math.ceil(filteredContacts.length / itemsPerPage),
    totalItems: filteredContacts.length,
    hasNextPage: page < Math.ceil(filteredContacts.length / itemsPerPage),
    hasPreviousPage: page > 1
  }), [filteredContacts.length, page, itemsPerPage]);

  // Pagination controls
  const nextPage = useCallback(() => {
    if (paginationInfo.hasNextPage) {
      setPage(prev => prev + 1);
    }
  }, [paginationInfo.hasNextPage]);

  const previousPage = useCallback(() => {
    if (paginationInfo.hasPreviousPage) {
      setPage(prev => prev - 1);
    }
  }, [paginationInfo.hasPreviousPage]);

  const goToPage = useCallback((pageNumber: number) => {
    const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setPage(pageNumber);
    }
  }, [filteredContacts.length, itemsPerPage]);

  useEffect(() => {
    setFilteredContacts(scanContacts);
  }, [scanContacts]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        fetchContacts(true);
        console.log("USE CONTACTS PAGE - NEXT APP STATE", nextAppState);
      }
      appState.current = nextAppState;
    });

    fetchContacts(true);

    return () => {
      subscription.remove();
    };
  }, [fetchContacts]);

  const invalidateCache = useCallback(() => {
    chatContactsCache = null;
    fetchContacts(true);
  }, [fetchContacts]);

  return {
    unpaginatedContacts: scanContacts,
    chatContacts: paginatedContacts,
    totalContacts: filteredContacts.length,
    isLoading,
    error,
    refetch: fetchContacts,
    invalidateCache,
    // Search
    searchContacts,
    searchQuery,

    // Sort
    sortContacts,
    sortConfig,

    // Pagination
    pagination: {
      ...paginationInfo,
      nextPage,
      previousPage,
      goToPage,
      setItemsPerPage,
    }
  };
}

export function usePhoneContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [scanContacts, setScanContacts] = useState<ContactInfo[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const appState = useRef(AppState.currentState);

  // Sort state
  const [sortConfig, setSortConfig] = useState<{
    field: keyof Contact;
    order: 'asc' | 'desc';
  }>({ field: 'name', order: 'asc' });

  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  const fetchContacts = useCallback(async (force = false) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!force && phoneContactsCache && Date.now() - phoneContactsCache.timestamp < CACHE_DURATION) {
        setContacts(phoneContactsCache.contactsData!);
        setScanContacts(phoneContactsCache.scanContactsData);
        setIsLoading(false);
        return;
      }

      const permissionGranted = await requestContactPermission();
      if (!permissionGranted) {
        setScanContacts([]);
        setContacts([]);
        return;
      }

      const { data: allContacts } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Name,
          Contacts.Fields.ID,
          Contacts.Fields.FirstName,
          Contacts.Fields.LastName,
          Contacts.Fields.PhoneticFirstName,
          Contacts.Fields.PhoneticLastName,
          Contacts.Fields.NamePrefix,
          Contacts.Fields.Birthday,
          Contacts.Fields.Image
        ],
        sort: Contacts.SortTypes.FirstName
      });

      const flatPhones = new Set<string>();
      const phoneToContact = new Map<string, ContactInfo>();

      const batchSize = 100;
      for (let i = 0; i < allContacts.length; i += batchSize) {
        const batch = allContacts.slice(i, i + batchSize);
        batch.forEach(contact => {
          (contact.phoneNumbers || []).forEach(phoneObj => {
            if (phoneObj.number) {
              const number = phoneObj.number.replace(/\D/g, '');
              if (number?.length >= 9) {
                flatPhones.add(number);
                phoneToContact.set(number, {
                  id: contact.id || '',
                  name: contact.name || '',
                  phone: number,
                  firstName: contact.firstName,
                  lastName: contact.lastName,
                  phoneticFirstName: contact.phoneticFirstName,
                  phoneticLastName: contact.phoneticLastName,
                  namePrefix: contact.namePrefix,
                  birthday: contact.birthday,
                  rawImage: contact.rawImage,
                  isMyContact: false,
                });
              }
            }
          });
        });
      }

      const { data, error } = await supabase
        .from('profiles')
        .select("id, phone, username")
        .in('phone', Array.from(flatPhones));

      if (error) throw error;

      const result = data.map(user => {
        const contactInfo = phoneToContact.get(user.phone);
        return {
          id: user.id,
          name: contactInfo?.name || user.username || user.phone,
          phone: user.phone,
          firstName: contactInfo?.firstName,
          lastName: contactInfo?.lastName,
          phoneticFirstName: contactInfo?.phoneticFirstName,
          phoneticLastName: contactInfo?.phoneticLastName,
          namePrefix: contactInfo?.namePrefix,
          birthday: contactInfo?.birthday,
          rawImage: contactInfo?.rawImage,
          isMyContact: true, // always true because this is a return of data with registered accounts.
        };
      });

      phoneContactsCache = {
        timestamp: Date.now(),
        scanContactsData: result,
        contactsData: allContacts
      };

      setContacts(allContacts);
      setScanContacts(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch contacts'));
      console.error("Error fetching contacts:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sort contacts
  const sortContacts = useCallback((field: keyof Contact, order: 'asc' | 'desc') => {
    setSortConfig({ field, order });
    setFilteredContacts(prev =>
      [...prev].sort((a, b) => {
        const aValue = a[field] || '';
        const bValue = b[field] || '';
        const comparison = String(aValue).localeCompare(String(bValue));
        return order === 'asc' ? comparison : -comparison;
      })
    );
  }, []);

  // Search contacts
  const searchContacts = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1); // Reset to first page when searching

    if (!query.trim()) {
      setFilteredContacts(contacts);
      return;
    }

    const normalizedQuery = query.toLowerCase();
    const results = contacts.filter(contact =>
      contact.name.toLowerCase().includes(normalizedQuery) ||
      contact.phoneNumbers?.[0]?.number?.includes(normalizedQuery) ||
      contact.firstName?.toLowerCase().includes(normalizedQuery) ||
      contact.lastName?.toLowerCase().includes(normalizedQuery)
    );

    setFilteredContacts(results);
  }, [contacts]);

  // Get paginated results
  const paginatedContacts = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    // return filteredContacts.slice(startIndex, endIndex);
    return filteredContacts.slice(0, endIndex);
  }, [filteredContacts, page, itemsPerPage]);

  // Calculate pagination info
  const paginationInfo = useMemo(() => ({
    currentPage: page,
    totalPages: Math.ceil(filteredContacts.length / itemsPerPage),
    totalItems: filteredContacts.length,
    hasNextPage: page < Math.ceil(filteredContacts.length / itemsPerPage),
    hasPreviousPage: page > 1
  }), [filteredContacts.length, page, itemsPerPage]);

  // Pagination controls
  const nextPage = useCallback(() => {
    if (paginationInfo.hasNextPage) {
      setPage(prev => prev + 1);
    }
  }, [paginationInfo.hasNextPage]);

  const previousPage = useCallback(() => {
    if (paginationInfo.hasPreviousPage) {
      setPage(prev => prev - 1);
    }
  }, [paginationInfo.hasPreviousPage]);

  const goToPage = useCallback((pageNumber: number) => {
    const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setPage(pageNumber);
    }
  }, [filteredContacts.length, itemsPerPage]);

  useEffect(() => {
    setFilteredContacts(contacts);
  }, [contacts]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        fetchContacts(true);
      }
      appState.current = nextAppState;
    });

    fetchContacts(true);

    return () => {
      subscription.remove();
    };
  }, [fetchContacts]);

  const invalidateCache = useCallback(() => {
    phoneContactsCache = null;
    fetchContacts(true);
  }, [fetchContacts]);

  return {
    scanAccounts: scanContacts,
    phoneContacts: paginatedContacts,
    totalContacts: filteredContacts.length,
    isLoading,
    error,
    refetch: fetchContacts,
    invalidateCache,
    // Search
    searchContacts,
    searchQuery,

    // Sort
    sortContacts,
    sortConfig,

    // Pagination
    pagination: {
      ...paginationInfo,
      nextPage,
      previousPage,
      goToPage,
      setItemsPerPage,
    }
  };
}

export function useContactInfoOld(phoneNumber: string | undefined) {
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContactInfo = useCallback(async () => {
    if (!phoneNumber) {
      setContactInfo(null);
      return;
    }

    // Check cache first
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    if (contactCache.has(normalizedPhone)) {
      setContactInfo(contactCache.get(normalizedPhone)!);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const permissionGranted = await requestContactPermission();
      if (!permissionGranted) {
        throw new Error('Contacts permission not granted');
      }

      const { data: allContacts } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name, Contacts.Fields.ID],
      });

      for (const contact of allContacts) {
        for (const phoneObj of contact.phoneNumbers || []) {
          if (phoneObj.number) {
            const number = phoneObj.number.replace(/\D/g, '');
            if (number === normalizedPhone) {
              const info = {
                name: contact.name || '',
                id: contact.id || '',
                phone: number,
                firstName: contact.firstName,
                lastName: contact.lastName,
                phoneticFirstName: contact.phoneticFirstName,
                phoneticLastName: contact.phoneticLastName,
                namePrefix: contact.namePrefix,
                birthday: contact.birthday,
                rawImage: contact.rawImage,
                isMyContact: false
              };
              contactCache.set(normalizedPhone, info);
              setContactInfo(info);
              return;
            }
          }
        }
      }

      setContactInfo(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch contact info');
      console.error("Error in useContactInfo:", e);
    } finally {
      setIsLoading(false);
    }
  }, [phoneNumber]);

  useEffect(() => {
    fetchContactInfo();
  }, [fetchContactInfo, isLoading]);

  const refetch = useCallback(() => {
    if (phoneNumber) {
      contactCache.delete(phoneNumber.replace(/\D/g, ''));
    }
    fetchContactInfo();
  }, [phoneNumber, fetchContactInfo]);

  return {
    contactInfo,
    isLoading,
    error,
    refetch
  };
}
