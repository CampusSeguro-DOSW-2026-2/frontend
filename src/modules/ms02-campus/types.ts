export type Estado = 'ACTIVO' | 'INACTIVO';
export type TipoEspacio = 'SALON' | 'LABORATORIO' | 'AUDITORIO' | 'OFICINA' | 'ESPACIO_COMUN';
export type EstadoRuta = 'DISPONIBLE' | 'BLOQUEADA' | 'RESTRINGIDA';
export type AmbitoRecomendacion = 'EDIFICIO' | 'TIPO_ESPACIO';

export interface Edificio {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  estado: Estado;
}

export interface EdificioRequest {
  codigo: string;
  nombre: string;
  descripcion?: string;
}

export type ModificarEdificioRequest = Omit<EdificioRequest, 'codigo'>;

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
  codigo: string;
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
  codigo: string;
  nombre: string;
  latitud: number;
  longitud: number;
  estado: Estado;
  disponible: boolean;
}

export interface SalidaRequest {
  pisoId: string;
  codigo: string;
  nombre: string;
  latitud: number;
  longitud: number;
}

export type ModificarSalidaRequest = Omit<SalidaRequest, 'codigo'>;

export interface EspacioRequest {
  codigo: string;
  nombre: string;
  tipo: TipoEspacio;
}

export type ModificarEspacioRequest = Omit<EspacioRequest, 'codigo'>;

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
