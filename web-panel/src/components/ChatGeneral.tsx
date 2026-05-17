import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuthStore } from "../store/authStore";
import { apiFetch } from "../utils/api";

type ChatRow = {
  id: string | number;
  name: string | null;
  created_at: string | null;
  chat_ref?: string | null;
  members?: string[];
};

type MessageRow = {
  id: string;
  content: string | null;
  created_at: string | null;
  profile_id: string | null;
  chat_id: string | number | null;
  incident_id: string | null;
  author_name?: string | null;
};

type UserRow = {
  id: string;
  profile_id?: string;
  username?: string;
  email?: string;
  role?: string;
  is_active?: boolean;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("es-ES");
}

function normalizeChats(payload: unknown): ChatRow[] {
  if (!Array.isArray(payload)) return [];

  return payload
    .map((item) => item as Partial<ChatRow>)
    .filter((item) => item.id !== undefined && item.id !== null)
    .map((item) => ({
      id: item.id as string | number,
      name: typeof item.name === "string" ? item.name : null,
      created_at: typeof item.created_at === "string" ? item.created_at : item.created_at ? String(item.created_at) : null,
      chat_ref: typeof item.chat_ref === "string" ? item.chat_ref : null,
      members: Array.isArray(item.members) ? item.members.map((member) => String(member).trim()).filter(Boolean) : [],
    }));
}

function normalizeMessages(payload: unknown): MessageRow[] {
  if (!Array.isArray(payload)) return [];

  return payload
    .map((item) => item as Partial<MessageRow>)
    .filter((item) => typeof item.id === "string")
    .map((item) => ({
      id: item.id as string,
      content: typeof item.content === "string" ? item.content : null,
      created_at: typeof item.created_at === "string" ? item.created_at : item.created_at ? String(item.created_at) : null,
      profile_id: typeof item.profile_id === "string" ? item.profile_id : null,
      chat_id: typeof item.chat_id === "string" || typeof item.chat_id === "number" ? item.chat_id : null,
      incident_id: typeof item.incident_id === "string" ? item.incident_id : null,
      author_name: typeof item.author_name === "string" ? item.author_name : null,
    }));
}

function normalizeUsers(payload: unknown): UserRow[] {
  if (Array.isArray(payload)) return payload as UserRow[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { results?: UserRow[] }).results)) {
    return (payload as { results?: UserRow[] }).results ?? [];
  }
  return [];
}

function encodeChatId(chatId: string | number) {
  return typeof chatId === "number" ? String(chatId) : chatId;
}

function getChatRef(chat: ChatRow | null) {
  return chat?.chat_ref?.trim() || null;
}

function role(role?: string) {
  if (role === "SUPERVISOR") return "Supervisor";
  if (role === "OPERATIVE") return "Operativo";
  if (role === "ADMIN") return "Administrador";
  return "Sin rol";
}

export default function ChatGeneral() {
  const { user } = useAuthStore();
  const currentProfileId = user?.profile_id ?? "";
  const [cargandoChats, setCargandoChats] = useState(true);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);
  const [creandoChat, setCreandoChat] = useState(false);
  const [guardandoMensajes, setGuardandoMensajes] = useState(false);
  const [accediendoPanel, setAccediendoPanel] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [nombreChat, setNombreChat] = useState("");
  const [mensajesByChat, setMensajesByChat] = useState<Record<string, MessageRow[]>>({});
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [MimebrosSeleccionados, setMiembrosSeleccionados] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    void (async () => {
      setCargandoChats(true);
      setErrorMessage("");
      try {
        const response = await apiFetch("/auth/panel/chats/");
        if (!response.ok) {
          const detail = await response.text();
          throw new Error(detail || "No se pudieron cargar los chats.");
        }

        const nextChats = normalizeChats(await response.json());
        setChats(nextChats);
        setSelectedChatId(nextChats[0] ? encodeChatId(nextChats[0].id) : null);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar los chats.");
      } finally {
        setCargandoChats(false);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      setCargandoUsuarios(true);
      try {
        const response = await apiFetch("/auth/panel/users/");
        if (!response.ok) return;
        setUsers(normalizeUsers(await response.json()));
      } finally {
        setCargandoUsuarios(false);
      }
    })();
  }, []);

  const selectedChat = useMemo(
    () => chats.find((chat) => encodeChatId(chat.id) === selectedChatId) ?? null,
    [chats, selectedChatId]
  );

  useEffect(() => {
    setMiembrosSeleccionados(selectedChat?.members ?? []);
  }, [selectedChat]);

  useEffect(() => {
    void (async () => {
      if (!selectedChatId) return;

      const targetChat = chats.find((chat) => encodeChatId(chat.id) === selectedChatId) ?? null;
      const chatRef = getChatRef(targetChat);
      if (!chatRef) {
        setMensajesByChat((current) => ({ ...current, [selectedChatId]: [] }));
        return;
      }

      setCargandoMensajes(true);
      setErrorMessage("");
      try {
        const response = await apiFetch(`/auth/panel/chats/${encodeURIComponent(chatRef)}/messages/`);
        if (!response.ok) {
          const detail = await response.text();
          throw new Error(detail || "No se pudieron cargar los mensajes.");
        }

        const nextMessages = normalizeMessages(await response.json());
        setMensajesByChat((current) => ({ ...current, [selectedChatId]: nextMessages }));
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar los mensajes.");
      } finally {
        setCargandoMensajes(false);
      }
    })();
  }, [selectedChatId, chats]);

  const selectedMessages = selectedChatId ? mensajesByChat[selectedChatId] ?? [] : [];

  const availableUsers = useMemo(
    () =>
      users
        .filter((current) => Boolean(current.profile_id))
        .sort((a, b) => (a.username || a.email || "").localeCompare(b.username || b.email || "", "es")),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const normalizedQuery = memberSearch.trim().toLowerCase();
    if (!normalizedQuery) return availableUsers;

    return availableUsers.filter((current) =>
      `${current.username ?? ""} ${current.email ?? ""}`.toLowerCase().includes(normalizedQuery)
    );
  }, [availableUsers, memberSearch]);

  async function handleCreateChat() {
    setCreandoChat(true);
    setErrorMessage("");

    try {
      const nombreChatLimpio = nombreChat.trim();
      if (!nombreChatLimpio) {
        throw new Error("Indica un nombre para el chat.");
      }

      const response = await apiFetch("/auth/panel/chats/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: nombreChatLimpio,
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "No se pudo crear el chat.");
      }

      const createdChat = normalizeChats([await response.json()])[0];
      if (!createdChat) {
        throw new Error("El servidor no devolvio el chat creado.");
      }

      setChats((current) => [createdChat, ...current]);
      setSelectedChatId(encodeChatId(createdChat.id));
      setNombreChat("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo crear el chat.");
    } finally {
      setCreandoChat(false);
    }
  }

  async function handleSaveMembers() {
    if (!selectedChat) return;

    setGuardandoMensajes(true);
    setErrorMessage("");
    try {
      const response = await apiFetch(`/auth/panel/chats/${encodeURIComponent(encodeChatId(selectedChat.id))}/members/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile_ids: MimebrosSeleccionados,
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "No se pudieron guardar los miembros del chat.");
      }

      const updatedChat = normalizeChats([await response.json()])[0];
      if (!updatedChat) {
        throw new Error("El servidor no devolvio el chat actualizado.");
      }

      setChats((current) =>
        current.map((chat) => (encodeChatId(chat.id) === encodeChatId(updatedChat.id) ? updatedChat : chat))
      );
      setMiembrosSeleccionados(updatedChat.members ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudieron guardar los miembros del chat.");
    } finally {
      setGuardandoMensajes(false);
    }
  }

  function toggleMember(profileId: string) {
    setMiembrosSeleccionados((current) =>
      current.includes(profileId) ? current.filter((item) => item !== profileId) : [...current, profileId]
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedDraft = draft.trim();
    const chatRef = getChatRef(selectedChat);
    if (!trimmedDraft || !selectedChat || !currentProfileId || !chatRef) return;

    setEnviandoMensaje(true);
    setErrorMessage("");
    try {
      const response = await apiFetch(`/auth/panel/chats/${encodeURIComponent(chatRef)}/messages/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: trimmedDraft,
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "No se pudo enviar el mensaje.");
      }

      const createdMessage = normalizeMessages([await response.json()])[0];
      if (createdMessage && selectedChatId) {
        setMensajesByChat((current) => ({
          ...current,
          [selectedChatId]: [...(current[selectedChatId] ?? []), createdMessage],
        }));
      }

      setDraft("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo enviar el mensaje.");
    } finally {
      setEnviandoMensaje(false);
    }
  }

  return (
    <div className="cm-shell min-h-screen px-4 py-5 lg:px-5 lg:py-6 2xl:px-6">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Chat</p>
            <h1 className="mt-1 text-2xl font-bold">Centro de comunicaciones</h1>
            <p className="mt-1 max-w-3xl text-sm text-[color:var(--cm-text-muted)]">
              Cada chat guarda los <code>profile_id</code> permitidos dentro del JSON del campo <code>profile_id</code>.
              Solo esos perfiles pueden verlo.
            </p>
          </div>
        </div>

        {errorMessage ? (
          <div className="cm-badge-danger mt-4 rounded-xl p-3 text-sm whitespace-pre-wrap">{errorMessage}</div>
        ) : null}

        <div className="mt-5 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
          <aside className="rounded-3xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Chats</p>
                <h2 className="mt-1 text-lg font-bold">Listado</h2>
              </div>
              <span className="cm-badge-info rounded-full px-2.5 py-1 text-xs">{chats.length}</span>
            </div>

            <div className="mt-4 space-y-3">
              {cargandoChats ? (
                <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-4 text-sm text-[color:var(--cm-text-muted)]">
                  Cargando chats...
                </div>
              ) : null}

              {!cargandoChats && chats.length === 0 ? (
                <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-4 text-sm text-[color:var(--cm-text-muted)]">
                  No hay chats disponibles para tu perfil.
                </div>
              ) : null}

              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Indique el nombre del chat"
                  value={nombreChat}
                  onChange={(e) => setNombreChat(e.target.value)}
                  className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-2 text-sm text-[color:var(--cm-text)] placeholder:text-[color:var(--cm-text-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--cm-primary)]"
                />
                <button
                  type="button"
                  onClick={() => void handleCreateChat()}
                  disabled={creandoChat}
                  className="self-end rounded-xl bg-[color:var(--cm-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creandoChat ? "Creando..." : "Crear chat"}
                </button>
              </div>

              {chats.map((chat) => {
                const chatKey = encodeChatId(chat.id);
                const isActive = chatKey === selectedChatId;

                return (
                  <button
                    key={chatKey}
                    type="button"
                    onClick={() => setSelectedChatId(chatKey)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isActive
                        ? "border-[color:var(--cm-info)] bg-[color:var(--cm-info)]/12"
                        : "border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] hover:border-[color:var(--cm-info)]/45"
                    }`}
                  >
                    <p className="font-semibold text-[color:var(--cm-text)]">{chat.name?.trim() || `Chat ${chatKey}`}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[color:var(--cm-text-muted)]">Creado</p>
                    <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">{formatDate(chat.created_at)}</p>
                    <p className="mt-3 text-xs text-[color:var(--cm-text-muted)]">
                      Miembros: {chat.members?.length ?? 0}
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="rounded-3xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)]">
            <header className="border-b border-[color:var(--cm-border)] px-5 py-4">
              {selectedChat ? (
                <>
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Chat seleccionado</p>
                  <h2 className="mt-1 text-lg font-bold">{selectedChat.name?.trim() || `Chat ${encodeChatId(selectedChat.id)}`}</h2>
                  <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">Creado el {formatDate(selectedChat.created_at)}</p>
                </>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Mensajes</p>
                  <h2 className="mt-1 text-lg font-bold">Selecciona un chat</h2>
                </>
              )}
            </header>

            <div className="space-y-4 px-5 py-5">
              {!selectedChat ? (
                <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-4 text-sm text-[color:var(--cm-text-muted)]">
                  Elige un chat de la izquierda para ver sus mensajes.
                </div>
              ) : null}

              {selectedChat && !getChatRef(selectedChat) ? (
                <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-4 text-sm text-[color:var(--cm-text-muted)]">
                  Este chat no tiene una referencia válida para enlazar mensajes.
                </div>
              ) : null}

              {selectedChat && getChatRef(selectedChat) && cargandoMensajes ? (
                <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-4 text-sm text-[color:var(--cm-text-muted)]">
                  Cargando mensajes...
                </div>
              ) : null}

              {selectedChat && getChatRef(selectedChat) && !cargandoMensajes && selectedMessages.length === 0 ? (
                <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-4 text-sm text-[color:var(--cm-text-muted)]">
                  Este chat todavia no tiene mensajes.
                </div>
              ) : null}

              {selectedMessages.map((message) => {
                const isOwnMessage = Boolean(currentProfileId) && message.profile_id === currentProfileId;
                const authorLabel = isOwnMessage ? "Tu" : message.author_name?.trim() || message.profile_id || "Perfil desconocido";

                return (
                  <article key={message.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-3xl rounded-2xl px-4 py-3 ${
                        isOwnMessage
                          ? "bg-[color:var(--cm-primary)] text-white"
                          : "border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] text-[color:var(--cm-text)]"
                      }`}
                    >
                      <p className="text-xs uppercase tracking-[0.14em] opacity-75">{authorLabel}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.content?.trim() || "(sin contenido)"}</p>
                      <p className="mt-3 text-xs opacity-70">{formatDate(message.created_at)}</p>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="border-t border-[color:var(--cm-border)] px-5 py-4">
              {!currentProfileId ? (
                <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-4 text-sm text-[color:var(--cm-text-muted)]">
                  No se ha encontrado el <code>profile_id</code> del usuario autenticado. Sin ese dato no se puede enviar mensajes.
                </div>
              ) : (
                <form
                  onSubmit={(event) => void handleSubmit(event)}
                  className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-3"
                >
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={4}
                    placeholder="Escribe un mensaje..."
                    disabled={!selectedChat || !getChatRef(selectedChat) || enviandoMensaje    }
                    className="w-full resize-none bg-transparent text-sm text-[color:var(--cm-text)] outline-none placeholder:text-[color:var(--cm-text-muted)] disabled:opacity-60"
                  />

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--cm-border)] pt-3">
                    <p className="text-xs text-[color:var(--cm-text-muted)]">
                        
                    </p>
                    <button
                      type="submit"
                      disabled={!selectedChat || !getChatRef(selectedChat) || !draft.trim() || enviandoMensaje}
                      className="rounded-xl bg-[color:var(--cm-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {enviandoMensaje ? "Enviando..." : "Enviar"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>

          <aside className="rounded-3xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-4">
            <button
              type="button"
              onClick={() => setAccediendoPanel((current) => !current)}
              className="flex w-full items-start justify-between gap-3 text-left"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Acceso al chat</p>
                <h3 className="mt-1 text-lg font-bold">Usuarios autorizados</h3>
                <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">
                  Selecciona que perfiles pueden visualizar el chat.
                </p>
              </div>
              <span
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--cm-border)] text-sm text-[color:var(--cm-text-muted)] transition-transform ${
                  accediendoPanel ? "rotate-180" : ""
                }`}
              >
                ▾
              </span>
            </button>

            {selectedChat ? (
              <div className="mt-4 rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--cm-text-muted)]">Miembros actuales</p>
                <p className="mt-2 text-sm text-[color:var(--cm-text)]">{selectedChat.members?.length ?? 0}</p>
              </div>
            ) : null}

            {accediendoPanel ? (
              selectedChat ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-3">
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(event) => setMemberSearch(event.target.value)}
                      placeholder="Buscar usuario por nombre..."
                      className="w-full rounded-xl border border-[color:var(--cm-border)] bg-transparent px-3 py-2.5 text-sm text-[color:var(--cm-text)] outline-none transition focus:border-[color:var(--cm-info)]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSaveMembers()}
                    disabled={guardandoMensajes}
                    className="w-full rounded-xl bg-[color:var(--cm-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {guardandoMensajes ? "Guardando..." : "Guardar miembros"}
                  </button>

                  <div className="max-h-[34rem] space-y-2 overflow-auto pr-1">
                    {cargandoUsuarios ? (
                      <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-4 text-sm text-[color:var(--cm-text-muted)]">
                        Cargando usuarios...
                      </div>
                    ) : null}

                    {!cargandoUsuarios &&
                      filteredUsers.map((current) => {
                        const profileId = current.profile_id?.trim() || "";
                        const checked = MimebrosSeleccionados.includes(profileId);

                        return (
                          <label
                            key={current.id}
                            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-3"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleMember(profileId)}
                              className="mt-1 h-4 w-4"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-[color:var(--cm-text)]">{current.username || current.email || current.id}</p>
                              <p className="mt-1 text-xs text-[color:var(--cm-text-muted)]">{role(current.role)}</p>
                              <p className="mt-1 text-xs text-[color:var(--cm-text-muted)]">{current.email || "Sin correo"}</p>
                            </div>
                          </label>
                        );
                      })}

                    {!cargandoUsuarios && filteredUsers.length === 0 ? (
                      <div className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-4 text-sm text-[color:var(--cm-text-muted)]">
                    No hay usuarios que coincidan con la búsqueda.
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] p-4 text-sm text-[color:var(--cm-text-muted)]">
                  Selecciona un chat para gestionar sus accesos.
                </div>
              )
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
