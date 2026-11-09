export type Estado = 'ACTIVO' | 'INACTIVO';
export type TipoEspacio = 'SALON' | 'LABORATORIO' | 'AUDITORIO' | 'OFICINA' | 'ESPACIO_COMUN';
export type EstadoRuta = 'DISPONIBLE' | 'BLOQUEADA' | 'RESTRINGIDA';
export type AmbitoRecomendacion = 'EDIFICIO' | 'TIPO_ESPACIO';

export interface Edificio {
  id: string;
  nombre: string;
  descripcion?: string;
  estado: Estado;
  campusId: string;
}

export interface EdificioRequest {
  nombre: string;
  descripcion?: string;
  campusId: string;
}

export type ModificarEdificioRequest = EdificioRequest;

export interface Piso {
  id: string;
  edificioId: string;
  numero: number;
  nombre?: string;
  estado: Estado;
}

export interface PisoRequest {
  numero: number;
  nombre?: string;
}

export interface Espacio {
  id: string;
  edificioId: string;
  edificioNombre?: string;
  pisoId: string;
  pisoNumero?: number;
  nombre: string;
  tipo: TipoEspacio;
  estado: Estado;
  disponible: boolean;
}

export interface Salida {
  id: string;
  edificioId: string;
  edificioNombre?: string;
  pisoId: string;
  pisoNumero?: number;
  nombre: string;
  latitud: number;
  longitud: number;
  estado: Estado;
  disponible: boolean;
}

export interface SalidaRequest {
  pisoId: string;
  nombre: string;
  latitud: number;
  longitud: number;
}

export type ModificarSalidaRequest = SalidaRequest;

export interface EspacioRequest {
  nombre: string;
  tipo: TipoEspacio;
}

export type ModificarEspacioRequest = EspacioRequest;

export interface ZonaSegura {
  id: string;
  codigo: string;
  nombre: string;
  ubicacion: string;
  descripcion: string;
  capacidad: number;
  estado: Estado;
  latitud?: number | null;
  longitud?: number | null;
  zonaAbiertaId?: string | null;
  puntoEncuentro: boolean;
}

export interface ZonaSeguraRequest {
  codigo: string;
  nombre: string;
  ubicacion: string;
  descripcion: string;
  capacidad: number;
  // Latitud y longitud van juntas. Al modificar, vacías significa «sin cambios»: el backend no las borra.
  latitud?: number;
  longitud?: number;
  // Al modificar, vacía significa «sin cambios».
  zonaAbiertaId?: string;
  // Al crear, si no se envía queda como punto de encuentro.
  puntoEncuentro?: boolean;
}
// El código de la zona es fijo (RF-04): el PUT no lo recibe.
export type ModificarZonaSeguraRequest = Omit<ZonaSeguraRequest, 'codigo'>;

export interface CampusRequest {
  nombre: string;
  descripcion?: string;
}

export interface ZonaAbiertaRequest {
  nombre: string;
  tipo: TipoZonaAbierta;
  // Latitud y longitud van juntas o ninguna.
  latitud?: number;
  longitud?: number;
}

export type TipoZonaAbierta = 'ZONA_VERDE' | 'PLAZOLETA' | 'CANCHA' | 'PARQUEADERO' | 'OTRA';

export interface Campus {
  id: string;
  nombre: string;
  descripcion?: string | null;
  estado: Estado;
}

export interface ZonaAbierta {
  id: string;
  campusId: string;
  nombre: string;
  tipo: TipoZonaAbierta;
  latitud?: number | null;
  longitud?: number | null;
  estado: Estado;
}

export interface Ruta {
  id: string;
  espacioOrigenId: string;
  zonaSeguraDestinoId: string;
  descripcion: string;
  estado: EstadoRuta;
  motivo?: string;
  actualizadaEn: string;
}

/**
 * Lo que devuelve GET /evacuation-routes: rutas de espacio (legado) y también rutas exteriores,
 * que salen de una salida y no tienen espacio de origen.
 */
export interface RutaListada extends Omit<Ruta, 'espacioOrigenId'> {
  espacioOrigenId?: string | null;
  salidaOrigenId?: string | null;
}

export interface CrearRutaRequest {
  espacioOrigenId: string;
  zonaSeguraDestinoId: string;
  descripcion: string;
  estado: EstadoRuta;
  motivo?: string;
}

export interface ActualizarRutaRequest {
  zonaSeguraDestinoId: string;
  descripcion: string;
}

export interface CambiarEstadoRequest {
  estado: EstadoRuta;
  motivo?: string;
}

export interface Coordenada {
  latitud: number;
  longitud: number;
}

export interface PasoRuta {
  instruccion: string;
  distanciaMetros: number;
  duracionSegundos: number;
}

export interface RutaExterior {
  id: string;
  salidaOrigenId: string;
  zonaSeguraDestinoId: string;
  estado: EstadoRuta;
  motivo?: string | null;
  distanciaMetros?: number | null;
  duracionSegundos?: number | null;
  geometria: Coordenada[];
  pasos: PasoRuta[];
  calculadaEn: string;
}

/** Resultado de generar las rutas exteriores de todo el campus. `interrumpida`: el proveedor de mapas dejó de responder. */
export interface ResumenGeneracionRutas {
  generadas: number;
  omitidas: number;
  interrumpida: boolean;
}

export interface CalcularRutaExteriorRequest {
  salidaId: string;
  zonaSeguraId: string;
}

export interface EscaleraGuia {
  id: string;
  codigo: string;
  nombre: string;
}

export interface SalidaGuia {
  id: string;
  nombre: string;
  latitud?: number | null;
  longitud?: number | null;
}

// Guía completa desde un espacio. Si no hay salida o escalera utilizable, `salida` y `rutaExterior`
// vienen vacías y `mensaje` explica por qué.
export interface GuiaEvacuacion {
  edificioId: string;
  edificioNombre?: string | null;
  pisoId: string;
  pisoNumero?: number | null;
  requiereEscalera: boolean;
  escaleras: EscaleraGuia[];
  salida?: SalidaGuia | null;
  rutaExterior?: RutaExterior | null;
  zonaSeguraNombre?: string | null;
  indicacion?: string | null;
  mensaje?: string | null;
}

export interface RutaConsultada {
  espacioId: string;
  espacioNombre: string;
  tieneRuta: boolean;
  zonaSeguraId?: string;
  zonaSeguraNombre?: string;
  zonaSeguraUbicacion?: string;
  recorrido?: string;
  estado?: EstadoRuta;
  motivo?: string;
  destinoActivo?: boolean;
  mensaje?: string;
  recomendacionesPreventivas: RecomendacionPreventiva[];
  // Solo viene al consultar un espacio; al consultar todo el edificio llega vacía.
  guia?: GuiaEvacuacion | null;
}

export interface RecomendacionPreventiva {
  id: string;
  ambito: AmbitoRecomendacion;
  edificioId?: string;
  tipoEspacio?: TipoEspacio;
  titulo: string;
  recomendacion: string;
  estado: Estado;
  createdAt: string;
  updatedAt: string;
}

export interface ErrorResponse {
  status: number;
  codigo: string;
  mensaje: string;
  errores: { campo: string; mensaje: string }[];
  correlation_id: string;
}

export interface RecomendacionPreventivaRequest {
  ambito: AmbitoRecomendacion;
  edificioId?: string;
  tipoEspacio?: TipoEspacio;
  titulo: string;
  recomendacion: string;
}

export const TIPOS: Record<TipoEspacio, string> = {
  SALON: 'Salón',
  LABORATORIO: 'Laboratorio',
  AUDITORIO: 'Auditorio',
  OFICINA: 'Oficina',
  ESPACIO_COMUN: 'Espacio común',
};

export const TIPOS_ZONA_ABIERTA: Record<TipoZonaAbierta, string> = {
  ZONA_VERDE: 'Zona verde',
  PLAZOLETA: 'Plazoleta',
  CANCHA: 'Cancha',
  PARQUEADERO: 'Parqueadero',
  OTRA: 'Otra',
};

export interface EspacioPublico {
  nombre: string;
  tipo: TipoEspacio;
  edificio?: string;
  piso?: number;
  disponible: boolean;
  evacuacion?: {
    tieneRuta: boolean;
    zonaSegura?: string;
    ubicacionZonaSegura?: string;
    recorrido?: string;
    estado?: EstadoRuta;
    motivo?: string;
    mensaje?: string;
    recomendaciones: { titulo: string; recomendacion: string }[];
  };
  guia?: {
    indicacion?: string;
    mensaje?: string;
    escaleras: string[];
    salida?: string;
    salidaLatitud?: number;
    salidaLongitud?: number;
    zonaSegura?: string;
    distanciaMetros?: number;
    duracionSegundos?: number;
    pasos: { instruccion: string; distanciaMetros: number }[];
  };
  aviso?: string;
}

export interface SalidaPublica {
  nombre: string;
  edificio?: string;
  piso?: number;
  latitud: number;
  longitud: number;
  disponible: boolean;
  aviso?: string;
}

export interface ZonaSeguraPublica {
  codigo: string;
  nombre: string;
  ubicacion?: string;
  puntoEncuentro: boolean;
  latitud?: number;
  longitud?: number;
  disponible: boolean;
  aviso?: string;
}


export type DisponibilidadEscalera =
  | 'DISPONIBLE'
  | 'BLOQUEADA'
  | 'FUERA_DE_SERVICIO';

export interface Escalera {
  id: string;
  edificioId: string;
  codigo: string;
  nombre: string;
  disponibilidad: DisponibilidadEscalera;
  motivo: string | null;
  estado: Estado;
  pisoIds: string[];
}

export interface EscaleraRequest {
  nombre: string;
  pisoIds: string[];
}

export interface CambiarDisponibilidadEscaleraRequest {
  disponibilidad: DisponibilidadEscalera;
  motivo?: string;
}
