import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import { apiFetch, parseJsonResponse } from '../services/api';
import { colors } from '../theme';

type ChatKind = 'general' | 'incident';

type MobileChat = {
  id: string;
  kind: ChatKind;
  name: string | null;
  created_at?: string | null;
  chat_ref?: string | null;
  incident_id?: string | null;
  status?: string | null;
  members?: string[];
};

type MobileMessage = {
  id: string;
  content?: string | null;
  created_at?: string | null;
  profile_id?: string | null;
  author_id?: string | null;
  author_name?: string | null;
  author_username?: string | null;
};

type ChatListResponse = MobileChat[] | { results?: MobileChat[] };

function normalizarChats(payload: ChatListResponse) {
  const filas = Array.isArray(payload) ? payload : payload.results ?? [];

  return filas.filter((chat) => chat.id && (chat.kind === 'general' || chat.kind === 'incident'));
}

function normalizarMensajes(payload: unknown) {
  if (!Array.isArray(payload)) {
    return [] as MobileMessage[];
  }

  return payload
    .map((item) => item as Partial<MobileMessage>)
    .filter((item) => typeof item.id === 'string')
    .map((item) => ({
      id: item.id as string,
      content: typeof item.content === 'string' ? item.content : '',
      created_at: typeof item.created_at === 'string' ? item.created_at : item.created_at ? String(item.created_at) : null,
      profile_id: typeof item.profile_id === 'string' ? item.profile_id : null,
      author_id: typeof item.author_id === 'string' ? item.author_id : null,
      author_name: typeof item.author_name === 'string' ? item.author_name : null,
      author_username: typeof item.author_username === 'string' ? item.author_username : null,
    }));
}

function formatearFecha(valor?: string | null) {
  if (!valor) {
    return '';
  }

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(fecha);
}

function obtenerDestinoChat(chat: MobileChat) {
  if (chat.kind === 'general' && chat.chat_ref) {
    return { kind: 'general', id: chat.chat_ref };
  }

  if (chat.kind === 'incident' && chat.incident_id) {
    return { kind: 'incident', id: chat.incident_id };
  }

  return null;
}

async function leerError(respuesta: Response, mensajePorDefecto: string) {
  try {
    const payload = await parseJsonResponse<{ detail?: string; error?: string }>(respuesta);
    return payload.detail ?? payload.error ?? mensajePorDefecto;
  } catch {
    return mensajePorDefecto;
  }
}

export default function PantallaChat({ navigation }: any) {
  const { token, user } = useAuth();
  const [chats, setChats] = useState<MobileChat[]>([]);
  const [idChatSeleccionado, setIdChatSeleccionado] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<MobileMessage[]>([]);
  const [borrador, setBorrador] = useState('');
  const [cargandoChats, setCargandoChats] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listaMensajesRef = useRef<FlatList<MobileMessage>>(null);

  const chatSeleccionado = useMemo(
    () => chats.find((chat) => chat.id === idChatSeleccionado) ?? chats[0] ?? null,
    [chats, idChatSeleccionado]
  );

  const cargarChats = useCallback(async (refrescar = false) => {
    if (!token) {
      setError('No hay sesion activa.');
      setCargandoChats(false);
      return;
    }

    if (refrescar) {
      setRefrescando(true);
    } else {
      setCargandoChats(true);
    }

    setError(null);

    try {
      const respuesta = await apiFetch('/mobile/chats/', { token, timeoutMs: 12000 });
      if (!respuesta.ok) {
        throw new Error(await leerError(respuesta, 'No se pudieron cargar los chats.'));
      }

      const siguientesChats = normalizarChats(await parseJsonResponse<ChatListResponse>(respuesta));
      setChats(siguientesChats);
      setIdChatSeleccionado((actual) => {
        if (actual && siguientesChats.some((chat) => chat.id === actual)) {
          return actual;
        }
        return siguientesChats[0]?.id ?? null;
      });
    } catch (siguienteError) {
      setError(siguienteError instanceof Error ? siguienteError.message : 'No se pudieron cargar los chats.');
    } finally {
      setCargandoChats(false);
      setRefrescando(false);
    }
  }, [token]);

  const cargarMensajes = useCallback(async (chat: MobileChat | null, silencioso = false) => {
    if (!token || !chat) {
      setMensajes([]);
      return;
    }

    const destino = obtenerDestinoChat(chat);
    if (!destino) {
      setMensajes([]);
      return;
    }

    if (!silencioso) {
      setCargandoMensajes(true);
    }

    try {
      const respuesta = await apiFetch(
        `/mobile/chats/${encodeURIComponent(destino.kind)}/${encodeURIComponent(destino.id)}/messages/`,
        { token, timeoutMs: 12000 }
      );

      if (!respuesta.ok) {
        throw new Error(await leerError(respuesta, 'No se pudieron cargar los mensajes.'));
      }

      setMensajes(normalizarMensajes(await parseJsonResponse<unknown>(respuesta)));
    } catch (siguienteError) {
      if (!silencioso) {
        setError(siguienteError instanceof Error ? siguienteError.message : 'No se pudieron cargar los mensajes.');
      }
    } finally {
      if (!silencioso) {
        setCargandoMensajes(false);
      }
    }
  }, [token]);

  useEffect(() => {
    void cargarChats();
  }, [cargarChats]);

  useEffect(() => {
    void cargarMensajes(chatSeleccionado);

    const idIntervalo = setInterval(() => {
      void cargarMensajes(chatSeleccionado, true);
    }, 8000);

    return () => clearInterval(idIntervalo);
  }, [cargarMensajes, chatSeleccionado]);

  useEffect(() => {
    if (mensajes.length === 0) {
      return;
    }

    const idTimeout = setTimeout(() => {
      listaMensajesRef.current?.scrollToEnd({ animated: true });
    }, 100);

    return () => clearTimeout(idTimeout);
  }, [mensajes]);

  const enviarMensaje = async () => {
    const texto = borrador.trim();
    if (!token || !chatSeleccionado || !texto || enviando) {
      return;
    }

    const destino = obtenerDestinoChat(chatSeleccionado);
    if (!destino) {
      Alert.alert('Chat no disponible', 'Este chat no tiene una referencia valida.');
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      const respuesta = await apiFetch(
        `/mobile/chats/${encodeURIComponent(destino.kind)}/${encodeURIComponent(destino.id)}/messages/`,
        {
          method: 'POST',
          token,
          body: JSON.stringify({ content: texto }),
          timeoutMs: 12000,
        }
      );

      if (!respuesta.ok) {
        throw new Error(await leerError(respuesta, 'No se pudo enviar el mensaje.'));
      }

      const mensajeCreado = normalizarMensajes([await parseJsonResponse<unknown>(respuesta)])[0];
      if (mensajeCreado) {
        setMensajes((actuales) => [...actuales, mensajeCreado]);
      }
      setBorrador('');
    } catch (siguienteError) {
      Alert.alert('Error', siguienteError instanceof Error ? siguienteError.message : 'No se pudo enviar el mensaje.');
    } finally {
      setEnviando(false);
    }
  };

  const renderizarChat = ({ item }: { item: MobileChat }) => {
    const estaSeleccionado = item.id === chatSeleccionado?.id;

    return (
      <TouchableOpacity
        style={[estilos.chatItem, estaSeleccionado ? estilos.chatItemActive : null]}
        onPress={() => setIdChatSeleccionado(item.id)}
      >
        <Text style={estilos.chatName} numberOfLines={1}>{item.name || 'Chat'}</Text>
        <Text style={estilos.chatMeta}>
          {item.kind === 'incident' ? 'Incidente' : 'Chat'} {formatearFecha(item.created_at)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderizarMensaje = ({ item }: { item: MobileMessage }) => {
    const esPropio =
      Boolean(user?.profile_id && item.profile_id === user.profile_id) ||
      Boolean(user?.id && item.author_id === user.id);
    const autor = esPropio ? 'Tu' : item.author_name || item.author_username || 'Usuario';

    return (
      <View style={[estilos.messageRow, esPropio ? estilos.ownMessageRow : null]}>
        <View style={[estilos.messageBubble, esPropio ? estilos.ownMessageBubble : estilos.otherMessageBubble]}>
          <Text style={[estilos.messageAuthor, esPropio ? estilos.ownMessageText : null]}>{autor}</Text>
          <Text style={[estilos.messageContent, esPropio ? estilos.ownMessageText : null]}>
            {item.content?.trim() || '(sin contenido)'}
          </Text>
          <Text style={[estilos.messageDate, esPropio ? estilos.ownMessageDate : null]}>{formatearFecha(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={estilos.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={estilos.header}>
        <TouchableOpacity style={estilos.backButton} onPress={() => navigation.goBack()}>
          <Text style={estilos.backButtonText}>Volver</Text>
        </TouchableOpacity>
        <View style={estilos.headerText}>
          <Text style={estilos.title}>Chats</Text>
          <Text style={estilos.subtitle}>Comunicaciones del operativo</Text>
        </View>
      </View>

      {error ? <Text style={estilos.errorText}>{error}</Text> : null}

      <View style={estilos.chatListBox}>
        {cargandoChats ? (
          <View style={estilos.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={estilos.loadingText}>Cargando chats...</Text>
          </View>
        ) : (
          <FlatList
            horizontal
            data={chats}
            keyExtractor={(item) => item.id}
            renderItem={renderizarChat}
            contentContainerStyle={estilos.chatListContent}
            showsHorizontalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refrescando} onRefresh={() => cargarChats(true)} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <View style={estilos.emptyChats}>
                <Text style={estilos.emptyTitle}>Sin chats disponibles</Text>
                <Text style={estilos.emptyText}>
                  Aqui apareceran los chats donde estes anadido y los chats de incidentes de tu organizacion.
                </Text>
              </View>
            }
          />
        )}
      </View>

      <View style={estilos.messagesHeader}>
        <Text style={estilos.selectedTitle}>{chatSeleccionado?.name || 'Selecciona un chat'}</Text>
        <TouchableOpacity onPress={() => cargarMensajes(chatSeleccionado)} disabled={!chatSeleccionado || cargandoMensajes}>
          <Text style={estilos.refreshText}>{cargandoMensajes ? 'Actualizando...' : 'Actualizar'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listaMensajesRef}
        data={mensajes}
        keyExtractor={(item) => item.id}
        renderItem={renderizarMensaje}
        contentContainerStyle={estilos.messagesContent}
        ListEmptyComponent={
          <View style={estilos.emptyMessages}>
            <Text style={estilos.emptyText}>
              {chatSeleccionado ? 'Este chat todavia no tiene mensajes.' : 'Selecciona un chat para leer mensajes.'}
            </Text>
          </View>
        }
      />

      <View style={estilos.composer}>
        <TextInput
          value={borrador}
          onChangeText={setBorrador}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={colors.textMuted}
          multiline
          style={estilos.input}
          editable={Boolean(chatSeleccionado) && !enviando}
        />
        <TouchableOpacity
          style={[estilos.sendButton, !borrador.trim() || !chatSeleccionado || enviando ? estilos.sendButtonDisabled : null]}
          onPress={enviarMensaje}
          disabled={!borrador.trim() || !chatSeleccionado || enviando}
        >
          <Text style={estilos.sendButtonText}>{enviando ? '...' : 'Enviar'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 14,
    paddingBottom: 16,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  backButton: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  chatListBox: {
    minHeight: 118,
  },
  chatListContent: {
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  chatItem: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 80,
    padding: 12,
    width: 190,
  },
  chatItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chatName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  chatMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  loadingBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 22,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyChats: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    width: 300,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  messagesHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  selectedTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  refreshText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  messagesContent: {
    flexGrow: 1,
    gap: 10,
    padding: 18,
  },
  emptyMessages: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 48,
  },
  messageRow: {
    alignItems: 'flex-start',
  },
  ownMessageRow: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    borderRadius: 14,
    maxWidth: '84%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ownMessageBubble: {
    backgroundColor: colors.primary,
  },
  otherMessageBubble: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  messageAuthor: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  messageContent: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 5,
  },
  messageDate: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 8,
  },
  ownMessageText: {
    color: colors.white,
  },
  ownMessageDate: {
    color: colors.primarySoft,
  },
  composer: {
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    maxHeight: 110,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  sendButtonDisabled: {
    opacity: 0.55,
  },
  sendButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
});

