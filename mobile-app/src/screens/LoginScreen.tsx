import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

export default function LoginScreen() {
  // Estado del formulario y feedback visual.
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
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
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  brandBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  brandBadgeText: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '800',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 8,
    color: colors.text,
  },
  subtitle: {
    color: colors.textMuted,
    marginBottom: 24,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 14,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    minHeight: 54,
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: colors.danger,
    marginBottom: 16,
  },
});
