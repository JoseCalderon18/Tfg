import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '../context/AuthContext';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>Volver</Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Perfil operativo</Text>
        <Text style={styles.title}>{user?.username ?? 'Sin usuario'}</Text>
        <Text style={styles.subtitle}>{user?.email ?? 'Sin correo disponible'}</Text>
      </View>

      <View style={styles.card}>
        <InfoRow label="Rol" value={user?.role ?? 'Sin rol'} />
        <InfoRow label="ID de usuario" value={user?.id ?? '-'} />
        <InfoRow label="ID de perfil" value={user?.profile_id ?? '-'} />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={() => void logout()}>
        <Text style={styles.logoutButtonText}>Cerrar sesion</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  backButton: {
    alignSelf: 'flex-end',
    marginTop: 24,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#0F172A',
    fontWeight: '700',
  },
  hero: {
    marginTop: 28,
  },
  eyebrow: {
    color: '#2563EB',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    marginTop: 10,
    color: '#0F172A',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 6,
    color: '#475569',
    fontSize: 15,
  },
  card: {
    marginTop: 24,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  infoRow: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  infoValue: {
    marginTop: 6,
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutButton: {
    marginTop: 24,
    borderRadius: 18,
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
