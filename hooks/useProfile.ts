// hooks/useProfile.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '~/supabase/client';
import {Profiles, Wallets} from "~/types";
import {DBTables} from "~/types/enums";
import {profileRepository} from "~/db/profiles";

export interface I_Profile {
  id: string;
  username: string;
  phone: string;
  avatar_url: string | null;
  wallet: string;
  bio?: string;
  risk_threshold?: number;
  risk_alerts_enabled?: boolean;
}

interface UpdateProfileData {
  username?: string;
  avatar_url?: string;
  bio?: string;
  risk_threshold?: number;
  risk_alerts_enabled?: boolean;
}

// Reusable query function
export const fetchProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from(DBTables.Profiles)
    .select('*, wallets(*)')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

export function useProfile(userId: string) {
  return useQuery({
    queryKey: ['profile', userId],
    // queryFn: () => fetchProfile(userId),
    queryFn: () => profileRepository.getProfileById(userId),
    enabled: !!userId,
    // Add caching configuration
    staleTime: 15 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep data in cache for 30 minutes
    // Don't refetch on window focus for mobile
    refetchOnWindowFocus: false,
    // Keep previous data while fetching new data
    placeholderData: keepPreviousData,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: UpdateProfileData }) => {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', userId);

      if (error) throw error;
    },
    // Optimistically update the cache
    onMutate: async (newProfile) => {
      await queryClient.cancelQueries({ queryKey: ['profile', newProfile.userId] })
      const previousProfile = queryClient.getQueryData(['profile'])

      queryClient.setQueryData(['profile', newProfile.userId], newProfile.data)

      return { previousProfile }
    },
    // If mutation fails, roll back
    onError: (err, newProfile, context) => {
      queryClient.setQueryData(['profile', newProfile.userId], context?.previousProfile)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profile', variables.userId] });
    },
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
}

export function useSearchProfiles() {
  return useMutation({
    mutationFn: async (query: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      return data as I_Profile[];
    },
  });
}
