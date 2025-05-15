import {ActivityIndicator, Alert, Button, View} from 'react-native'
import {useState} from 'react'
import {logRiskyTx, scoreTransactionRisk} from '~/services/risk'
import {supabase} from "~/supabase/client";

export function ConfirmAndSend(
  {
    to,
    amount,
    onConfirm
  }: {
    to: string
    amount: number
    onConfirm: () => Promise<void>
  }) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const { data: session } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('profiles')
        .select('risk_threshold, risk_alerts_enabled')
        .eq('id', session?.user?.id)
        .single()

      const risk = await scoreTransactionRisk({to, amount})
      setLoading(false)

      // 📝 Log high-risk attempts
      if (risk.score >= (profile?.risk_threshold ?? 70)) {
        await logRiskyTx({
          userId: session?.user?.id!,
          to,
          amount,
          program_ids: ['11111111111111111111111111111111'],
          score: risk.score,
          reason: risk.reason
        })
      }

      // 🛑 Conditionally warn user
      if (profile?.risk_alerts_enabled !== false && risk.score >= (profile?.risk_threshold ?? 70)) {
        Alert.alert('⚠️ High Risk Transaction', risk.reason ?? 'Suspicious activity', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Proceed Anyway', onPress: () => onConfirm() }
        ])
      } else {
        onConfirm()
      }
    } catch (e: any) {
      setLoading(false)
      Alert.alert('Error', e.message)
    }
  }

  return (
    <View>
      {loading ? (
        <ActivityIndicator/>
      ) : (
        <Button title="Confirm & Send" onPress={handleConfirm}/>
      )}
    </View>
  )
}
