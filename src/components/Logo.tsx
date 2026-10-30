/**
 * Logo provisional (escudo con edificio). El manual de identidad aún dice "LOGO POR DEFINIR".
 * Para usar el logo oficial: guárdalo en public/logo.svg y reemplaza el <svg> por
 * <img className={className} src="/logo.svg" alt="CampusSeguro" />
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 140"
      role="img"
      aria-label="CampusSeguro"
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M60 8 L108 24 V66 C108 98 86 120 60 132 C34 120 12 98 12 66 V24 Z" />
      <path d="M32 96 V66 H88 V96" />
      <path d="M48 66 V44 H72 V66" />
      <path d="M60 44 V28 H70 V34 H60" />
      <circle cx="60" cy="55" r="4" />
      <path d="M54 96 V82 H66 V96" />
    </svg>
  );
}
