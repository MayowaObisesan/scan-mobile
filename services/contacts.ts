// Fetch device contacts and match with supabase
// import Contacts from 'react-native-contacts'
// import { Platform, PermissionsAndroid } from 'react-native'
import { supabase } from '~/supabase/client'
import * as Contacts from 'expo-contacts';

let contactsCache: { timestamp: number; data: any[] } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function invalidateContactsCache() {
  contactsCache = null;
}

export async function requestContactPermission() {
  /*if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CONTACTS)
    console.log("granted", granted)
    return granted === PermissionsAndroid.RESULTS.GRANTED
  } else {
    const permission = await Contacts.requestPermission()
    return permission === 'authorized'
  }*/

  const { granted } = await Contacts.requestPermissionsAsync()
  return granted
}

export async function getChatContacts(): Promise<{ id: string; name: string, phone: string }[]> {
  // Check cache first
  if (contactsCache && Date.now() - contactsCache.timestamp < CACHE_DURATION) {
    return contactsCache.data;
  }

  const permissionGranted = await requestContactPermission()
  if (!permissionGranted) return []

  try {
    // const allContacts = await Contacts.getAll()
    // console.log("all Contacts", allContacts);

    // Optimize fields selection
    const { data: allContacts } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name, Contacts.Fields.ID],
      sort: Contacts.SortTypes.FirstName
    });

    // Use Set instead of Array for faster lookups
    const flatPhones = new Set<string>();
    const phoneToContact = new Map<string, { name: string, id: string }>();

    // Batch process contacts
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
                name: contact.name || '',
                id: contact.id || ''
              });
            }
          }
        });
      });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select("id, phone, username")  // Select only needed fields
      .in('phone', Array.from(flatPhones))

    if (error) throw error;

    const result = data.map(user => ({
      id: user.id,
      name: phoneToContact.get(user.phone)?.name || user.username || user.phone,
      phone: user.phone
    }));

    // Update cache
    contactsCache = {
      timestamp: Date.now(),
      data: result
    };

    return result;
  } catch (e) {
    console.error("Error fetching contacts:", e)
    return []
  }
}

export async function getContactInfo(phoneNumber: string): Promise<{ name: string; id: string; phone: string } | null> {
  const permissionGranted = await requestContactPermission()
  if (!permissionGranted) return null

  try {
    const { data: allContacts } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name, Contacts.Fields.ID],
    });

    // Find matching contact
    for (const contact of allContacts) {
      for (const phoneObj of contact.phoneNumbers || []) {
        if (phoneObj.number) {
          const number = phoneObj.number.replace(/\D/g, '');
          if (number === phoneNumber.replace(/\D/g, '')) {
            return {
              name: contact.name || '',
              id: contact.id || '',
              phone: number
            }
          }
        }
      }
    }

    return null
  } catch (e) {
    console.error("Error fetching contact info", e)
    return null
  }
}

/*
* USAGE EXAMPLE:
* const handleSearch = async (text: string, page: number) => {
  setQuery(text)
  if (text.length < 2) return setResults([])

  setLoading(true)
  const res = await searchContacts(text, true, page, 10) // 10 results per page
  setResults(res)
  setLoading(false)

  // When contacts need to be refreshed
  invalidateContactsCache();
}
* */
const memoizedResults = new Map<string, any[]>();

export async function searchContacts(
  query: string,
  sort: boolean = true,
  page: number = 1,
  limit: number = 10
): Promise<{ id: string; name: string; phone: string }[]> {
  if (!query.trim()) return [];

  const cacheKey = `${query}-${sort}-${page}-${limit}`;
  if (memoizedResults.has(cacheKey)) {
    return memoizedResults.get(cacheKey)!;
  }

  const allContacts = await getChatContacts();
  const lowerCaseQuery = query.toLowerCase();

  const filteredContacts = allContacts.filter(contact =>
    contact.name.toLowerCase().includes(lowerCaseQuery) ||
    contact.phone.includes(query)
  );

  if (sort) {
    filteredContacts.sort((a, b) => {
      const nameComparison = a.name.localeCompare(b.name);
      return nameComparison !== 0 ? nameComparison : a.phone.localeCompare(b.phone);
    });
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const results = filteredContacts.slice(startIndex, endIndex);

  memoizedResults.set(cacheKey, results);
  return results;
}
