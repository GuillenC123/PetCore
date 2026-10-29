import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView, type SafeAreaViewProps } from 'react-native-safe-area-context';
import { useAppearance } from '@/context/AppearanceContext';
import { useReducedMotion } from '@/context/MotionContext';

/** Fondo decorativo compartido: no recibe toques ni aparece en el lector de pantalla. */
function PawBackground() {
  const { scheme } = useAppearance();
  const pawColor = scheme === 'dark' ? '#D9B783' : '#AE765C';
  const [size, setSize] = useState({ width: 0, height: 0 });
  const columns = Math.ceil(size.width / 120) + 1;
  const rows = Math.ceil(size.height / 140) + 1;

  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden aria-hidden
    importantForAccessibility="no-hide-descendants"
    onLayout={({ nativeEvent: { layout } }) => setSize((previous) =>
      previous.width === layout.width && previous.height === layout.height
        ? previous : { width: layout.width, height: layout.height })}
    style={[styles.pattern, { opacity: scheme === 'dark' ? 0.18 : 0.16 }]}>
    {size.width > 0 && Array.from({ length: rows * columns }, (_, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      return <View key={index} style={[styles.paw, {
        left: column * 120 + (row % 2 ? 46 : -14),
        top: row * 140 + (column % 2 ? 32 : 7),
        transform: [{ rotate: (row + column) % 2 ? '24deg' : '-24deg' }],
      }]}>
        <Ionicons name="paw" size={(row + column) % 3 === 0 ? 36 : 27} color={pawColor} />
      </View>;
    })}
  </View>;
}

/** Conserva los márgenes seguros de cada pantalla y coloca las huellas detrás de su contenido. */
export default function PetScreen({ children, animate = true, ...props }: SafeAreaViewProps & { animate?: boolean }) {
  const reducedMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(1));
  useFocusEffect(useCallback(() => {
    progress.stopAnimation();
    if (reducedMotion || !animate) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 260,
      easing: Easing.out(Easing.cubic), isInteraction: false, useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => { animation.stop(); progress.setValue(1); };
  }, [progress, reducedMotion, animate]));

  return <SafeAreaView {...props}>
    <PawBackground />
    <Animated.View style={[styles.content, { opacity: progress,
      transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
      {children}
    </Animated.View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  content: { flex: 1, minHeight: 0 },
  pattern: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, overflow: 'hidden' },
  paw: { position: 'absolute' },
});
