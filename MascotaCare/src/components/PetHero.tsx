import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/AppearanceContext';
import PetIllustration from './PetIllustration';

interface PetHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  tone?: 'teal' | 'orange' | 'purple';
}

/** Cabecera adaptable; el texto puede crecer sin superponerse al dibujo. */
export default function PetHero({ eyebrow, title, description, tone = 'teal' }: PetHeroProps) {
  const colors = useAppColors();
  const [width, setWidth] = useState(0);
  const foreground = colors[tone];
  const background = colors[`${tone}Soft`];
  return <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={[styles.hero, { backgroundColor: background, borderColor: colors.border }]}>
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.decoration}>
      <Ionicons name="paw" size={94} color={foreground} />
    </View>
    <View style={styles.copy}>
      <View style={styles.eyebrowRow}><Ionicons name="paw" size={13} color={foreground} /><Text style={[styles.eyebrow, { color: foreground }]}>{eyebrow}</Text></View>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
    </View>
    <View style={styles.art}><PetIllustration compact={width < 500} /></View>
  </View>;
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: 22, gap: 8, borderRadius: 28, borderWidth: 1, overflow: 'hidden' },
  copy: { flex: 1, flexBasis: 160, minWidth: 0, gap: 9 },
  art: { flexGrow: 1, alignItems: 'flex-end', flexBasis: 104 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3, textTransform: 'uppercase', flexShrink: 1 },
  title: { fontSize: 27, lineHeight: 34, fontWeight: '800', letterSpacing: -0.6 },
  description: { fontSize: 14, lineHeight: 22, maxWidth: 520 },
  decoration: { position: 'absolute', right: -24, top: -28, opacity: 0.06, transform: [{ rotate: '25deg' }] },
});
