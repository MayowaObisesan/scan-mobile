import {type NewProfile, Profile, profiles, wallets} from "~/db/schema";
import {db} from "~/db/index";
import { eq } from "drizzle-orm";
import AsyncStorage from "expo-sqlite/kv-store";
import {PROFILES_CACHE_KEY} from "~/lib/constants";

export const profileRepository = {
  async saveProfilesToKVStore(profiles: Profile[]): Promise<boolean> {
    try {
      AsyncStorage.setItem(PROFILES_CACHE_KEY, JSON.stringify(profiles));
      return true;
    } catch(err) {
      console.error(err as any);
      return false;
    }
  },

  async getProfilesFromKVStore() {
    return AsyncStorage.getItem(PROFILES_CACHE_KEY);
  },

  async create(newProfiles: NewProfile[]): Promise<Profile[]> {
    return db
      .insert(profiles)
      .values(newProfiles)
      // .onConflictDoNothing()
      .onConflictDoUpdate({
        target: profiles.phone,
        set: {
          username: profiles.username,
          avatarUrl: profiles.avatarUrl,
          phone: profiles.phone,
          bio: profiles.bio,
          createdAt: profiles.createdAt,
          expoPushToken: profiles.expoPushToken,
          riskAlertsEnabled: profiles.riskAlertsEnabled,
          wallets: profiles.wallets,
        }
      })
      .returning();
  },

  async createOrUpdate(newProfiles: NewProfile[]): Promise<Profile[]> {
    return newProfiles.map((profile: NewProfile) => {
      return db
        .insert(profiles)
        .values(profile)
        .onConflictDoUpdate({
          target: profiles.phone,
          set: {
            username: profiles.username,
            avatarUrl: profiles.avatarUrl,
            phone: profiles.phone,
            bio: profiles.bio,
            createdAt: profiles.createdAt,
            expoPushToken: profiles.expoPushToken,
            riskAlertsEnabled: profiles.riskAlertsEnabled,
            wallets: profiles.wallets,
          }
        })
        .returning()
    });
  },

  async getProfiles(): Promise<Profile[]> {
    return db.query.profiles.findMany();
  },

  async getProfileById(id: string): Promise<Profile | null> {
    console.log("Get profile by ID - id", id);
    const data = await db
      .select({
        id: profiles.id,
        username: profiles.username,
        phone: profiles.phone,
        avatarUrl: profiles.avatarUrl,
        bio: profiles.bio,
        expoPushToken: profiles.expoPushToken,
        riskThreshold: profiles.riskThreshold,
        riskAlertsEnabled: profiles.riskAlertsEnabled,
        wallets: wallets,
        createdAt: profiles.createdAt,
      })
      .from(profiles)
      .leftJoin(wallets, eq(profiles.id, wallets.owner))
      .where(eq(profiles.id, id))
      .limit(1);

    console.log("Get profile by ID", id, data);
    return data?.[0] || null;
  },

  async getProfileByName(name: string): Promise<Profile | null> {
    const data = await db
      .select()
      .from(profiles)
      .where(eq(profiles.name, name))
      .limit(1);

    return data?.[0] || null;
  },

  async getProfileByPhoneNumber(phoneNumber: string): Promise<Profile | null> {
    const data = await db
      .select()
      .from(profiles)
      .where(eq(profiles.phone, phoneNumber))
      .limit(1);

    return data?.[0] || null;
  },

  async deleteAllProfile() : Promise<void> {
    await db.delete(profiles);
  },

  async deleteProfile(id: string): Promise<void> {
    await db.delete(profiles).where(eq(profiles.id, id));
  },
}
