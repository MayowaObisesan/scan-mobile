import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuthContext } from "~/contexts/AuthContext";
import { PageBody, PageContainer, PageHeader, PageHeading } from "~/components/PageSection";
import { MaterialIcons } from '@expo/vector-icons';

// Add to your types/interfaces
interface StatusUpdate {
  id: string;
  userId: string;
  username: string;
  content: string;
  type: 'text' | 'image';
  timestamp: Date;
  viewed: boolean;
  expiresAt: Date; // New field
}

// Utility functions for status expiry
const STATUS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const isStatusExpired = (status: StatusUpdate) => {
  const now = new Date();
  return now > new Date(status.expiresAt);
};

const calculateExpiryTime = () => {
  const now = new Date();
  return new Date(now.getTime() + STATUS_DURATION_MS);
};

export default function StatusScreen() {
  const { user } = useAuthContext();
  const [myStatus, setMyStatus] = useState<StatusUpdate[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<StatusUpdate[]>([]);

  useEffect(() => {
    const fetchStatuses = async () => {
      // Replace with your API call
      const fetchedStatuses = []; // Your fetched statuses

      // Filter out expired statuses
      const activeStatuses = fetchedStatuses.filter(status => !isStatusExpired(status));
      setRecentUpdates(activeStatuses);
    };

    fetchStatuses();

    // Set up periodic cleanup
    const cleanup = setInterval(fetchStatuses, 60000); // Check every minute
    return () => clearInterval(cleanup);
  }, []);

  const handleAddStatus = () => {
    router.push('/status/new');
  };

  const renderStatusItem = ({ item }: { item: StatusUpdate }) => {
    // Add time remaining calculation
    const timeRemaining = new Date(item.expiresAt).getTime() - new Date().getTime();
    const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)));

    return (
      <TouchableOpacity
        className="flex-row items-center p-4 border-b border-gray-200"
        onPress={() => router.push(`/status/view/${item.id}`)}
      >
        {/* Existing image and user info */}
        <View className="flex-1">
          <Text className="font-bold">{item.username}</Text>
          <Text className="text-gray-500">
            {`${hoursRemaining}h remaining`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageHeading>Status</PageHeading>
      </PageHeader>

      <PageBody>
        <TouchableOpacity
          className="flex-row items-center p-4 border-b border-gray-200"
          onPress={handleAddStatus}
        >
          <View className="h-12 w-12 rounded-full bg-gray-300 mr-4">
            <View className="absolute right-0 bottom-0 bg-blue-500 rounded-full p-1">
              <MaterialIcons name="add" size={20} color="white" />
            </View>
          </View>
          <View>
            <Text className="font-bold">My Status</Text>
            <Text className="text-gray-500">Tap to add status update</Text>
          </View>
        </TouchableOpacity>

        <View className="mt-4">
          <Text className="px-4 py-2 text-gray-500 font-medium">Recent updates</Text>
          <FlatList
            data={recentUpdates}
            keyExtractor={(item) => item.id}
            renderItem={renderStatusItem}
            ListEmptyComponent={
              <View className="p-4">
                <Text className="text-center text-gray-500">No recent updates</Text>
              </View>
            }
          />
        </View>
      </PageBody>
    </PageContainer>
  );
}
