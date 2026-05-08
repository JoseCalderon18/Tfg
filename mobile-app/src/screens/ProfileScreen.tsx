import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker'; 
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { User, useAuth } from '../context/AuthContext';
import { apiFetch, parseJsonResponse } from '../services/api';

type ProfileForm = {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  emergency_contact: string;
  emergency_phone: string;
  organization_id: string;
  dni: string;
  language: string;
  city: string;
  province: string;
  country: string;
  birth_date: string;
  blood_type: string;
  nutrition_preference: string;
  operative_schedule: string;
  operative_status: string;
  location_lat: string;
  location_lng: string;
  medical_notes: string;
  specialties: string;
  weight_kg: string;
};

type SelectOption = {
  value: string;
  label: string;
};

type OrganizationOption = {
  id: string;
  name: string;
};

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
};

const LANGUAGE_OPTIONS: SelectOption[] = [
  { value: '', label: 'Selecciona un idioma' },
  { value: 'es', label: 'Espanol' },
  { value: 'en', label: 'Ingles' },
  { value: 'fr', label: 'Frances' },
  { value: 'de', label: 'Aleman' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Portugues' },
  { value: 'zh', label: 'Chino' },
  { value: 'ja', label: 'Japones' },
  { value: 'cat', label: 'Catalan' },
  { value: 'eus', label: 'Euskera' },
  { value: 'gall', label: 'Gallego' },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  OPERATIVE: 'Operativo'
};

const COUNTRY_OPTIONS: SelectOption[] = [
  { value: '', label: 'Selecciona un pais' },
  { value: 'Espana', label: 'Espana' },
  { value: 'Portugal', label: 'Portugal' },
  { value: 'Francia', label: 'Francia' },
  { value: 'Italia', label: 'Italia' },
  { value: 'Alemania', label: 'Alemania' },
  { value: 'Reino Unido', label: 'Reino Unido' },
  { value: 'Estados Unidos', label: 'Estados Unidos' },
  { value: 'Andorra', label: 'Andorra' },
  { value: 'Marruecos', label: 'Marruecos' },
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'DISPONIBLE', label: 'Disponible' },
  { value: 'EN_INCIDENTE', label: 'En incidente' },
  { value: 'DESCONECTADA', label: 'Desconectada' },
  { value: 'NO_DISPONIBLE', label: 'No disponible' },
];

const NUTRITION_OPTIONS: SelectOption[] = [
  { value: '', label: 'Preferencia nutricional' },
  { value: 'balanced', label: 'Equilibrada' },
  { value: 'high_protein', label: 'Alta en proteina' },
  { value: 'vegan', label: 'Vegetal / vegana' },
];

const PROFILE_FORM_FIELDS: Array<[keyof ProfileForm, string]> = [
  ['username', 'username'],
  ['email', 'email'],
  ['first_name', 'first_name'],
  ['last_name', 'last_name'],
  ['phone', 'phone'],
  ['emergency_contact', 'emergency_contact'],
  ['emergency_phone', 'emergency_phone'],
  ['dni', 'dni'],
  ['language', 'language'],
  ['city', 'city'],
  ['province', 'province'],
  ['country', 'country'],
  ['birth_date', 'birth_date'],
  ['blood_type', 'blood_type'],
  ['nutrition_preference', 'nutrition_preference'],
  ['operative_schedule', 'operative_schedule'],
  ['operative_status', 'operative_status'],
  ['weight_kg', 'weight_kg'],
  ['location_lat', 'location_lat'],
  ['location_lng', 'location_lng'],
  ['medical_notes', 'medical_notes'],
  ['specialties', 'specialties'],
];

const PROVINCE_OPTIONS_BY_COUNTRY: Record<string, SelectOption[]> = {
  Espana: [
    { value: '', label: 'Selecciona una provincia' },
    'Alava,Albacete,Alicante,Almeria,Asturias,Avila,Badajoz,Illes Balears,Burgos,Caceres,Cadiz,Cantabria,Castellon,Ceuta,Ciudad Real,Cordoba,A Coruna,Cuenca,Girona,Granada,Guadalajara,Gipuzkoa,Huelva,Huesca,Jaen,Leon,Lleida,La Rioja,Lugo,Malaga,Melilla,Navarra,Ourense,Palencia,Las Palmas,Pontevedra,Salamanca,Santa Cruz de Tenerife,Segovia,Soria,Tarragona,Teruel,Toledo,Valladolid,Bizkaia,Zamora,Madrid,Barcelona,Valencia,Sevilla,Zaragoza,Murcia'
      .split(',')
      .map((name) => ({ value: name, label: name })),
  ].flat(),
  Portugal: [
    { value: '', label: 'Selecciona una provincia' },
    'Aveiro,Beja,Braganca,Castelo Branco,Evora,Guarda,Leiria,Lisboa,Portalegre,Porto,Braga,Coimbra,Faro,Santarem,Setubal,Viana do Castelo,Vila Real,Viseu,Azores,Madeira'
      .split(',')
      .map((name) => ({ value: name, label: name })),
  ].flat(),
  Francia: [
    { value: '', label: 'Selecciona una region' },
    'Auvergne-Rhone-Alpes,Bourgogne-Franche-Comte,Bretagne,Centre-Val de Loire,Corse,Grand Est,Hauts-de-France,Ile-de-France,Normandie,Nouvelle-Aquitaine,Occitanie,Pays de la Loire,Provence-Alpes-Cote d Azur,Guadeloupe,Martinique,Guyane,La Reunion,Mayotte'
      .split(',')
      .map((name) => ({ value: name, label: name })),
  ].flat(),
  Italia: [
    { value: '', label: 'Selecciona una region' },
    'Abruzzo,Basilicata,Calabria,Campania,Emilia-Romagna,Friuli-Venezia Giulia,Lazio,Liguria,Lombardia,Marche,Molise,Piemonte,Puglia,Sardegna,Sicilia,Toscana,Trentino-Alto Adige,Umbria,Valle d Aosta,Veneto'
      .split(',')
      .map((name) => ({ value: name, label: name })),
  ].flat(),
  Alemania: [
    { value: '', label: 'Selecciona un estado' },
    'Baden-Wurttemberg,Baviera,Berlin,Brandeburgo,Bremen,Hamburgo,Hesse,Mecklemburgo-Pomerania Occidental,Baja Sajonia,Renania del Norte-Westfalia,Renania-Palatinado,Sarre,Sajonia,Sajonia-Anhalt,Schleswig-Holstein,Turingia'
      .split(',')
      .map((name) => ({ value: name, label: name })),
  ].flat(),
  'Reino Unido': [
    { value: '', label: 'Selecciona una division' },
    'Inglaterra,Escocia,Gales,Irlanda del Norte'.split(',').map((name) => ({ value: name, label: name })),
  ].flat(),
  'Estados Unidos': [
    { value: '', label: 'Selecciona un estado' },
    'Alabama,Alaska,Arizona,Arkansas,California,Colorado,Connecticut,Delaware,Florida,Georgia,Hawaii,Idaho,Illinois,Indiana,Iowa,Kansas,Kentucky,Louisiana,Maine,Maryland,Massachusetts,Michigan,Minnesota,Mississippi,Missouri,Montana,Nebraska,Nevada,New Hampshire,New Jersey,New Mexico,New York,North Carolina,North Dakota,Ohio,Oklahoma,Oregon,Pennsylvania,Rhode Island,South Carolina,South Dakota,Tennessee,Texas,Utah,Vermont,Virginia,Washington,West Virginia,Wisconsin,Wyoming,District of Columbia'
      .split(',')
      .map((name) => ({ value: name, label: name })),
  ].flat(),
  Andorra: [
    { value: '', label: 'Selecciona una parroquia' },
    'Andorra la Vella,Canillo,Encamp,Escaldes-Engordany,La Massana,Ordino,Sant Julia de Loria'
      .split(',')
      .map((name) => ({ value: name, label: name })),
  ].flat(),
  Marruecos: [
    { value: '', label: 'Selecciona una region' },
    'Casablanca-Settat,Rabat-Sale-Kenitra,Marrakesh-Safi,Fes-Meknes,Tangier-Tetouan-Al Hoceima,Souss-Massa,Beni Mellal-Khenifra,Oriental,Draa-Tafilalet,Guelmim-Oued Noun,Laayoune-Sakia El Hamra,Dakhla-Oued Ed-Dahab'
      .split(',')
      .map((name) => ({ value: name, label: name })),
  ].flat(),
};

function toText(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function listToText(value?: string[]) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function userToForm(user: User | null): ProfileForm {
  return {
    username: user?.username ?? '',
    email: user?.email ?? '',
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    phone: user?.phone ?? '',
    emergency_contact: user?.emergency_contact ?? '',
    emergency_phone: user?.emergency_phone ?? '',
    organization_id: user?.organization_id ?? '',
    dni: user?.dni ?? '',
    language: user?.language ?? '',
    city: user?.city ?? '',
    province: user?.province ?? '',
    country: user?.country ?? '',
    birth_date: user?.birth_date ?? '',
    blood_type: user?.blood_type ?? '',
    nutrition_preference: toText((user as any)?.nutrition_preference),
    operative_schedule: user?.operative_schedule ?? '',
    operative_status: user?.operative_status ?? 'DISPONIBLE',
    location_lat: toText(user?.location_lat),
    location_lng: toText(user?.location_lng),
    medical_notes: listToText(user?.medical_notes),
    specialties: listToText(user?.specialties),
    weight_kg: toText((user as any)?.weightKg ?? (user as any)?.weight_kg),
  };
}

function formatDate(value?: string) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function parseErrorMessage(text: string) {
  if (!text) return 'No se pudo guardar el perfil.';

  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.error === 'string') return data.error;

    const firstKey = Object.keys(data)[0];
    if (!firstKey) return 'No se pudo guardar el perfil.';

    const value = data[firstKey];
    if (Array.isArray(value)) return `${firstKey}: ${String(value[0])}`;
    return `${firstKey}: ${String(value)}`;
  } catch {
    return text;
  }
}

function getAvatarFileName(asset: ImagePicker.ImagePickerAsset) {
  if (asset.fileName) {
    return asset.fileName;
  }

  const uriName = asset.uri.split('/').pop();
  return uriName && uriName.includes('.') ? uriName : 'avatar.jpg';
}

function getAvatarMimeType(asset: ImagePicker.ImagePickerAsset) {
  if (asset.mimeType) {
    return asset.mimeType;
  }

  const fileName = getAvatarFileName(asset).toLowerCase();
  if (fileName.endsWith('.png')) return 'image/png';
  if (fileName.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function buildProfileFormData(form: ProfileForm, avatarAsset: ImagePicker.ImagePickerAsset | null) {
  const data = new FormData();

  PROFILE_FORM_FIELDS.forEach(([field, apiField]) => {
    data.append(apiField, form[field].trim());
  });

  if (avatarAsset) {
    data.append('avatar', {
      uri: avatarAsset.uri,
      name: getAvatarFileName(avatarAsset),
      type: getAvatarMimeType(avatarAsset),
    } as unknown as Blob);
  }

  return data;
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoPillLabel}>{label}</Text>
      <Text style={styles.infoPillValue}>{value || 'Sin dato'}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.textArea]}
      />
    </View>
  );
}

function SelectField({
  label,
  value,
  onValueChange,
  options,
  enabled = true,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  enabled?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.pickerShell, !enabled && styles.pickerShellDisabled]}>
        <Picker
          selectedValue={value}
          onValueChange={(nextValue) => onValueChange(String(nextValue))}
          enabled={enabled}
          style={styles.picker}
        >
          {options.map((option) => (
            <Picker.Item key={option.value || option.label} label={option.label} value={option.value} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

export default function ProfileScreen({ navigation }: any) {
  const { user, token, logout, updateUser } = useAuth();
  const [form, setForm] = useState<ProfileForm>(() => userToForm(user));
  const [currentUser, setCurrentUser] = useState<User | null>(user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarAsset, setAvatarAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const provinceOptions = useMemo(() => {
    if (!form.country) {
      return [{ value: '', label: 'Selecciona primero un pais' }];
    }

    return PROVINCE_OPTIONS_BY_COUNTRY[form.country] ?? [{ value: '', label: 'Sin provincias configuradas' }];
  }, [form.country]);

  const pickAvatar = async () => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitas permitir acceso a la galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled) {
      setAvatarAsset(result.assets[0]);
    }
  };


  const loadProfile = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError('No hay una sesion activa.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiFetch('/auth/me/', { token });
      if (!response.ok) {
        setError('No se pudo cargar el perfil.');
        return;
      }

      const payload = await parseJsonResponse<User>(response);
      setCurrentUser(payload);
      setForm(userToForm(payload));
      await updateUser(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Error cargando el perfil.');
    } finally {
      setLoading(false);
    }
  }, [token, updateUser]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const saveProfile = async () => {
    if (!token) {
      Alert.alert('Sesion requerida', 'No hay una sesion activa para guardar el perfil.');
      return;
    }

    if (!form.username.trim()) {
      setError('El username es obligatorio.');
      return;
    }

    if (!form.email.trim()) {
      setError('El email es obligatorio.');
      return;
    }

    if (form.birth_date.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(form.birth_date.trim())) {
      setError('La fecha de nacimiento debe tener formato YYYY-MM-DD.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiFetch('/auth/me/', {
        method: 'PATCH',
        token,
        body: buildProfileFormData(form, avatarAsset),
      });

      if (!response.ok) {
        setError(parseErrorMessage(await response.text()));
        return;
      }

      const payload = await parseJsonResponse<User>(response);
      setCurrentUser(payload);
      setForm(userToForm(payload));
      setAvatarAsset(null);
      await updateUser(payload);
      setSuccess('Perfil actualizado correctamente.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Error guardando el perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.logoutButton} onPress={() => void logout()}>
              <Text style={styles.logoutButtonText}>Cerrar sesion</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Perfil operativo</Text>
            <Text style={styles.title}>{currentUser?.username ?? 'Sin usuario'}</Text>
            <Text style={styles.subtitle}>{currentUser?.email ?? 'Sin correo disponible'}</Text>
          </View>

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color="#2563EB" />
              <Text style={styles.loadingText}>Cargando perfil...</Text>
            </View>
          ) : (
            <>
              <View style={styles.infoGrid}>
              <InfoPill label="Rol" value={ROLE_LABELS[currentUser?.role ?? '']} />
                <InfoPill label="Activo" value={currentUser?.is_active ? 'Si' : 'No'} />
                <InfoPill label="Organizacion" value={currentUser?.organization_name ?? ''} />
                <InfoPill
                  label="Estado"
                  value={STATUS_OPTIONS.find((option) => option.value === form.operative_status)?.label ?? ''}
                />
                <InfoPill
                  label="Nutricion"
                  value={NUTRITION_OPTIONS.find((option) => option.value === form.nutrition_preference)?.label ?? ''}
                />
                <InfoPill label="Creado" value={formatDate(currentUser?.created_at)} />
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {success ? (
                <View style={styles.successBox}>
                  <Text style={styles.successText}>{success}</Text>
                </View>
              ) : null}

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Cuenta</Text>
                <Field
                  label="Username"
                  value={form.username}
                  onChangeText={(value) => updateField('username', value)}
                  autoCapitalize="none"
                />
                <Field
                  label="Email"
                  value={form.email}
                  onChangeText={(value) => updateField('email', value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Field label="Nombre" value={form.first_name} onChangeText={(value) => updateField('first_name', value)} />
                <Field label="Apellido" value={form.last_name} onChangeText={(value) => updateField('last_name', value)} />
                <Field
                  label="Telefono"
                  value={form.phone}
                  onChangeText={(value) => updateField('phone', value)}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Contacto y salud</Text>
                <Field
                  label="Contacto de emergencia"
                  value={form.emergency_contact}
                  onChangeText={(value) => updateField('emergency_contact', value)}
                />
                <Field
                  label="Telefono de emergencia"
                  value={form.emergency_phone}
                  onChangeText={(value) => updateField('emergency_phone', value)}
                  keyboardType="phone-pad"
                />
                <Field label="DNI" value={form.dni} onChangeText={(value) => updateField('dni', value)} autoCapitalize="characters" />
                <Field
                  label="Grupo sanguineo"
                  value={form.blood_type}
                  onChangeText={(value) => updateField('blood_type', value)}
                  autoCapitalize="characters"
                />
                <SelectField
                  label="Preferencia nutricional"
                  value={form.nutrition_preference}
                  onValueChange={(value) => updateField('nutrition_preference', value)}
                  options={NUTRITION_OPTIONS}
                />
                <Field
                  label="Peso (kg)"
                  value={form.weight_kg}
                  onChangeText={(value) => updateField('weight_kg', value)}
                  keyboardType="decimal-pad"
                  placeholder="Ej. 75"
                />
                <Field
                  label="Notas medicas"
                  value={form.medical_notes}
                  onChangeText={(value) => updateField('medical_notes', value)}
                  placeholder="Una nota por linea"
                  multiline
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Datos operativos</Text>
                <Field
                  label="Especialidades"
                  value={form.specialties}
                  onChangeText={(value) => updateField('specialties', value)}
                  placeholder="Una especialidad por linea"
                  multiline
                />
                <Field
                  label="Horario operativo"
                  value={form.operative_schedule}
                  onChangeText={(value) => updateField('operative_schedule', value)}
                />
                <SelectField
                  label="Idioma"
                  value={form.language}
                  onValueChange={(value) => updateField('language', value)}
                  options={LANGUAGE_OPTIONS}
                />
                <Field
                  label="Fecha de nacimiento"
                  value={form.birth_date}
                  onChangeText={(value) => updateField('birth_date', value)}
                  placeholder="YYYY-MM-DD"
                  keyboardType="default"
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Ubicacion</Text>
                <SelectField
                  label="Pais"
                  value={form.country}
                  onValueChange={(value) => {
                    updateField('country', value);
                    updateField('province', '');
                  }}
                  options={COUNTRY_OPTIONS}
                />
                <SelectField
                  label="Provincia"
                  value={form.province}
                  onValueChange={(value) => updateField('province', value)}
                  options={provinceOptions}
                  enabled={Boolean(form.country)}
                />
                <Field label="Ciudad" value={form.city} onChangeText={(value) => updateField('city', value)} />
                <View style={styles.twoColumns}>
                  <View style={styles.column}>
                    <Field
                      label="Latitud"
                      value={form.location_lat}
                      onChangeText={(value) => updateField('location_lat', value)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.column}>
                    <Field
                      label="Longitud"
                      value={form.location_lng}
                      onChangeText={(value) => updateField('location_lng', value)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                <View style={styles.readOnlyBox}>
                  <Text style={styles.readOnlyLabel}>Direccion detectada</Text>
                  <Text style={styles.readOnlyValue}>{currentUser?.location_address || 'Sin direccion detectada'}</Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Asignacion</Text>
                <View style={styles.readOnlyBox}>
                  <Text style={styles.readOnlyLabel}>Organizacion</Text>
                  <Text style={styles.readOnlyValue}>
                    {currentUser?.organization_name || 'Sin organizacion'}
                  </Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Estado operativo</Text>
                <SelectField
                  label="Situacion actual"
                  value={form.operative_status}
                  onValueChange={(value) => updateField('operative_status', value)}
                  options={STATUS_OPTIONS}
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Datos del sistema</Text>
                <View style={styles.avatarRow}>
                  {avatarAsset?.uri || currentUser?.avatar ? (
                    <Image
                      source={{ uri: avatarAsset?.uri ?? currentUser?.avatar }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarPlaceholderText}>Sin avatar</Text>
                    </View>
                  )}

                  <TouchableOpacity style={styles.avatarButton} onPress={pickAvatar}>
                    <Text style={styles.avatarButtonText}>Cambiar imagen</Text>
                  </TouchableOpacity>
                </View>


              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={saveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar cambios</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardAvoiding: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  logoutButton: {
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logoutButtonText: {
    color: '#991B1B',
    fontWeight: '800',
  },
  hero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
  },
  eyebrow: {
    color: '#2563EB',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    marginTop: 8,
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 6,
    color: '#475569',
    fontSize: 15,
  },
  loadingCard: {
    minHeight: 180,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#475569',
    fontWeight: '700',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoPill: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoPillLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  infoPillValue: {
    marginTop: 5,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  errorBox: {
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 14,
  },
  errorText: {
    color: '#991B1B',
    fontWeight: '700',
  },
  successBox: {
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    padding: 14,
  },
  successText: {
    color: '#166534',
    fontWeight: '700',
  },
  card: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  field: {
    gap: 7,
  },
  label: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    color: '#0F172A',
    fontSize: 15,
  },
  pickerShell: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pickerShellDisabled: {
    opacity: 0.55,
  },
  picker: {
    color: '#0F172A',
    minHeight: 48,
  },
  textArea: {
    minHeight: 96,
    paddingTop: 12,
    paddingBottom: 12,
  },
  twoColumns: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  readOnlyBox: {
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  readOnlyValue: {
    marginTop: 6,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  saveButton: {
    borderRadius: 16,
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1D4ED8',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  avatarBlock: {
  borderRadius: 14,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E2E8F0',
  paddingHorizontal: 14,
  paddingVertical: 12,
  gap: 10,
},
avatarUrl: {
  color: '#64748B',
  fontSize: 12,
  lineHeight: 18,
},
avatarRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 14,
},
avatarImage: {
  width: 96,
  height: 96,
  borderRadius: 16,
  backgroundColor: '#E2E8F0',
},
avatarPlaceholder: {
  width: 96,
  height: 96,
  borderRadius: 16,
  backgroundColor: '#E2E8F0',
  alignItems: 'center',
  justifyContent: 'center',
},
avatarPlaceholderText: {
  color: '#64748B',
  fontSize: 12,
  fontWeight: '700',
},
avatarButton: {
  flex: 1,
  borderRadius: 14,
  backgroundColor: '#2563EB',
  paddingVertical: 13,
  paddingHorizontal: 14,
  alignItems: 'center',
},
avatarButtonText: {
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: '800',
},

});
