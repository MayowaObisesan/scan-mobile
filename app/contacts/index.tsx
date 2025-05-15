import {
  View,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  TextInput,
  StyleSheet,
  ListRenderItem
} from "react-native";
import { usePhoneContactsContext } from "~/contexts/ContactsContext";
import { Text } from "~/components/ui/text";
import React, { useMemo, useState, useCallback, useRef, memo } from "react";
import { Contact } from "expo-contacts";
import { ContactInfo } from "~/hooks/useContacts";
import {PageBody, PageContainer, PageHeader, PageHeading} from "~/components/PageSection";
import {Avatar, AvatarFallback, AvatarImage} from "~/components/ui/avatar";
import { Link } from "expo-router";
import {Button} from "~/components/ui/button";

// Memoized contact item components to prevent unnecessary re-renders
const ScanContactItem = memo(({ contact }: { contact: ContactInfo }) => {
  return (
    <Link
      href={{
        pathname: '/chat/[userId]',
        params: {userId: contact.id}
      }}
      className="flex-row rounded-2xl"
    >
      <View style={styles.contactItem}>
        <View style={[styles.avatar, styles.scanAvatar]}>
          <Avatar alt="Profile Avatar" className="w-10 h-10">
            <AvatarImage
              source={{uri: contact.rawImage}}/>
            <AvatarFallback className={"bg-transparent"}>
              <Text style={[styles.avatarText, styles.scanAvatarText]}>
                {contact.name ? contact.name.charAt(0).toUpperCase() : "?"}
              </Text>
            </AvatarFallback>
          </Avatar>
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{contact.name}</Text>
          <Text className={""} style={styles.contactPhone}>{contact.phone}</Text>
        </View>
      </View>
    </Link>
  );
});

const PhoneContactItem = memo(({ contact }: { contact: Contact }) => {
  return (
    <View style={styles.contactItem}>
      <View style={[styles.avatar, styles.phoneAvatar]}>
        <Avatar alt="Profile Avatar" className="w-10 h-10">
          <AvatarImage source={{uri: contact.rawImage?.uri}} />
          <AvatarFallback className={"bg-transparent"}>
            <Text style={[styles.avatarText, styles.phoneAvatarText]}>
              {contact.name ? contact.name.charAt(0).toUpperCase() : "?"}
            </Text>
          </AvatarFallback>
        </Avatar>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{contact.name}</Text>
        {contact.phoneNumbers && contact.phoneNumbers[0] && (
          <Text className={""} style={styles.contactPhone}>{contact.phoneNumbers[0].number}</Text>
        )}
      </View>
      <Button size={"sm"} variant={"link"}>
        <Text className={"text-[0.5rem]"}>Invite to Scan</Text>
      </Button>
    </View>
  );
});

export default function ContactsPage() {
  const {
    phoneContacts,
    scanAccounts,
    isLoading,
    pagination,
    searchContacts,
    searchQuery,
    sortContacts,
    sortConfig,
    refetch
  } = usePhoneContactsContext();

  const [activeTab, setActiveTab] = useState<'scan' | 'phone'>('scan');
  const [refreshing, setRefreshing] = useState(false);

  // Filter out contacts that are in scanAccounts
  const filteredContacts = useMemo(() => {
    if (!phoneContacts || !scanAccounts) return [];

    // Create a set of normalized phone numbers from scanAccounts for faster lookup
    const scanAccountPhones = new Set(
      scanAccounts.map(account => account.phone.replace(/\D/g, ''))
    );

    // Filter phoneContacts to exclude those in scanAccounts
    return phoneContacts.filter(contact => {
      // Skip contacts without phone numbers
      if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) return false;

      // Check if any of the contact's phone numbers match a scanAccount
      return !contact.phoneNumbers.some(phoneObj => {
        const normalizedNumber = phoneObj.number.replace(/\D/g, '');
        return scanAccountPhones.has(normalizedNumber);
      });
    });
  }, [phoneContacts, scanAccounts]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch(true);
    setRefreshing(false);
  }, [refetch]);

  // Handle search input
  const handleSearch = useCallback((text: string) => {
    searchContacts(text);
  }, [searchContacts]);

  // Handle sort selection
  const handleSort = useCallback((field: keyof Contact) => {
    const newOrder = sortConfig.field === field && sortConfig.order === 'asc' ? 'desc' : 'asc';
    sortContacts(field, newOrder);
  }, [sortConfig, sortContacts]);

  // Handle loading more contacts when reaching the end of the list
  const handleLoadMore = useCallback(() => {
    if (pagination.hasNextPage) {
      pagination.nextPage();
    }
  }, [pagination]);

  // Render item functions for FlatList
  const renderScanContactItem: ListRenderItem<ContactInfo> = useCallback(({ item }) => {
    return <ScanContactItem contact={item} />;
  }, []);

  const renderPhoneContactItem: ListRenderItem<Contact> = useCallback(({ item }) => {
    return <PhoneContactItem contact={item} />;
  }, []);

  // Key extractors for FlatList
  const scanContactKeyExtractor = useCallback((item: ContactInfo) => item.id, []);
  const phoneContactKeyExtractor = useCallback((item: Contact) => item.id, []);

  return (
    <PageContainer>
      <PageHeader showBackButton>
        <PageHeading>Contacts</PageHeading>
      </PageHeader>

      <PageBody>
        <View style={styles.container}>
          {/* Tab Bar */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'scan' && styles.activeTab]}
              onPress={() => setActiveTab('scan')}
            >
              <Text style={[styles.tabText, activeTab === 'scan' ? styles.activeTabText : styles.inactiveTabText]}>
                Already using Scan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'phone' && styles.activeTab]}
              onPress={() => setActiveTab('phone')}
            >
              <Text style={[styles.tabText, activeTab === 'phone' ? styles.activeTabText : styles.inactiveTabText]}>
                Phone Contacts
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search UI */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              value={searchQuery}
              onChangeText={handleSearch}
            />

            {/* Sort UI - Only show for Phone Contacts tab */}
            {activeTab === 'phone' && (
              <View style={styles.sortContainer}>
                <Text style={styles.sortLabel}>Sort by:</Text>
                <View style={styles.sortOptions}>
                  <TouchableOpacity
                    style={styles.sortOption}
                    onPress={() => handleSort('name')}
                  >
                    <Text style={[styles.sortLabel, sortConfig.field === 'name' && styles.activeSortOption]}>
                      Name {sortConfig.field === 'name' && (sortConfig.order === 'asc' ? '↑' : '↓')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleSort('phoneNumbers')}
                  >
                    <Text style={[styles.sortLabel, sortConfig.field === 'phoneNumbers' && styles.activeSortOption]}>
                      Phone {sortConfig.field === 'phoneNumbers' && (sortConfig.order === 'asc' ? '↑' : '↓')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Scan Accounts Tab Content */}
          {activeTab === 'scan' && (
            <>
              {/*<View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Scan Contacts</Text>
                <Text style={styles.sectionSubtitle}>Contacts already using Scan</Text>
              </View>*/}

              <FlatList
                data={scanAccounts}
                renderItem={renderScanContactItem}
                keyExtractor={scanContactKeyExtractor}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={["#3b82f6"]}
                  />
                }
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No contacts found on Scan</Text>
                  </View>
                }
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews={true}
                contentContainerStyle={{ flexGrow: 1 }}
              />
            </>
          )}

          {/* Phone Contacts Tab Content */}
          {activeTab === 'phone' && (
            <>
              {/*<View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Phone Contacts</Text>
                <Text style={styles.sectionSubtitle}>Contacts not in Scan</Text>
              </View>*/}

              <FlatList
                data={filteredContacts}
                renderItem={renderPhoneContactItem}
                keyExtractor={phoneContactKeyExtractor}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={["#3b82f6"]}
                  />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No contacts found that aren't already using Scan</Text>
                  </View>
                }
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews={true}
                contentContainerStyle={{ flexGrow: 1 }}
              />
            </>
          )}
        </View>
      </PageBody>
    </PageContainer>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontWeight: '600',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  inactiveTabText: {
    color: '#6b7280',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  sortContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sortLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  sortOptions: {
    flexDirection: 'row',
  },
  sortOption: {
    marginRight: 16,
  },
  activeSortOption: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  inactiveSortOption: {
    color: '#6b7280',
  },
  sectionHeader: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#3b82f6',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'white',
  },
  emptyContainer: {
    padding: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
  },
  contactItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanAvatar: {
    // backgroundColor: '#dcfce7',
    backgroundColor: '#dbeafe44',
    // backgroundColor: "whitesmoke"
  },
  phoneAvatar: {
    backgroundColor: '#dbeafe',
  },
  avatarText: {
    fontWeight: 'bold',
  },
  scanAvatarText: {
    // color: '#22c55e',
    color: '#3b82f6',
    // color: 'gray',
  },
  phoneAvatarText: {
    color: '#3b82f6',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
  },
  contactPhone: {
    color: '#6b7280',
  },
});
