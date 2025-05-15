import { View, TextInput, Text } from 'react-native'

export function TextInputField({ label, value, onChangeText, secure = false }) {
  return (
    <View style={{ marginVertical: 10 }}>
      <Text style={{ marginBottom: 4 }}>{label}</Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 10,
        }}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
      />
    </View>
  )
}
