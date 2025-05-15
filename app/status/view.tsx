import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useSearchParams } from 'expo-router';
import { PageBody, PageContainer, PageHeader, PageHeading } from '~/components/PageSection';

interface StatusUpdate {
  id: string;
  userId: string;
  username: string;
  content: string;
  type: 'text' | 'image';
  timestamp: Date;
}

export default function ViewStatusScreen() {
  const router = useRouter();
  const { id } = useSearchParams();
  const [status, setStatus] = useState<StatusUpdate | null>(null);

  useEffect(() => {
    // Replace with your backend API call to fetch the status by ID
    const fetchStatus = async () => {
      const fetchedStatus = {} as StatusUpdate;

      if (isStatusExpired(fetchedStatus)) {
        alert('This status has expired');
        router.back();
        return;
      }

      // Mock data for demonstration
      const mockStatus: StatusUpdate = {
        id: id as string,
        userId: '123',
        username: 'John Doe',
        content: 'https://via.placeholder.com/300', // Replace with actual content
        type: 'image', // or 'text'
        timestamp: new Date(),
      };
      setStatus(mockStatus);
    };

    fetchStatus();
  }, [id]);

  if (!status) {
    return (
      <PageContainer>
        <PageHeader>
          <PageHeading>Loading...</PageHeading>
        </PageHeader>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <PageHeading>{status.username}'s Status</PageHeading>
      </PageHeader>

      <PageBody>
        {status.type === 'image' ? (
          <Image source={{ uri: status.content }} style={styles.image} />
        ) : (
          <Text style={styles.text}>{status.content}</Text>
        )}
        <Text style={styles.timestamp}>
          {new Date(status.timestamp).toLocaleString()}
        </Text>
      </PageBody>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  backButton: {
    color: '#007bff',
    fontSize: 16,
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 20,
  },
  text: {
    fontSize: 18,
    marginBottom: 20,
  },
  timestamp: {
    fontSize: 14,
    color: '#888',
    marginTop: 10,
  },
});
