import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }: any) {
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
      navigation.replace('Operative');
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
        placeholderTextColor="#94A3B8"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor="#94A3B8"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#F8FAFC" /> : <Text style={styles.buttonText}>Entrar</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0F172A',
  },
  brandBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  brandBadgeText: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '800',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 8,
    color: '#F8FAFC',
  },
  subtitle: {
    color: '#CBD5E1',
    marginBottom: 24,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#1E293B',
    padding: 15,
    borderRadius: 14,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#475569',
    color: '#F8FAFC',
  },
  button: {
    backgroundColor: '#DC2626',
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    minHeight: 54,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#FCA5A5',
    marginBottom: 16,
  },
});
