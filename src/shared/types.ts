export interface SessionUser {
  id: string;
  email: string;
  roles: string[];
}

// Sesión que devuelve MS01 al autenticar: el token se guarda junto con su vencimiento
export interface Session {
  token: string;
  tokenType: string;
  expiresAt: string; // ISO
  user: SessionUser;
}
