// contexts/ProfileContext.tsx
import React, { createContext, useContext } from 'react';
import { useProfile, useUpdateProfile } from '~/hooks/useProfile';
import { useAuth } from '~/hooks/useAuth';
import { Profiles, ProfilesInsert } from '~/types';
import { useEmojiAvatar } from '~/hooks/useEmojiAvatar';
import { useSyncProfile } from '~/hooks/useSyncProfile';

interface ProfileContextType {
  profile: Profiles | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateProfile: (data: Partial<ProfilesInsert>) => Promise<void>;
  avatar: {
    emoji: string | null;
    isLoading: boolean;
    saveEmoji: (emoji: string) => Promise<boolean>;
    removeEmoji: () => Promise<boolean>;
    refreshEmoji: () => Promise<void>;
  };
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: profile, isLoading, error, refetch } = useProfile(user?.id!);
  const updateProfileMutation = useUpdateProfile();
  const { emoji, isLoading: emojiLoading, saveEmoji, removeEmoji, refreshEmoji } = useEmojiAvatar();

  // Enable background sync for profile
  useSyncProfile(user?.id!);

  const value = {
    profile: profile ?? null,
    isLoading,
    error,
    refetch,
    updateProfile: async (data: Partial<ProfilesInsert>) => {
      await updateProfileMutation.mutateAsync({
        userId: user?.id!,
        data
      });
    },
    avatar: {
      emoji,
      isLoading: emojiLoading,
      saveEmoji,
      removeEmoji,
      refreshEmoji
    }
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfileContext() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfileContext must be used within a ProfileProvider');
  }
  return context;
}
