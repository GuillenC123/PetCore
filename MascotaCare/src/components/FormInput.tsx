// ============================================================================
// FormInput.tsx - Campo de texto del formulario de autenticación
// ----------------------------------------------------------------------------
// Input con estilo "moderno": fondo blanco, borde, esquinas redondeadas, un
// pequeño ícono a la izquierda y soporte para mostrar/ocultar contraseña.
// Acepta invalidación (borde rojo) y mensaje de error.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { AppColors } from '@/constants/theme';

interface FormInputProps extends TextInputProps {
  /** Ícono a mostrar a la izquierda del campo. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Si es true, se muestra un botón para ocultar/mostrar el texto. */
  secure?: boolean;
  /** Mensaje de error (resalta el borde en rojo si existe). */
  error?: string;
}

export default function FormInput({
  icon,
  secure,
  error,
  ...inputProps
}: FormInputProps) {
  const [oculto, setOculto] = useState(true);
  // Si es un campo de contraseña, lo alternamos entre visible/oculto.
  const muestraTexto = secure ? !oculto : true;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, error ? styles.containerError : null]}>
        {/* Ícono opcional a la izquierda. */}
        {icon ? (
          <Ionicons name={icon} size={20} color={AppColors.textSecondary} />
        ) : null}

        {/* Campo de texto. */}
        <TextInput
          placeholderTextColor={AppColors.textMuted}
          style={styles.input}
          secureTextEntry={!muestraTexto}
          {...inputProps}
        />

        {/* Botón mostrar/ocultar contraseña. */}
        {secure ? (
          <Ionicons
            name={oculto ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={AppColors.textSecondary}
            onPress={() => setOculto(!oculto)}
          />
        ) : null}
      </View>

      {/* Mensaje de error bajo el campo. */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 4,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: AppColors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
  },
  containerError: {
    borderColor: AppColors.danger,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: AppColors.text,
  },
  errorText: {
    fontSize: 12,
    color: AppColors.danger,
  },
});