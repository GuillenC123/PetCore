// ============================================================================
// (tabs)/_layout.tsx - Barra de navegación inferior (Bottom Tab Navigator)
// ----------------------------------------------------------------------------
// Define las 4 pestañas principales usando el Tabs de expo-router (que internamente
// usa @react-navigation/bottom-tabs):
//   * Inicio    (ícono casa)
//   * Mascotas  (ícono huella)
//   * Citas     (ícono calendario)
//   * Perfil    (ícono usuario)
//
// La barra se personaliza vía el prop "tabBar": fondo blanco con bordes
// superiores redondeados y las pestañas con estado "activo" resaltado en forma
// de píldora azul. Esto se implementa en el componente CustomTabBar de abajo.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/theme';
import { useTabletLayout } from '@/hooks/use-tablet-layout';

// ---------------------------------------------------------------------------
// Barra inferior personalizada
// ---------------------------------------------------------------------------
// Recibe el estado de navegación de react-navigation y dibuja un botón por
// cada ruta. La pestaña activa muestra una "píldora" azul celeste de fondo que
// resalta el ícono y el texto; las inactivas van en gris.
// ---------------------------------------------------------------------------
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  // Los tabs se dibujan dentro del safe area (evita chocar con gestos del SO).
  const insets = useSafeAreaInsets();
  const { sidebar } = useTabletLayout();

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom + 8, paddingLeft: insets.left + 12, paddingRight: insets.right + 12 },
      sidebar && [styles.sidebar, { paddingTop: insets.top + 24, width: 204 + insets.left, paddingRight: 12 }]]}>
      {sidebar && <View style={styles.brand}><Ionicons name="paw" size={28} color={AppColors.primaryDark} /><Text style={styles.brandText}>PetCore</Text></View>}
      <ScrollView horizontal={!sidebar} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}
        style={sidebar ? styles.sidebarScroll : styles.bottomScroll}
        contentContainerStyle={sidebar ? styles.sidebarLinks : styles.bottomLinks}>
      {state.routes.map((route, index) => {
        // "descriptors" trae las opciones de cada pantalla (título, ícono...).
        const { options } = descriptors[route.key];
        // La pestaña actual es la que coincide con el índice del estado.
        const isFocused = state.index === index;

        // Nombre del ícono según la ruta (definimos un mapa id->ícono).
        const iconName = TAB_ICONOS[route.name] ?? 'ellipse-outline';

        // Al tocar una pestaña, navegamos (o volvemos a enfocar si ya está).
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel={options.title ?? route.name}
            key={route.key}
            onPress={onPress}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            style={[styles.tabButton, sidebar && styles.sideButton]}
            accessibilityState={isFocused ? { selected: true } : {}}>
            {/* Contenido de la pestaña: ícono + etiqueta. */}
            <View style={[styles.tabItem, sidebar && styles.sideItem, isFocused && styles.tabItemActivo]}>
              <Ionicons
                name={iconName}
                size={22}
                color={isFocused ? AppColors.primaryDark : AppColors.textSecondary}
              />
              <Text style={[styles.tabLabel, sidebar && styles.sideLabel, isFocused && styles.tabLabelActivo]}>
                {options.title ?? route.name}
              </Text>
            </View>
          </Pressable>
        );
      })}
      </ScrollView>
    </View>
  );
}

// Mapa de cada pestaña (route.name) a su ícono (Ionicons).
const TAB_ICONOS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home',
  mascotas: 'medical',
  citas: 'calendar',
  perfil: 'person',
};

export default function TabsLayout() {
  const { sidebar } = useTabletLayout();
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarPosition: sidebar ? 'left' : 'bottom' }}>
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="mascotas" options={{ title: 'Ficha de salud' }} />
      <Tabs.Screen name="citas" options={{ title: 'Agenda' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  sidebar: { flexDirection: 'column', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderRightWidth: 1, borderRightColor: '#E2E8F0', elevation: 0, shadowOpacity: 0 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, marginBottom: 28 },
  brandText: { fontSize: 22, fontWeight: '800', color: AppColors.primaryDark },
  sidebarScroll: { flex: 1 },
  bottomScroll: { flexGrow: 1, flexShrink: 1 },
  sidebarLinks: { gap: 12 },
  bottomLinks: { flexDirection: 'row', flexGrow: 1 },
  sideButton: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', minHeight: 56, alignItems: 'stretch' },
  sideItem: { flexDirection: 'row', justifyContent: 'flex-start', minHeight: 56, paddingHorizontal: 12, gap: 12, borderRadius: 14 },
  sideLabel: { fontSize: 14, flexShrink: 1 },
  // Barra blanca pegada al fondo con bordes superiores redondeados y sombra.
  tabBar: {
    flexDirection: 'row',
    backgroundColor: AppColors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 12,
    paddingTop: 10,
    // Sombra hacia arriba para separar de la lista.
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 18,
  },
  // Píldora azul claro de la pestaña activa.
  tabItemActivo: {
    backgroundColor: AppColors.infoSoft,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  tabLabelActivo: {
    color: AppColors.primaryDark,
    fontWeight: '700',
  },
});
