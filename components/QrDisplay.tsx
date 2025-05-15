import { View, Text } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

export function QrDisplay({ value, label }: { value: string; label?: string }) {
  return (
    <View style={{ alignItems: 'center', rowGap: 12 }}>
      {label && <Text style={{fontSize: 16, fontWeight: 'bold'}}>{label}</Text>}
      <View className={"bg-background p-4 rounded-2xl shadow-md"}>
        <QRCode
          logoBorderRadius={16}
          value={value}
          size={200}
          enableLinearGradient={true}
          linearGradient={['rgba(11,10,10,0.98)', 'rgba(40,122,206,0.88)']}
        />
      </View>
    </View>
  )
}
