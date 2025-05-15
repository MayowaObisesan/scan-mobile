import {requestContactPermission} from "~/services/contacts";
import {Alert} from "react-native";
import * as Contacts from "expo-contacts";
import {ContactInfo} from "~/hooks/useContacts";
import {db} from "~/db/index";
import {eq, or} from "drizzle-orm";
import {Profile, profiles, threads} from "~/db/schema";
import {supabase} from "~/supabase/client";
import {DBTables} from "~/types/enums";
import {threadRepository} from "~/db/threads";
import {convertLocalProfileToServerProfile} from "~/utils";
import {Profiles} from "~/types";
import { User } from "@supabase/supabase-js";
import {Contact} from "expo-contacts";

export const contactsRepository = {
  async getContactById(contactId: string): Promise<Contact | null> {
    const permissionGranted = await requestContactPermission();
    if (!permissionGranted) {
      Alert.alert("PERMISSION REQUIRED", "We need your permission to access your contacts");
      return null;
    }

    const {data: allContacts} = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Name,
        Contacts.Fields.ID,
        Contacts.Fields.FirstName,
        Contacts.Fields.LastName,
        Contacts.Fields.PhoneticFirstName,
        Contacts.Fields.PhoneticLastName,
        Contacts.Fields.RawImage,
        Contacts.Fields.Birthday,
      ],
      sort: Contacts.SortTypes.FirstName
    });

    const contact = allContacts.find(contact => contact.id === contactId);
    return contact || null;
  },

  async getContactByName(name: string): Promise<Contact | null> {
    const permissionGranted = await requestContactPermission();
    if (!permissionGranted) {
      Alert.alert("PERMISSION REQUIRED", "We need your permission to access your contacts");
      return null;
    }

    const {data: allContacts} = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Name,
        Contacts.Fields.ID,
        Contacts.Fields.FirstName,
        Contacts.Fields.LastName,
        Contacts.Fields.PhoneticFirstName,
        Contacts.Fields.PhoneticLastName,
        Contacts.Fields.RawImage,
        Contacts.Fields.Birthday,
      ],
      sort: Contacts.SortTypes.FirstName
    });

    const contact = allContacts.find(contact => contact.name.toLowerCase() === name.toLowerCase());
    return contact || null;
  },

  async getContactByPhone(phoneNumber: string): Promise<Contact & { phone: string } | null> {
    const permissionGranted = await requestContactPermission();
    if (!permissionGranted) {
      Alert.alert("PERMISSION REQUIRED", "We need your permission to access your contacts");
      return null;
    }

    if (!phoneNumber) {
      return null;
    }

    // Check cache first
    const normalizedPhoneNumber = phoneNumber.replace(/\D/g, '');

    const {data: allContacts} = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Name,
        Contacts.Fields.ID,
        Contacts.Fields.FirstName,
        Contacts.Fields.LastName,
        Contacts.Fields.PhoneticFirstName,
        Contacts.Fields.PhoneticLastName,
        Contacts.Fields.RawImage,
        Contacts.Fields.Birthday,
      ],
      sort: Contacts.SortTypes.FirstName
    });

    const contact = allContacts.find(contact => contact.phoneNumbers?.some(phoneObj => phoneObj.number === normalizedPhoneNumber));
    if (contact) {
      (contact as Contact & { phone: string }).phone = normalizedPhoneNumber;
    }
    return contact || null;
  },

  async myContacts(): Promise<undefined | {flatPhones: Set<string>; phoneToContact: Map<string, ContactInfo>}> {
    const permissionGranted = await requestContactPermission();
    if (!permissionGranted) {
      Alert.alert("PERMISSION REQUIRED", "We need your permission to access your contacts");
      return;
    }

    const {data: allContacts} = await Contacts.getContactsAsync({
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

    return {flatPhones, phoneToContact};
  },

  async myChatContactsProfile(user: User) {
    const myContacts = await contactsRepository.myContacts();
    const localChatThreadsData = await threadRepository.getLocalChatThreads(user!);
    const ContactsProfile = await db.query.profiles.findMany() as Profile[];
    console.log("MY CHAT CONTACTS PROFILE - LOCAL CHAT THREADS", myContacts?.flatPhones.size, localChatThreadsData.length, ContactsProfile.length);

    const data = convertLocalProfileToServerProfile(ContactsProfile);
    console.log("MY CHAT CONTACTS PROFILE DATA", data.length)
    const result = data.map((profile: Profiles) => {
      const contactInfo = myContacts?.phoneToContact.get(profile.phone);
      const chatThread = localChatThreadsData?.find(thread => thread.user1Id === profile.id && thread.user2Id === user?.id || thread.user1Id === user?.id && thread.user2Id === profile.id);
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

    console.log("MY CHAT CONTACTS PROFILE", result.length)
    return result;
  }
}
