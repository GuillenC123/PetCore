import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useAppColors } from '@/context/AppearanceContext';

/** Ilustración vectorial hecha con vistas: ligera y sin imágenes de red. */
export default function PetIllustration({ compact = false }: { compact?: boolean }) {
  const colors = useAppColors();
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: compact ? 104 : 146, height: compact ? 104 : 144 }}>
    <View style={[styles.scene, compact && styles.compact]}>
      <View style={[styles.halo, { backgroundColor: colors.surface }]} />
      <View style={styles.paw}><Ionicons name="paw" size={22} color={colors.teal} /></View>
      <View style={styles.heart}><Ionicons name="heart" size={19} color={colors.orange} /></View>
      <View style={[styles.ear, styles.dogEarLeft]} /><View style={[styles.ear, styles.dogEarRight]} />
      <View style={styles.dog}>
        <View style={styles.patch} />
        <View style={[styles.eye, { left: 19, top: 30 }]} /><View style={[styles.eye, { right: 17, top: 30 }]} />
        <View style={styles.muzzle}><View style={styles.nose} /><View style={styles.smile} /></View>
      </View>
      <View style={[styles.catEar, { left: 75 }]} /><View style={[styles.catEar, { left: 113 }]} />
      <View style={styles.cat}>
        <View style={[styles.eye, { left: 15, top: 25 }]} /><View style={[styles.eye, { right: 15, top: 25 }]} />
        <View style={[styles.nose, styles.catNose]} />
        <View style={[styles.whisker, { left: 4, transform: [{ rotate: '10deg' }] }]} />
        <View style={[styles.whisker, { right: 4, transform: [{ rotate: '-10deg' }] }]} />
      </View>
      <View style={[styles.base, { backgroundColor: colors.teal }]} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  scene: { width: 146, height: 144, alignSelf: 'center' },
  compact: { position: 'absolute', left: -21, top: -20, transform: [{ scale: 0.72 }] },
  halo: { width: 126, height: 126, borderRadius: 63, position: 'absolute', left: 10, top: 13, opacity: 0.6 },
  paw: { position: 'absolute', top: 10, left: 13, transform: [{ rotate: '-22deg' }] },
  heart: { position: 'absolute', top: 3, right: 9, transform: [{ rotate: '15deg' }] },
  dog: { position: 'absolute', left: 10, bottom: 15, width: 78, height: 82, borderRadius: 32, backgroundColor: '#EFCB98', transform: [{ rotate: '-8deg' }] },
  ear: { position: 'absolute', width: 26, height: 55, borderRadius: 15, backgroundColor: '#A9714E', top: 44 },
  dogEarLeft: { left: 2, transform: [{ rotate: '13deg' }] }, dogEarRight: { left: 69, transform: [{ rotate: '-18deg' }] },
  patch: { position: 'absolute', right: 8, top: 15, width: 26, height: 36, borderRadius: 18, backgroundColor: '#D4A06D' },
  eye: { position: 'absolute', width: 6, height: 8, borderRadius: 4, backgroundColor: '#3B302C' },
  muzzle: { position: 'absolute', left: 17, bottom: 10, width: 46, height: 29, borderRadius: 20, backgroundColor: '#FFF1D9', alignItems: 'center' },
  nose: { width: 12, height: 8, borderRadius: 5, backgroundColor: '#3B302C', marginTop: 4 },
  smile: { width: 14, height: 8, borderBottomWidth: 2, borderColor: '#805E4A', borderRadius: 6 },
  cat: { position: 'absolute', left: 72, bottom: 13, width: 65, height: 66, borderRadius: 26, backgroundColor: '#A8C9CA', transform: [{ rotate: '8deg' }] },
  catEar: { position: 'absolute', bottom: 62, width: 24, height: 28, borderTopLeftRadius: 5, borderTopRightRadius: 22, backgroundColor: '#8CB2B5', transform: [{ rotate: '12deg' }] },
  catNose: { position: 'absolute', left: 28, top: 34, width: 9, height: 6, backgroundColor: '#8A5B59' },
  whisker: { position: 'absolute', width: 17, height: 1, top: 42, backgroundColor: '#517B7E' },
  base: { position: 'absolute', bottom: 8, left: 14, width: 121, height: 5, borderRadius: 3, opacity: 0.25 },
});
