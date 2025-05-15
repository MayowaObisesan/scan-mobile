import { View, Alert, Switch } from 'react-native'
import { supabase } from '~/supabase/client'
import { router } from 'expo-router'
import { clearWallets } from '~/solana/wallet'
import {useState} from "react";
import Slider from "@react-native-community/slider";
import { Text } from '~/components/ui/text';
import {PageBody, PageContainer, PageHeader, PageHeading} from "~/components/PageSection";
import {useIsomorphicLayoutEffect} from "@rn-primitives/hooks";
import {ListSection} from "~/components/ListSection";
import {deleteAllCachedMessages} from "~/services/chat";
import { Button } from '~/components/ui/button';
import { toast } from 'sonner-native';
import {messageRepository} from "~/db/messages";
import {syncEngine} from "~/sync/syncEngine";
import {useAuthContext} from "~/contexts/AuthContext";

export default function SettingsScreen() {
  const {user} = useAuthContext()
  const [threshold, setThreshold] = useState(70)
  const [alertsEnabled, setAlertsEnabled] = useState(true)

  useIsomorphicLayoutEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('profiles')
        .select('risk_threshold, risk_alerts_enabled')
        .eq('id', user?.user?.id)
        .single()

      if (data) {
        setThreshold(data.risk_threshold ?? 70)
        setAlertsEnabled(data.risk_alerts_enabled ?? true)
      }
    })()
  }, [])

  const saveSettings = async () => {
    const { data: user } = await supabase.auth.getUser()
    await supabase
      .from('profiles')
      .update({ risk_threshold: threshold, risk_alerts_enabled: alertsEnabled })
      .eq('id', user?.user?.id)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    // await clearWallets()
    Alert.alert('Signed Out', 'You have been logged out.')
    router.replace('/(auth)/login')
  }

  return (
    <PageContainer>
      <PageHeader showBackButton>
        <PageHeading>Settings</PageHeading>
      </PageHeader>

      <PageBody className={"gap-y-4"}>
        <View>
          <Text style={{ marginTop: 10 }}>⚠️ Risk Alerts</Text>
          <Switch value={alertsEnabled} onValueChange={setAlertsEnabled} />

          <Text>Threshold: {threshold}</Text>
          <Slider minimumValue={30} maximumValue={100} step={5} value={threshold} onValueChange={setThreshold} />

          <Button onPress={saveSettings}>
            <Text>Save Risk Settings</Text>
          </Button>
        </View>

        <Button onPress={handleLogout} variant="destructive"><Text>Logout</Text></Button>

        <View className={"w-full"}>
          <Text className={"text-muted-foreground text-center text-sm"} style={{ marginBottom: 10 }}>App Version: 1.0.0</Text>
          <Text className={"text-muted-foreground text-center text-sm"} style={{ marginBottom: 10 }}>Logged in with Supabase</Text>
        </View>

        <ListSection title={"Caution"} items={[
          {
            type: "double",
            label: "Clear Chats Cache",
            value: "Your chats will still be available",
            subtitle: "This will remove all wallets from the app.",
          },
        ]} />

        <Button onPress={() => {
          deleteAllCachedMessages()
          Alert.alert("Cache cleared", "All chats cache have been cleared.")
          toast.info("Cache cleared", { description: "All chats cache have been cleared." })
        }}>
          <Text>Delete all Chats Cache</Text>
        </Button>

        <Button onPress={() => messageRepository.deleteAll()}>
          <Text>Delete Messages</Text>
        </Button>

        <Button onPress={() => syncEngine.syncAllUserMessagesFromServer(user?.id!)}>
          <Text>Load user Messages</Text>
        </Button>
      </PageBody>
    </PageContainer>
  )
}
