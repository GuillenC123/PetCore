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
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/theme';

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

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom + 8 }]}>
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
            key={route.key}
            onPress={onPress}
            style={styles.tabButton}
            accessibilityState={isFocused ? { selected: true } : {}}>
            {/* Contenido de la pestaña: ícono + etiqueta. */}
            <View style={[styles.tabItem, isFocused && styles.tabItemActivo]}>
              <Ionicons
                name={iconName}
                size={22}
                color={isFocused ? AppColors.primaryDark : AppColors.textSecondary}
              />
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActivo]}>
                {options.title ?? route.name}
              </Text>
            </View>
          </Pressable>
        );
      })}
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
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="mascotas" options={{ title: 'Ficha de salud' }} />
      <Tabs.Screen name="citas" options={{ title: 'Agenda' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
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
