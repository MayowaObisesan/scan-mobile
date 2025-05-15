import { View, type ViewProps } from 'react-native';
import { useColorScheme } from 'react-native';
import { cn } from '~/lib/utils';

export type ThemedViewProps = ViewProps & {
  className?: string;
  lightClass?: string;
  darkClass?: string;
};

export function ThemedView({
  className,
  lightClass = 'bg-white',
  darkClass = 'bg-secondary/30',
  ...otherProps
}: ThemedViewProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View
      className={cn(
        isDark ? darkClass : lightClass,
        className
      )}
      {...otherProps}
    />
  );
}
