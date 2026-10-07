import { Children, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

/** Measure the available content width, including sidebars and split-screen. */
export function AdaptiveColumns({ children, minColumnWidth = 340, singleColumn = false }: {
  children: ReactNode; minColumnWidth?: number; singleColumn?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const { fontScale } = useWindowDimensions();
  const columns = !singleColumn && width >= minColumnWidth * Math.max(1, fontScale) * 2 + 20 ? 2 : 1;
  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.container}>
      <View style={styles.grid}>
      {Children.toArray(children).map((child, index) => (
        <View key={(typeof child === 'object' && 'key' in child ? child.key : null) ?? index}
          style={[styles.cell, { width: columns === 2 ? '50%' : '100%' }]}>
          {child}
        </View>
      ))}
      </View>
    </View>
  );
}

export const layoutStyles = StyleSheet.create({
  page: { width: '100%', maxWidth: 1240, alignSelf: 'center' },
  form: { width: '100%', maxWidth: 840, alignSelf: 'center' },
  auth: { width: '100%', maxWidth: 560, alignSelf: 'center' },
  column: { gap: 16, minWidth: 0 },
});

const styles = StyleSheet.create({
  container: { width: '100%' },
  // Yoga must resolve both columns from the same unrounded parent width.
  // onLayout is pixel-rounded on Android; using it for cell widths can wrap
  // the second cell onto another row at fractional display densities.
  grid: { marginHorizontal: -10, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', rowGap: 20 },
  cell: { paddingHorizontal: 10, minWidth: 0, gap: 16 },
});
