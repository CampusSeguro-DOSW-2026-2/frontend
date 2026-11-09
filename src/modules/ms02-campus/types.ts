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
}

export type ZonaSeguraRequest = Omit<ZonaSegura, 'id' | 'estado'>;
// El código de la zona es fijo (RF-04): el PUT no lo recibe.
export type ModificarZonaSeguraRequest = Omit<ZonaSeguraRequest, 'codigo'>;

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

export interface EspacioPublico {
  codigo: string;
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
  codigo: string;
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
