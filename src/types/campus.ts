export type Estado = 'ACTIVO' | 'INACTIVO';
export type TipoEspacio = 'SALON' | 'LABORATORIO' | 'AUDITORIO' | 'OFICINA' | 'ESPACIO_COMUN';
export type EstadoRuta = 'DISPONIBLE' | 'BLOQUEADA' | 'RESTRINGIDA';

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
  pisoId: string;
  codigo: string;
  nombre: string;
  tipo: TipoEspacio;
  estado: Estado;
  disponible: boolean;
}

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
  ambito: 'EDIFICIO' | 'TIPO_ESPACIO';
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
