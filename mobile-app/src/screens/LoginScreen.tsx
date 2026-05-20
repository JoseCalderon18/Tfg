import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, typography, borderRadius, shadows } from '../theme';

export default function LoginScreen() {
  // Estado del formulario y feedback visual.
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [focusedField, setFocusedField] = React.useState<string | null>(null);
  const { login } = useAuth();

  const handleLogin = async () => {
    try {
      setSubmitting(true);
      setError('');
      await login(username, password);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandBadge}>
        <Text style={styles.brandBadgeText}>MO</Text>
      </View>
      <Text style={styles.title}>Mando Operativo</Text>
      <Text style={styles.subtitle}>Acceso seguro para personal desplegado en campo</Text>

      <TextInput
        style={styles.input}
        placeholder="Usuario o email"
        placeholderTextColor={colors.textMuted}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={submitting}>
        {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Entrar</Text>}
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: spacing.xxxl,
    marginBottom: spacing.xxxl,
  },
  formContainer: {
    paddingBottom: spacing.xxxl,
  },
  brandBadge: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    ...shadows.md,
  },
  brandBadgeText: {
    color: colors.primary,
    ...typography.heading1,
  },
  title: {
    ...typography.heading2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  input: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    ...typography.body,
    ...shadows.sm,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    minHeight: 54,
    justifyContent: 'center',
    marginTop: spacing.lg,
    ...shadows.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.white,
    ...typography.subtitle,
  },
  errorText: {
    color: colors.danger,
    marginBottom: spacing.md,
    ...typography.small,
    marginLeft: spacing.sm,
  },
});
