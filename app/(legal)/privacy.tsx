// app/(legal)/privacy.tsx
import { ScrollView, Text } from 'react-native'
import privacy from '~/components/mddocs/privacy'

export default function PrivacyScreen() {
  return (
    <ScrollView style={{ padding: 16 }}>
      <Text>{privacy}</Text>
    </ScrollView>
  )
}
