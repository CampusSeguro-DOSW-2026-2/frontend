/**
 * Marca de las pantallas de acceso (inicio de sesión, registro, recuperar y cambiar la contraseña): el mismo logo
 * oficial (public/logo.svg) y el nombre CampusSeguro, para que la persona sepa siempre dónde está.
 */
export function Marca() {
  return (
    <div className="auth-marca">
      <img className="login-logo" src="/logo.svg" alt="" />
      <span className="auth-nombre">CampusSeguro</span>
    </div>
  );
}
