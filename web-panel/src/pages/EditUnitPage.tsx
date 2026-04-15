import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../utils/api";
import MapaMiniUnidad from "../components/MapaMiniUnidad";


const OPCIONES_ROL = [
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "OPERATIVE", label: "Operativo" },
];

const OPCIONES_ESTADO = [
  { value: "DISPONIBLE", label: "Disponible" },
  { value: "EN_INCIDENTE", label: "En incidente" },
  { value: "DESCONECTADA", label: "Desconectada" },
  { value: "NO_DISPONIBLE", label: "No disponible" },
];

type RespuestaDetalleUnidad = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role?: "SUPERVISOR" | "OPERATIVE";
  is_active: boolean;
  emergency_contact?: string;
  emergency_phone?: string;
  medical_notes?: string[];
  organization_id?: string;
  dni?: string;
  avatar?: string;
  language?: string;
  city?: string;
  province?: string;
  country?: string;
  birth_date?: string;
  specialties?: string[];
  operative_schedule?: string;
  blood_type?: string;
  device_id?: string;
  assigned_supervisor_id?: string;
  location_lat?: number | null;
  location_lng?: number | null;
  location_address?: string;
};

const OPCIONES_IDIOMA = [
  { value: "", label: "Selecciona un idioma" },
  { value: "es", label: "Espanol" },
  { value: "en", label: "Ingles" },
  { value: "fr", label: "Frances" },
  { value: "de", label: "Aleman" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Portugues" },
  { value: "zh", label: "Chino" },
  { value: "ja", label: "Japones" },
  { value: "cat", label: "Catalan" },
  { value: "eus", label: "Euskera" },
  { value: "gall", label: "Gallego" },
];

const OPCIONES_PAIS = [
  { value: "", label: "Selecciona un pais" },
  { value: "Espana", label: "Espana" },
  { value: "Portugal", label: "Portugal" },
  { value: "Francia", label: "Francia" },
  { value: "Italia", label: "Italia" },
  { value: "Alemania", label: "Alemania" },
  { value: "Reino Unido", label: "Reino Unido" },
  { value: "Estados Unidos", label: "Estados Unidos" },
  { value: "Andorra", label: "Andorra" },
  { value: "Marruecos", label: "Marruecos" },
];

// ESPAÑA
const OPCIONES_PROVINCIA_ESPANA = [
  { value: "", label: "Selecciona una provincia" },
  { value: "Alava", label: "Alava" },
  { value: "Albacete", label: "Albacete" },
  { value: "Alicante", label: "Alicante" },
  { value: "Almeria", label: "Almeria" },
  { value: "Asturias", label: "Asturias" },
  { value: "Avila", label: "Avila" },
  { value: "Badajoz", label: "Badajoz" },
  { value: "Illes Balears", label: "Illes Balears" },
  { value: "Burgos", label: "Burgos" },
  { value: "Caceres", label: "Caceres" },
  { value: "Cadiz", label: "Cadiz" },
  { value: "Cantabria", label: "Cantabria" },
  { value: "Castellon", label: "Castellon" },
  { value: "Ceuta", label: "Ceuta" },
  { value: "Ciudad Real", label: "Ciudad Real" },
  { value: "Cordoba", label: "Cordoba" },
  { value: "A Coruna", label: "A Coruna" },
  { value: "Cuenca", label: "Cuenca" },
  { value: "Girona", label: "Girona" },
  { value: "Granada", label: "Granada" },
  { value: "Guadalajara", label: "Guadalajara" },
  { value: "Gipuzkoa", label: "Gipuzkoa" },
  { value: "Huelva", label: "Huelva" },
  { value: "Huesca", label: "Huesca" },
  { value: "Jaen", label: "Jaen" },
  { value: "Leon", label: "Leon" },
  { value: "Lleida", label: "Lleida" },
  { value: "La Rioja", label: "La Rioja" },
  { value: "Lugo", label: "Lugo" },
  { value: "Malaga", label: "Malaga" },
  { value: "Melilla", label: "Melilla" },
  { value: "Navarra", label: "Navarra" },
  { value: "Ourense", label: "Ourense" },
  { value: "Palencia", label: "Palencia" },
  { value: "Las Palmas", label: "Las Palmas" },
  { value: "Pontevedra", label: "Pontevedra" },
  { value: "Salamanca", label: "Salamanca" },
  { value: "Santa Cruz de Tenerife", label: "Santa Cruz de Tenerife" },
  { value: "Segovia", label: "Segovia" },
  { value: "Soria", label: "Soria" },
  { value: "Tarragona", label: "Tarragona" },
  { value: "Teruel", label: "Teruel" },
  { value: "Toledo", label: "Toledo" },
  { value: "Valladolid", label: "Valladolid" },
  { value: "Bizkaia", label: "Bizkaia" },
  { value: "Zamora", label: "Zamora" },
  { value: "Madrid", label: "Madrid" },
  { value: "Barcelona", label: "Barcelona" },
  { value: "Valencia", label: "Valencia" },
  { value: "Sevilla", label: "Sevilla" },
  { value: "Zaragoza", label: "Zaragoza" },
  { value: "Málaga", label: "Málaga" },
  { value: "Murcia", label: "Murcia" },
];

// PORTUGAL
const OPCIONES_PROVINCIA_PORTUGAL = [
  { value: "", label: "Selecciona una provincia" },
  { value: "Aveiro", label: "Aveiro" },
  { value: "Beja", label: "Beja" },
  { value: "Braganca", label: "Braganca" },
  { value: "Castelo Branco", label: "Castelo Branco" },
  { value: "Evora", label: "Evora" },
  { value: "Guarda", label: "Guarda" },
  { value: "Leiria", label: "Leiria" },
  { value: "Lisboa", label: "Lisboa" },
  { value: "Portalegre", label: "Portalegre" },
  { value: "Porto", label: "Porto" },
  { value: "Braga", label: "Braga" },
  { value: "Coimbra", label: "Coimbra" },
  { value: "Faro", label: "Faro" },
  { value: "Santarem", label: "Santarem" },
  { value: "Setubal", label: "Setubal" },
  { value: "Viana do Castelo", label: "Viana do Castelo" },
  { value: "Vila Real", label: "Vila Real" },
  { value: "Viseu", label: "Viseu" },
  { value: "Azores", label: "Azores" },
  { value: "Madeira", label: "Madeira" },
];

// FRANCIA
const OPCIONES_PROVINCIA_FRANCIA = [
  { value: "", label: "Selecciona una región" },
  { value: "Île-de-France", label: "Île-de-France" },
  { value: "Provence-Alpes-Côte d'Azur", label: "Provence-Alpes-Côte d'Azur" },
  { value: "Nouvelle-Aquitaine", label: "Nouvelle-Aquitaine" },
  { value: "Occitanie", label: "Occitanie" },
  { value: "Auvergne-Rhône-Alpes", label: "Auvergne-Rhône-Alpes" },
];

// ITALIA
const OPCIONES_PROVINCIA_ITALIA = [
  { value: "", label: "Selecciona una región" },
  { value: "Lombardia", label: "Lombardia" },
  { value: "Lazio", label: "Lazio" },
  { value: "Campania", label: "Campania" },
  { value: "Sicilia", label: "Sicilia" },
  { value: "Veneto", label: "Veneto" },
];

// ALEMANIA
const OPCIONES_PROVINCIA_ALEMANIA = [
  { value: "", label: "Selecciona un estado" },
  { value: "Baviera", label: "Baviera" },
  { value: "Berlín", label: "Berlín" },
  { value: "Hamburgo", label: "Hamburgo" },
  { value: "Hesse", label: "Hesse" },
  { value: "Sajonia", label: "Sajonia" },
];

const OPCIONES_PROVINCIA_FRANCIA_COMPLETA = [
  { value: "", label: "Selecciona una region" },
  { value: "Auvergne-Rhone-Alpes", label: "Auvergne-Rhone-Alpes" },
  { value: "Bourgogne-Franche-Comte", label: "Bourgogne-Franche-Comte" },
  { value: "Bretagne", label: "Bretagne" },
  { value: "Centre-Val de Loire", label: "Centre-Val de Loire" },
  { value: "Corse", label: "Corse" },
  { value: "Grand Est", label: "Grand Est" },
  { value: "Hauts-de-France", label: "Hauts-de-France" },
  { value: "Ile-de-France", label: "Ile-de-France" },
  { value: "Normandie", label: "Normandie" },
  { value: "Nouvelle-Aquitaine", label: "Nouvelle-Aquitaine" },
  { value: "Occitanie", label: "Occitanie" },
  { value: "Pays de la Loire", label: "Pays de la Loire" },
  { value: "Provence-Alpes-Cote d'Azur", label: "Provence-Alpes-Cote d'Azur" },
  { value: "Guadeloupe", label: "Guadeloupe" },
  { value: "Martinique", label: "Martinique" },
  { value: "Guyane", label: "Guyane" },
  { value: "La Reunion", label: "La Reunion" },
  { value: "Mayotte", label: "Mayotte" },
];

const OPCIONES_PROVINCIA_ITALIA_COMPLETA = [
  { value: "", label: "Selecciona una region" },
  { value: "Abruzzo", label: "Abruzzo" },
  { value: "Basilicata", label: "Basilicata" },
  { value: "Calabria", label: "Calabria" },
  { value: "Campania", label: "Campania" },
  { value: "Emilia-Romagna", label: "Emilia-Romagna" },
  { value: "Friuli-Venezia Giulia", label: "Friuli-Venezia Giulia" },
  { value: "Lazio", label: "Lazio" },
  { value: "Liguria", label: "Liguria" },
  { value: "Lombardia", label: "Lombardia" },
  { value: "Marche", label: "Marche" },
  { value: "Molise", label: "Molise" },
  { value: "Piemonte", label: "Piemonte" },
  { value: "Puglia", label: "Puglia" },
  { value: "Sardegna", label: "Sardegna" },
  { value: "Sicilia", label: "Sicilia" },
  { value: "Toscana", label: "Toscana" },
  { value: "Trentino-Alto Adige", label: "Trentino-Alto Adige" },
  { value: "Umbria", label: "Umbria" },
  { value: "Valle d'Aosta", label: "Valle d'Aosta" },
  { value: "Veneto", label: "Veneto" },
];

const OPCIONES_PROVINCIA_ALEMANIA_COMPLETA = [
  { value: "", label: "Selecciona un estado" },
  { value: "Baden-Wurttemberg", label: "Baden-Wurttemberg" },
  { value: "Baviera", label: "Baviera" },
  { value: "Berlin", label: "Berlin" },
  { value: "Brandeburgo", label: "Brandeburgo" },
  { value: "Bremen", label: "Bremen" },
  { value: "Hamburgo", label: "Hamburgo" },
  { value: "Hesse", label: "Hesse" },
  { value: "Mecklemburgo-Pomerania Occidental", label: "Mecklemburgo-Pomerania Occidental" },
  { value: "Baja Sajonia", label: "Baja Sajonia" },
  { value: "Renania del Norte-Westfalia", label: "Renania del Norte-Westfalia" },
  { value: "Renania-Palatinado", label: "Renania-Palatinado" },
  { value: "Sarre", label: "Sarre" },
  { value: "Sajonia", label: "Sajonia" },
  { value: "Sajonia-Anhalt", label: "Sajonia-Anhalt" },
  { value: "Schleswig-Holstein", label: "Schleswig-Holstein" },
  { value: "Turingia", label: "Turingia" },
];

const OPCIONES_PROVINCIA_REINO_UNIDO = [
  { value: "", label: "Selecciona una division" },
  { value: "Inglaterra", label: "Inglaterra" },
  { value: "Escocia", label: "Escocia" },
  { value: "Gales", label: "Gales" },
  { value: "Irlanda del Norte", label: "Irlanda del Norte" },
];

const OPCIONES_PROVINCIA_ESTADOS_UNIDOS = [
  { value: "", label: "Selecciona un estado" },
  { value: "Alabama", label: "Alabama" },
  { value: "Alaska", label: "Alaska" },
  { value: "Arizona", label: "Arizona" },
  { value: "Arkansas", label: "Arkansas" },
  { value: "California", label: "California" },
  { value: "Colorado", label: "Colorado" },
  { value: "Connecticut", label: "Connecticut" },
  { value: "Delaware", label: "Delaware" },
  { value: "Florida", label: "Florida" },
  { value: "Georgia", label: "Georgia" },
  { value: "Hawaii", label: "Hawaii" },
  { value: "Idaho", label: "Idaho" },
  { value: "Illinois", label: "Illinois" },
  { value: "Indiana", label: "Indiana" },
  { value: "Iowa", label: "Iowa" },
  { value: "Kansas", label: "Kansas" },
  { value: "Kentucky", label: "Kentucky" },
  { value: "Louisiana", label: "Louisiana" },
  { value: "Maine", label: "Maine" },
  { value: "Maryland", label: "Maryland" },
  { value: "Massachusetts", label: "Massachusetts" },
  { value: "Michigan", label: "Michigan" },
  { value: "Minnesota", label: "Minnesota" },
  { value: "Mississippi", label: "Mississippi" },
  { value: "Missouri", label: "Missouri" },
  { value: "Montana", label: "Montana" },
  { value: "Nebraska", label: "Nebraska" },
  { value: "Nevada", label: "Nevada" },
  { value: "New Hampshire", label: "New Hampshire" },
  { value: "New Jersey", label: "New Jersey" },
  { value: "New Mexico", label: "New Mexico" },
  { value: "New York", label: "New York" },
  { value: "North Carolina", label: "North Carolina" },
  { value: "North Dakota", label: "North Dakota" },
  { value: "Ohio", label: "Ohio" },
  { value: "Oklahoma", label: "Oklahoma" },
  { value: "Oregon", label: "Oregon" },
  { value: "Pennsylvania", label: "Pennsylvania" },
  { value: "Rhode Island", label: "Rhode Island" },
  { value: "South Carolina", label: "South Carolina" },
  { value: "South Dakota", label: "South Dakota" },
  { value: "Tennessee", label: "Tennessee" },
  { value: "Texas", label: "Texas" },
  { value: "Utah", label: "Utah" },
  { value: "Vermont", label: "Vermont" },
  { value: "Virginia", label: "Virginia" },
  { value: "Washington", label: "Washington" },
  { value: "West Virginia", label: "West Virginia" },
  { value: "Wisconsin", label: "Wisconsin" },
  { value: "Wyoming", label: "Wyoming" },
  { value: "District of Columbia", label: "District of Columbia" },
];

const OPCIONES_PROVINCIA_ANDORRA = [
  { value: "", label: "Selecciona una parroquia" },
  { value: "Andorra la Vella", label: "Andorra la Vella" },
  { value: "Canillo", label: "Canillo" },
  { value: "Encamp", label: "Encamp" },
  { value: "Escaldes-Engordany", label: "Escaldes-Engordany" },
  { value: "La Massana", label: "La Massana" },
  { value: "Ordino", label: "Ordino" },
  { value: "Sant Julia de Loria", label: "Sant Julia de Loria" },
];

const OPCIONES_PROVINCIA_MARRUECOS = [
  { value: "", label: "Selecciona una region" },
  { value: "Casablanca-Settat", label: "Casablanca-Settat" },
  { value: "Rabat-Sale-Kenitra", label: "Rabat-Sale-Kenitra" },
  { value: "Marrakesh-Safi", label: "Marrakesh-Safi" },
  { value: "Fes-Meknes", label: "Fes-Meknes" },
  { value: "Tangier-Tetouan-Al Hoceima", label: "Tangier-Tetouan-Al Hoceima" },
  { value: "Souss-Massa", label: "Souss-Massa" },
  { value: "Beni Mellal-Khenifra", label: "Beni Mellal-Khenifra" },
  { value: "Oriental", label: "Oriental" },
  { value: "Draa-Tafilalet", label: "Draa-Tafilalet" },
  { value: "Guelmim-Oued Noun", label: "Guelmim-Oued Noun" },
  { value: "Laayoune-Sakia El Hamra", label: "Laayoune-Sakia El Hamra" },
  { value: "Dakhla-Oued Ed-Dahab", label: "Dakhla-Oued Ed-Dahab" },
];

type OpcionOrganizacion = {
  id: string;
  name: string;
};

type OpcionSupervisor = {
  id: string;
  username: string;
  display_name: string;
};

type OpcionDispositivo = {
  id: string;
  name: string;
  platform: string;
  user_id: string;
};

type RespuestaOpcionesFormulario = {
  organizations: OpcionOrganizacion[];
  supervisors: OpcionSupervisor[];
  devices: OpcionDispositivo[];
};

export default function EditUnitPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [nombreReal, setNombreReal] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rol, setRol] = useState("OPERATIVE");
  const [organizacion, setOrganizacion] = useState("");
  const [dispositivoAsignado, setDispositivoAsignado] = useState("");
  const [estadoOperativo, setEstadoOperativo] = useState("DISPONIBLE");
  const [incidenteActual, setIncidenteActual] = useState("");
  const [ultimaUbicacion, setUltimaUbicacion] = useState("");
  const [latitudUbicacionActual, setLatitudUbicacionActual] = useState<number | null>(null);
  const [longitudUbicacionActual, setLongitudUbicacionActual] = useState<number | null>(null);
  const [direccionLegible, setDireccionLegible] = useState("");
  const [especialidades, setEspecialidades] = useState("");
  const [horarioOperativo, setHorarioOperativo] = useState("");
  const [contactoEmergencia, setContactoEmergencia] = useState("");
  const [telefonoEmergencia, setTelefonoEmergencia] = useState("");
  const [notasOperativas, setNotasOperativas] = useState("");
  const [dni, setDni] = useState("");
  const [archivoAvatar, setArchivoAvatar] = useState<File | null>(null);
  const [vistaPreviaAvatar, setVistaPreviaAvatar] = useState("");
  const [idioma, setIdioma] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [provincia, setProvincia] = useState("");
  const [pais, setPais] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [grupoSanguineo, setGrupoSanguineo] = useState("");
  const [unidadActiva, setUnidadActiva] = useState(true);
  const [organizacionId, setOrganizacionId] = useState("");
  const [supervisorAsignadoId, setSupervisorAsignadoId] = useState("");
  const [dispositivoAsignadoId, setDispositivoAsignadoId] = useState("");
  const [opcionesFormulario, setOpcionesFormulario] = useState<RespuestaOpcionesFormulario>({
    organizations: [],
    supervisors: [],
    devices: [],
  });

  const resumenUnidad = useMemo(() => {
    return {
      etiquetaRol: OPCIONES_ROL.find((opcion) => opcion.value === rol)?.label ?? "Sin rol",
      etiquetaEstado:
        OPCIONES_ESTADO.find((opcion) => opcion.value === estadoOperativo)?.label ?? "Sin estado",
    };
  }, [rol, estadoOperativo]);

  const opcionesProvincia = useMemo(() => {
    switch (pais) {
      case "Espana":
        return OPCIONES_PROVINCIA_ESPANA;
      case "Portugal":
        return OPCIONES_PROVINCIA_PORTUGAL;
      case "Francia":
        return OPCIONES_PROVINCIA_FRANCIA_COMPLETA;
      case "Italia":
        return OPCIONES_PROVINCIA_ITALIA_COMPLETA;
      case "Alemania":
        return OPCIONES_PROVINCIA_ALEMANIA_COMPLETA;
      case "Reino Unido":
        return OPCIONES_PROVINCIA_REINO_UNIDO;
      case "Estados Unidos":
        return OPCIONES_PROVINCIA_ESTADOS_UNIDOS;
      case "Andorra":
        return OPCIONES_PROVINCIA_ANDORRA;
      case "Marruecos":
        return OPCIONES_PROVINCIA_MARRUECOS;
      default:
        return [{ value: "", label: "Selecciona primero un pais" }];
    }
  }, [pais]);

  const [edicionDesbloqueada, setEdicionDesbloqueada] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) {
        setError("Unidad no valida.");
        setCargando(false);
        return;
      }

      try {
        const [respuestaOpciones, respuestaUnidad] = await Promise.all([
          apiFetch("/auth/panel/users/form-options/"),
          apiFetch(`/auth/panel/users/${id}/`),
        ]);

        if (!respuestaOpciones.ok || !respuestaUnidad.ok) {
          setError("No se pudieron cargar los datos de la unidad.");
          setCargando(false);
          return;
        }

        const opciones = (await respuestaOpciones.json()) as RespuestaOpcionesFormulario;
        const unidad = (await respuestaUnidad.json()) as RespuestaDetalleUnidad;
        setOpcionesFormulario(opciones);

        const organizacionEncontrada = (opciones.organizations ?? []).find(
          (opcion) => opcion.id === (unidad.organization_id ?? "")
        );
        const dispositivoEncontrado = (opciones.devices ?? []).find(
          (opcion) => opcion.id === (unidad.device_id ?? "")
        );

        setNombreUsuario(unidad.username ?? "");
        setNombreReal(`${unidad.first_name ?? ""} ${unidad.last_name ?? ""}`.trim());
        setCorreo(unidad.email ?? "");
        setTelefono(unidad.phone ?? "");
        setRol(unidad.role ?? "OPERATIVE");
        setOrganizacionId(unidad.organization_id ?? "");
        setSupervisorAsignadoId(unidad.assigned_supervisor_id ?? "");
        setDispositivoAsignadoId(unidad.device_id ?? "");
        setOrganizacion(organizacionEncontrada?.name ?? "");
        setDispositivoAsignado(
          dispositivoEncontrado ? `${dispositivoEncontrado.name} · ${dispositivoEncontrado.platform}` : ""
        );
        setEspecialidades((unidad.specialties ?? []).join("\n"));
        setHorarioOperativo(unidad.operative_schedule ?? "");
        setLatitudUbicacionActual(unidad.location_lat ?? null);
        setLongitudUbicacionActual(unidad.location_lng ?? null);
        setDireccionLegible(unidad.location_address ?? "");
        setContactoEmergencia(unidad.emergency_contact ?? "");
        setTelefonoEmergencia(unidad.emergency_phone ?? "");
        setNotasOperativas((unidad.medical_notes ?? []).join("\n"));
        setDni(unidad.dni ?? "");
        setVistaPreviaAvatar(unidad.avatar ?? "");
        setIdioma(unidad.language ?? "");
        setCiudad(unidad.city ?? "");
        setProvincia(unidad.province ?? "");
        setPais(unidad.country ?? "");
        setFechaNacimiento(unidad.birth_date ?? "");
        setGrupoSanguineo(unidad.blood_type ?? "");
        setUltimaUbicacion(unidad.location_address ?? "");
        setUnidadActiva(Boolean(unidad.is_active));
      } catch {
        setError("Error de red al cargar la unidad.");
      } finally {
        setCargando(false);
      }
    })();
  }, [id]);

  function manejarCambioAvatar(evento: ChangeEvent<HTMLInputElement>) {
    const nuevoArchivoAvatar = evento.target.files?.[0] ?? null;
    setArchivoAvatar(nuevoArchivoAvatar);

    if (nuevoArchivoAvatar) {
      setVistaPreviaAvatar(URL.createObjectURL(nuevoArchivoAvatar));
    }
  }

  async function manejarGuardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!id) {
      setError("Unidad no valida.");
      return;
    }

    setError("");
    setExito("");
    setGuardando(true);

    try {
      const datosFormulario = new FormData();
      datosFormulario.append("role", rol);
      datosFormulario.append("is_active", String(unidadActiva));
      datosFormulario.append("emergency_contact", contactoEmergencia.trim());
      datosFormulario.append("emergency_phone", telefonoEmergencia.trim());
      datosFormulario.append("location_lat", latitudUbicacionActual?.toString() ?? "");
      datosFormulario.append("location_lng", longitudUbicacionActual?.toString() ?? "");
      datosFormulario.append(
        "medical_notes",
        JSON.stringify(
          notasOperativas
            .split("\n")
            .map((valor) => valor.trim())
            .filter(Boolean)
        )
      );
      datosFormulario.append("organization_id", organizacionId);
      datosFormulario.append("dni", dni.trim());
      datosFormulario.append("language", idioma);
      datosFormulario.append("city", ciudad);
      datosFormulario.append("province", provincia);
      datosFormulario.append("country", pais);
      datosFormulario.append("birth_date", fechaNacimiento);
      datosFormulario.append(
        "specialties",
        JSON.stringify(
          especialidades
            .split("\n")
            .map((valor) => valor.trim())
            .filter(Boolean)
        )
      );
      datosFormulario.append("operative_schedule", horarioOperativo.trim());
      datosFormulario.append("blood_type", grupoSanguineo.trim());
      datosFormulario.append("device_id", dispositivoAsignadoId);
      datosFormulario.append("assigned_supervisor_id", supervisorAsignadoId);

      if (archivoAvatar) {
        datosFormulario.append("avatar", archivoAvatar);
      }

      const respuesta = await apiFetch(`/auth/panel/users/${id}/`, {
        method: "PATCH",
        body: datosFormulario,
      });

      if (!respuesta.ok) {
        let detalle = "No se pudo guardar la unidad.";
        try {
          const datosError = await respuesta.json();
          if (datosError?.detail) {
            detalle = String(datosError.detail);
          } else if (typeof datosError === "object" && datosError !== null) {
            const primeraClave = Object.keys(datosError)[0];
            if (primeraClave) {
              const valor = (datosError as Record<string, unknown>)[primeraClave];
              detalle = Array.isArray(valor)
                ? `${primeraClave}: ${String(valor[0])}`
                : `${primeraClave}: ${String(valor)}`;
            }
          }
        } catch {
          // Ignoramos errores de parseo para mostrar el mensaje por defecto.
        }
        setError(detalle);
        return;
      }

      const unidadActualizada = (await respuesta.json()) as RespuestaDetalleUnidad;
      const organizacionActualizada = (opcionesFormulario.organizations ?? []).find(
        (opcion) => opcion.id === (unidadActualizada.organization_id ?? "")
      );
      const dispositivoActualizado = (opcionesFormulario.devices ?? []).find(
        (opcion) => opcion.id === (unidadActualizada.device_id ?? "")
      );

      setRol(unidadActualizada.role ?? "OPERATIVE");
      setUnidadActiva(Boolean(unidadActualizada.is_active));
      setContactoEmergencia(unidadActualizada.emergency_contact ?? "");
      setTelefonoEmergencia(unidadActualizada.emergency_phone ?? "");
      setHorarioOperativo(unidadActualizada.operative_schedule ?? "");
      setEspecialidades((unidadActualizada.specialties ?? []).join("\n"));
      setNotasOperativas((unidadActualizada.medical_notes ?? []).join("\n"));
      setLatitudUbicacionActual(unidadActualizada.location_lat ?? null);
      setLongitudUbicacionActual(unidadActualizada.location_lng ?? null);
      setDireccionLegible(unidadActualizada.location_address ?? "");
      setUltimaUbicacion(unidadActualizada.location_address ?? "");
      setOrganizacionId(unidadActualizada.organization_id ?? "");
      setSupervisorAsignadoId(unidadActualizada.assigned_supervisor_id ?? "");
      setDispositivoAsignadoId(unidadActualizada.device_id ?? "");
      setDni(unidadActualizada.dni ?? "");
      setVistaPreviaAvatar(unidadActualizada.avatar ?? vistaPreviaAvatar);
      setArchivoAvatar(null);
      setIdioma(unidadActualizada.language ?? "");
      setCiudad(unidadActualizada.city ?? "");
      setProvincia(unidadActualizada.province ?? "");
      setPais(unidadActualizada.country ?? "");
      setFechaNacimiento(unidadActualizada.birth_date ?? "");
      setGrupoSanguineo(unidadActualizada.blood_type ?? "");
      setOrganizacion(organizacionActualizada?.name ?? organizacion);
      setDispositivoAsignado(
        dispositivoActualizado ? `${dispositivoActualizado.name} · ${dispositivoActualizado.platform}` : dispositivoAsignado
      );
      setExito("Unidad guardada correctamente.");
      setEdicionDesbloqueada(false);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <div className="cm-shell grid min-h-screen place-items-center">
        <p className="text-[color:var(--cm-text-muted)]">Cargando unidad...</p>
      </div>
    );
  }

  return (
    <form onSubmit={manejarGuardar}>
    <div className="cm-shell min-h-screen">
      <div className="w-full px-4 py-5 lg:px-5 lg:py-6 2xl:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">Operaciones</p>
            <h1 className="text-2xl font-bold">Editar unidad</h1>
            <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">
              Base de trabajo para centralizar la información completa de una unidad operativa.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate("/viewunidades")}
              className="rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] px-4 py-2 text-sm font-semibold transition hover:bg-[color:var(--cm-surface-2)]"
            >
              Volver a unidades
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.55fr_0.95fr]">
          <div className="space-y-4">
            {error ? <div className="cm-badge-danger rounded-xl p-3 text-sm">{error}</div> : null}
            {exito ? <div className="cm-badge-success rounded-xl p-3 text-sm">{exito}</div> : null}
            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Identidad</p>
                <h2 className="mt-2 text-xl font-bold">Datos principales</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Nombre de usuario</label>
                  <input
                    value={nombreUsuario}
                    disabled = {true}
                    onChange={(e) => setNombreUsuario(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="usuario_operativo_01"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Correo</label>
                  <input
                    value={correo}
                    disabled ={true}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="operativo@equipo.local"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Nombre real</label>
                  <input
                    value={nombreReal}
                    disabled ={true}
                    onChange={(e) => setNombreReal(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="Nombre Apellido"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Teléfono</label>
                  <input
                    value={telefono}
                    disabled ={true}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="+34 600 000 000"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Rol</label>
                  <select
                    value={rol}
                    disabled ={!edicionDesbloqueada}
                    onChange={(e) => setRol(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                  >
                    {OPCIONES_ROL.map((opcion) => (
                      <option key={opcion.value} value={opcion.value}>
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Perfil</p>
                <h2 className="mt-2 text-xl font-bold">Identidad operativa</h2>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_auto]">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Avatar</label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={!edicionDesbloqueada}
                    onChange={manejarCambioAvatar}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-[color:var(--cm-info)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                  <p className="mt-2 text-xs text-[color:var(--cm-text-muted)]">
                    Imagen del avatar asociada al profile.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">DNI</label>
                  <input
                    value={dni}
                    disabled={!edicionDesbloqueada}
                    onChange={(e) => setDni(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="Documento de identidad"
                  />
                </div>

                <div className="flex items-end justify-start lg:justify-center">
                  {vistaPreviaAvatar ? (
                    <img
                      src={vistaPreviaAvatar}
                      alt="Avatar de la unidad"
                      className="h-24 w-24 rounded-2xl object-cover ring-1 ring-[color:var(--cm-border)]"
                    />
                  ) : (
                    <div className="grid h-24 w-24 place-items-center rounded-2xl bg-[color:var(--cm-surface-2)] text-xs text-[color:var(--cm-text-muted)] ring-1 ring-[color:var(--cm-border)]">
                      Sin avatar
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Idioma</label>
                  <select
                    value={idioma}
                    disabled={!edicionDesbloqueada}
                    onChange={(e) => setIdioma(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                  >
                    {OPCIONES_IDIOMA.map((opcion) => (
                      <option key={opcion.value || "vacio"} value={opcion.value}>
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Fecha de nacimiento</label>
                  <input
                    type="date"
                    value={fechaNacimiento}
                    disabled={!edicionDesbloqueada}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Ciudad</label>
                  <input
                    value={ciudad}
                    disabled={!edicionDesbloqueada}
                    onChange={(e) => setCiudad(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="Escribe la ciudad"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Provincia</label>
                  <select
                    value={provincia}
                    disabled={!edicionDesbloqueada || !pais}
                    onChange={(e) => setProvincia(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                  >
                    {opcionesProvincia.map((opcion) => (
                      <option key={opcion.value || "vacio"} value={opcion.value}>
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Pais</label>
                  <select
                    value={pais}
                    disabled={!edicionDesbloqueada}
                    onChange={(e) => {
                      const nuevoPais = e.target.value;
                      setPais(nuevoPais);
                      setProvincia("");
                    }}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                  >
                    {OPCIONES_PAIS.map((opcion) => (
                      <option key={opcion.value || "vacio"} value={opcion.value}>
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Asignación</p>
                <h2 className="mt-2 text-xl font-bold">Estructura y logística</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Organización</label>
                  <select
                    value={organizacionId}
                    disabled={!edicionDesbloqueada}
                    onChange={(e) => {
                      const nuevaOrganizacionId = e.target.value;
                      const organizacionSeleccionada = (opcionesFormulario.organizations ?? []).find(
                        (opcion) => opcion.id === nuevaOrganizacionId
                      );
                      setOrganizacionId(nuevaOrganizacionId);
                      setOrganizacion(organizacionSeleccionada?.name ?? "");
                    }}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                  >
                    <option value="">Sin organización</option>
                    {(opcionesFormulario.organizations ?? []).map((organizacionOpcion) => (
                      <option key={organizacionOpcion.id} value={organizacionOpcion.id}>
                        {organizacionOpcion.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Supervisor asignado</label>
                  <div className="flex items-stretch gap-2">
                    <select
                      value={supervisorAsignadoId}
                      disabled={!edicionDesbloqueada}
                      onChange={(e) => {
                        const nuevoSupervisorId = e.target.value;
                        setSupervisorAsignadoId(nuevoSupervisorId);
                      }}
                      className="min-w-0 flex-1 rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    >
                      <option value="">Sin supervisor</option>
                      {(opcionesFormulario.supervisors ?? []).map((supervisor) => (
                        <option key={supervisor.id} value={supervisor.id}>
                          {supervisor.display_name || supervisor.username}
                        </option>
                      ))}
                    </select>
                    {supervisorAsignadoId ? (
                        <button
                          type="button"
                          className="shrink-0 rounded-lg bg-[color:var(--cm-info)] px-4 py-2 text-sm font-medium text-white hover:bg-[color:var(--cm-info-hover)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          onClick={() => {
                            navigate(`/editunit/${supervisorAsignadoId}`);
                          }}
                        >
                          Ver supervisor
                        </button>
                      ) : null}

                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Dispositivo asignado</label>
                  <select
                    value={dispositivoAsignadoId}
                    disabled={!edicionDesbloqueada}
                    onChange={(e) => {
                      const nuevoDispositivoId = e.target.value;
                      const dispositivoSeleccionado = (opcionesFormulario.devices ?? []).find(
                        (opcion) => opcion.id === nuevoDispositivoId
                      );
                      setDispositivoAsignadoId(nuevoDispositivoId);
                      setDispositivoAsignado(
                        dispositivoSeleccionado
                          ? `${dispositivoSeleccionado.name} · ${dispositivoSeleccionado.platform}`
                          : ""
                      );
                    }}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                  >
                    <option value="">Sin dispositivo</option>
                    {(opcionesFormulario.devices ?? []).map((dispositivo) => (
                      <option key={dispositivo.id} value={dispositivo.id}>
                        {dispositivo.name} · {dispositivo.platform}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Incidente actual</label>
                  <input
                    value={incidenteActual}
                    disabled ={!edicionDesbloqueada}
                    onChange={(e) => setIncidenteActual(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="Incendio forestal #04"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Operativa</p>
                <h2 className="mt-2 text-xl font-bold">Capacidad y situación actual</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Estado operativo</label>
                  <select
                    value={estadoOperativo}
                    disabled ={!edicionDesbloqueada}
                    onChange={(e) => setEstadoOperativo(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                  >
                    {OPCIONES_ESTADO.map((opcion) => (
                      <option key={opcion.value} value={opcion.value}>
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Grupo sanguineo</label>
                  <input
                    value={grupoSanguineo}
                    disabled ={!edicionDesbloqueada}
                    onChange={(e) => setGrupoSanguineo(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="Ej. O+"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Horario operativo</label>
                  <input
                    value={horarioOperativo}
                    disabled ={!edicionDesbloqueada}
                    onChange={(e) => setHorarioOperativo(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="Guardia 24h / Turno mañana"
                  />
                </div>  

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Direccion registrada</label>
                  <input
                    value={ultimaUbicacion}
                    disabled ={!edicionDesbloqueada}
                    onChange={(e) => setUltimaUbicacion(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="40.4168, -3.7038 · Madrid"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Especialidades</label>
                <textarea
                  value={especialidades}
                  disabled ={!edicionDesbloqueada}
                  onChange={(e) => setEspecialidades(e.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                  placeholder="Introduce una especialidad por linea"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Seguridad</p>
                <h2 className="mt-2 text-xl font-bold">Contacto y notas</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Contacto de emergencia</label>
                  <input
                    value={contactoEmergencia}
                    disabled ={!edicionDesbloqueada}
                    onChange={(e) => setContactoEmergencia(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="Nombre del contacto"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Teléfono de emergencia</label>
                  <input
                    value={telefonoEmergencia}
                    disabled ={!edicionDesbloqueada}
                    onChange={(e) => setTelefonoEmergencia(e.target.value)}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="+34 600 000 000"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-[color:var(--cm-text)]">Notas operativas</label>
                  <textarea
                    value={notasOperativas}
                    disabled ={!edicionDesbloqueada}
                    onChange={(e) => setNotasOperativas(e.target.value)}
                    rows={5}
                    className="w-full rounded-xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-sm outline-none transition focus:border-[color:var(--cm-info)]"
                    placeholder="Observaciones, limitaciones, recordatorios logísticos, etc."
                  />
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Resumen</p>
              <h2 className="mt-2 text-lg font-bold">Lectura rápida de la unidad</h2>

              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Usuario</p>
                  <p className="mt-1 font-medium">{nombreUsuario || "Sin nombre cargado"}</p>
                </div>

                <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Rol</p>
                  <p className="mt-1 font-medium">{resumenUnidad.etiquetaRol}</p>
                </div>

                <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Estado</p>
                  <p className="mt-1 font-medium">{resumenUnidad.etiquetaEstado}</p>
                </div>

                <div className="rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Organización</p>
                  <p className="mt-1 font-medium">{organizacion || "Sin organizacion"}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Ubicacion</p>
              <h2 className="mt-2 text-lg font-bold">Posicion actual</h2>

              <div className="mt-4">
                <MapaMiniUnidad
                  latitud={latitudUbicacionActual}
                  longitud={longitudUbicacionActual}
                  etiqueta={nombreUsuario ? `Ubicacion actual de ${nombreReal} (${nombreUsuario})` : "Ubicacion actual de la unidad"}
                />
              </div>

              <div className="mt-3 rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3 text-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Coordenadas</p>
                <p className="mt-1 font-medium">
                  {latitudUbicacionActual != null && longitudUbicacionActual != null
                    ? `${latitudUbicacionActual.toFixed(5)}, ${longitudUbicacionActual.toFixed(5)}`
                    : "Sin coordenadas registradas"}
                </p>
              </div>
              <div className="mt-3 rounded-xl bg-[color:var(--cm-surface-2)] px-4 py-3 text-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Direccion legible</p>
                <p className="mt-1 font-medium">{direccionLegible || "No hay direccion disponible"}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-[color:var(--cm-border)] bg-[color:var(--cm-surface)] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--cm-text-muted)]">Estado administrativo</p>
              <h2 className="mt-2 text-lg font-bold">Activación en sistema</h2>

              <label className="mt-4 inline-flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={unidadActiva}
                  disabled ={!edicionDesbloqueada}
                  onChange={(e) => setUnidadActiva(e.target.checked)}
                  className="h-4 w-4 rounded border-[color:var(--cm-border)] bg-[color:var(--cm-surface-2)]"
                />
                Unidad activa en el sistema
              </label>
            </section>

          </aside>
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--cm-info)]/40 bg-gradient-to-r from-[color:var(--cm-info)] to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(6,182,212,0.28)] transition hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[color:var(--cm-info)]/50"
            onClick={() => setEdicionDesbloqueada((valor) => !valor)}
          >
            {edicionDesbloqueada ? "Bloquear edición" : "Desbloquear edición"}
          </button>
          <button
            type="submit"
            disabled={!edicionDesbloqueada || guardando}
            className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--cm-danger)]/40 bg-gradient-to-r from-[color:var(--cm-danger)] to-rose-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(244,63,94,0.28)] transition hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[color:var(--cm-danger)]/50"
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
    </form>
  );
}
