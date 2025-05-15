import { View, TextInput, StyleSheet, TextInputProps } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

export function AIInputBox2(props: TextInputProps) {
  return (
    <LinearGradient
      colors={['#3b82f6', '#a5b4fc', '#f472b6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.glow}
    >
      <View style={styles.innerBox}>
        <TextInput
          placeholder="Ask AI anything..."
          placeholderTextColor="#a5b4fc"
          style={styles.input}
          {...props}
        />
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  glow: {
    borderRadius: 16,
    padding: 2,
    marginVertical: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 4,
  },
  innerBox: {
    borderRadius: 13,
    // backgroundColor: '#18181b',
    // backgroundColor: '#F8F8Fb',
    backgroundColor: '#F8F8Fb',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    // color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
})
