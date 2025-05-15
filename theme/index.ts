import { MD3LightTheme as LightTheme, MD3DarkTheme as DarkTheme } from 'react-native-paper'

export const lightTheme = {
  ...LightTheme,
  colors: {
    ...LightTheme.colors,
    primary: '#4ecca3',
    background: '#ffffff',
    surface: '#f2f2f2'
  }
}

export const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#4ecca3',
    background: '#121212',
    surface: '#1e1e1e'
  }
}
