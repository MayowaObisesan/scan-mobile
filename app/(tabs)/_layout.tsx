import {Ionicons} from '@expo/vector-icons'
import {Tabs} from 'expo-router'
import {useDrizzleStudio} from "expo-drizzle-studio-plugin";
import {db} from "~/db";
import {syncEngine} from "~/sync/syncEngine";
import {Alert, AppState} from "react-native";
import {useAuthContext} from "~/contexts/AuthContext";
import {useIsomorphicLayoutEffect} from "@rn-primitives/hooks";
import {threadRepository} from "~/db/threads";
import {supabase} from "~/supabase/client";
import {DBTables} from "~/types/enums";
import {Text} from "~/components/ui/text";
import {
    convertChatMessageToLocalMessage,
    convertChatThreadsToLocalThreads,
    convertLocalProfileToServerProfile, convertLocalThreadsToServerThreads,
    convertServerProfileToLocalProfile
} from "~/utils";
import {requestContactPermission} from "~/services/contacts";
import * as Contacts from "expo-contacts";
import {ContactInfo} from "~/hooks/useContacts";
import {eq, or} from "drizzle-orm";
import {Profile, profiles, threads} from "~/db/schema";
import {contactsRepository} from "~/db/contacts";
import {Profiles} from "~/types";
import {profileRepository} from "~/db/profiles";
import { cn } from '~/lib/utils';
import { messageRepository } from '~/db/messages';
import SolarChatSquareIcon from "~/icon/ChatSquareIcon";
import SolarWalletIcon from "~/icon/WalletIcon";
import SolarSearchDuotoneIcon from "~/icon/SearchDuotoneIcon";
import SolarUserBoldDuotoneIcon from "~/icon/UserBoldDuotoneIcon";
import SolarGlobeDuotoneIcon from "~/icon/GlobeDuotoneIcon";
import SolarSettingsDuotoneIcon from "~/icon/SettingsDuotoneIcon";
import SolarMagnifierBoldDuotoneIcon from "~/icon/MagnifierBoldDuotoneIcon";


export default function TabLayout() {
    useDrizzleStudio(db);
    const {user} = useAuthContext();

    /*
    * HOW TO HANDLE SYNC WITH THE LATEST SERVER DATA
    * 1.    Check if there is an authenticated user.
    * 2.    If a user is in session, proceed, else redirect to login page.
    * 3.    If a user is in session, Once you "enter" this layout page, do the following:
    *       a. Fetch the threads from the local DB.
    *       b. Compare the threadIDs from the local DB with your threadIDs from the server.
    *           If the IDs are the same, do nothing
    *           If the IDs are different, get the ID in the server that is not in the local DB and update the local DB
    *
    * */

    if (!user) {
        throw new Error("User is not signed IN... Redirecting to login page");
    }

    async function syncContactsServerProfilesWithLocalDB() {
        // Get all the contacts from the device,
        // Get all the localChatThreads data,
        // Get all the profiles from the server,
        // Get all profiles from your threads and contacts
        // Convert the profiles to the localDB format using the `convertServerProfileToLocalProfile` utils function.
        // Add the converted profiles to the localDB
        console.log("SYNCING CONTACTS SERVER PROFILES WITH LOCAL DB");
        const myContacts = await contactsRepository.myContacts();
        const localChatThreadsData = await threadRepository.getLocalChatThreads(user!);
        const convertedLocalChatThreads = convertLocalThreadsToServerThreads(localChatThreadsData);

        try {
            const {data, error} = await supabase
              .from(DBTables.Profiles)
              .select("*")
              .in('phone', Array.from([...myContacts?.flatPhones!, ...convertedLocalChatThreads || []]));

            if (error) throw error;

            // Save this data to the localDB
            const convertedServerProfile = convertServerProfileToLocalProfile(data)
            // console.log("SYNCING CONTACTS SERVER PROFILES WITH LOCAL DB DATA", convertedServerProfile);
            // await profileRepository.deleteAllProfile();
            const localProfileData = await profileRepository.create(convertedServerProfile);
            console.log("SYNCING CONTACTS SERVER PROFILES WITH LOCAL DB DATA", data?.length, convertedServerProfile.length, localProfileData.length);
            console.log("SYNCING CONTACTS SERVER PROFILES WITH LOCAL DB DATA - REFETCH FROM LOCAL", (await profileRepository.getProfiles()).length);
        } catch (e) {
            console.error("SYNCING CONTACTS SERVER PROFILES WITH LOCAL DB - ERROR", e);
        }
    }

    async function syncServerChatThreadsWithLocalDB() {
        console.log("SYNCING SERVER CHAT THREADS WITH LOCAL DB");
        const localChatThreads = await threadRepository.getAllThreads()
        // console.log("LOCAL CHAT THREADS", localChatThreads);
        const cacheOrServerThreads = await threadRepository.getMyThreadsFromCacheOrServer(user!)
        // console.log("SERVER CHAT THREADS", cacheOrServerThreads);

        const localChatThreadsIds = localChatThreads.map(thread => thread.id)
        const cacheOrServerThreadsIds = cacheOrServerThreads.map(thread => thread.id)

        // Get the difference between these IDs and update the local DB using the thread Data of that ID.
        const differenceIDs = cacheOrServerThreadsIds.filter(id => !localChatThreadsIds.includes(id))
        if (differenceIDs.length > 0) {
            console.log("FETCHING AND STORING DIFFERENCE IN THREADS IN LOCAL DB")
            const differenceThreads = cacheOrServerThreads.filter(thread => differenceIDs.includes(thread.id))
            const convertedChatThreads = convertChatThreadsToLocalThreads(differenceThreads)
            await threadRepository.create(convertedChatThreads)
        }
    }

    async function syncServerChatsWithLocalDB() {
        // Get all local ChatThreads
        // Get all the latest messages for each local ChatThreads
        // Get all the server Messages by Thread
        // Convert the gotten server message to the localDB Format using the `convertChatMessageToLocalMessage` utils function.
        // Add the converted server Messages to the localDB
        const localChatThreads = await threadRepository.getAllThreads();
        localChatThreads.map(async (thread) => {
             const latestMessage = await threadRepository.getLatestLocalThreadMessage(thread.id)
             const serverMessageForThread = await threadRepository.getServerMessagesByThread(thread.id, latestMessage ? latestMessage.id : null)
             const convertedChatMessages = convertChatMessageToLocalMessage(serverMessageForThread)
             await messageRepository.create(convertedChatMessages)
        })
    }

    async function syncServerPaymentsWithLocalDB() {}

    async function syncServerWalletsWithLocalDB() {}

    // Check if there is a need to load chat data from the server
    // HOW: On load of the layout, check if there are any messages in the local database//
    // const { data: messages } = useQuery('messages', fetchMessages);

    console.log("Sync Engine initialized")

    AppState.addEventListener('change', (nextState) => {
        console.log("TAB LAYOUT APP STATE", nextState)
        if (nextState === 'active') {
            try {
                syncServerChatThreadsWithLocalDB();
                syncServerChatsWithLocalDB();
                syncContactsServerProfilesWithLocalDB();
                // syncEngine.syncAllUserMessagesFromServer(user?.id!)
                console.log("TAB LAYOUT APP STATE IS ACTIVE")
            } catch (e) {
                console.error("TAB LAYOUT APP STATE ERROR", e)
            }
        } else if (nextState === 'background') {
            // Handle all auth session states in backgroung, such as rotating keys,
            // Store the state of each thread such that it stores the last time you were in a thread
            syncEngine.cleanup()
            console.log("TAB LAYOUT APP STATE IS IN BACKGROUND")
        }
    })

    return (
        <Tabs
            screenOptions={({route}) => ({
                tabBarIcon: ({focused, color, size}) => {
                    let iconName: string

                    /*if (route.name === 'home') iconName = focused ? 'chatbox' : 'chatbox-outline'
                    else if (route.name === 'wallet') iconName = focused ? 'wallet' : 'wallet-outline'
                    else if (route.name === 'search') iconName = focused ? 'search' : 'search-outline'
                    else if (route.name === 'profile') iconName = focused ? 'person' : 'person-outline'
                    else if (route.name === 'dapp-browser') iconName = focused ? 'globe' : 'globe-outline'
                    else iconName = 'settings-outline'

                    return <Ionicons name={iconName as any} size={size} color={color}/>*/

                    if (route.name === 'home') return <SolarChatSquareIcon color={color} />
                    else if (route.name === 'wallet') return <SolarWalletIcon color={color} />
                    else if (route.name === 'search') return <SolarMagnifierBoldDuotoneIcon color={color} />
                    else if (route.name === 'profile') return <SolarUserBoldDuotoneIcon color={color} />
                    else if (route.name === 'dapp-browser') return <SolarGlobeDuotoneIcon color={color} />
                    else return <SolarSettingsDuotoneIcon color={color} />

                    // return <Ionicons name={iconName as any} size={size} color={color}/>
                },
                // tabBarActiveTintColor: '#4ecca3',
                tabBarActiveTintColor: '#2563EBE6',
                tabBarInactiveTintColor: 'gray',
                headerShown: false,
                tabBarLabel: ({focused, color}) => {
                    if (route.name === "home") return <Text className={cn(focused ? "font-bold" : "font-normal", "text-sm")}>Chat</Text>
                    else if (route.name === "wallet") return <Text className={cn(focused ? "font-bold" : "font-normal", "text-sm")}>Wallet</Text>
                    else if (route.name === "search") return <Text className={cn(focused ? "font-bold" : "font-normal", "text-sm")}>AI</Text>
                    else if (route.name === "profile") return <Text className={cn(focused ? "font-bold" : "font-normal", "text-sm")}>Profile</Text>
                    else if (route.name === "dapp-browser") return <Text className={cn(focused ? "font-bold" : "font-normal", "text-sm")}>Dapp</Text>
                    else return <Text className={cn(focused ? "font-bold" : "font-normal", "text-sm")}>Settings</Text>
                },
                tabBarStyle: {
                    height: 72,
                    paddingBottom: 12,
                    paddingTop: 8,
                }
            })}
        >
            <Tabs.Screen name="home" options={{ title: 'Chat' }} />
            <Tabs.Screen name="search" options={{ title: 'AI' }} />
            <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
            <Tabs.Screen name="wallet" options={{ title: 'Wallet' }} />
            {/*<Tabs.Screen name="settings" options={{ title: 'Settings' }} />*/}
        </Tabs>

        /*<Tabs screenOptions={{
            headerShown: false
        }}>
            <Tabs.Screen name="home" options={{ title: 'Chat' }} />
            <Tabs.Screen name="wallet" options={{ title: 'Wallet' }} />
            <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
        </Tabs>*/
    )
}
