declare module 'emoji-mart-native' {
  export interface Picker {
    onEmojiSelect: (emoji: { native: string }) => void;
  }
  export const Picker: React.ComponentType<Picker>;
}
