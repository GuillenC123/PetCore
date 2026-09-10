import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HealthSection({ title, description, icon, open, onToggle, children }: {
  title: string; description: string; icon: keyof typeof Ionicons.glyphMap;
  open: boolean; onToggle: () => void; children: ReactNode;
}) {
  const [visited, setVisited] = useState(false);
  return <View style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => { setVisited(true); onToggle(); }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: open ? '#E0F2FE' : '#F8FAFC' }}>
      <Ionicons name={icon} size={22} color="#0369A1" />
      <View style={{ flex: 1, gap: 3 }}><Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{title}</Text>
        <Text style={{ fontSize: 13, color: '#4B5563' }}>{description}</Text></View>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#0369A1" />
    </Pressable>
    {(open || visited) && <View style={{ display: open ? 'flex' : 'none', padding: 14, gap: 12 }} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}>{children}</View>}
  </View>;
}
