# Estructura del frontend

Una sola aplicación (React + Vite) organizada por microservicio. Cada squad trabaja dentro de la carpeta de su microservicio; lo que usan varios queda en `shared/`.

```
src/
├── app/                      # Shell: arranque, sesión, barra y enrutado
│   ├── main.tsx
│   └── App.tsx
│
├── shared/                   # Reutilizable por todos los módulos
│   ├── assets/icons/         # Iconos oficiales (docs/mockups/icons)
│   ├── components/           # Layout (barra y encabezado), Icons, DateTimeField
│   ├── services/             # http.ts (cliente del API Gateway), session.ts, localStore.ts
│   ├── styles.css            # Tokens y estilos globales
│   └── types.ts              # Session, SessionUser
│
└── modules/                  # Un módulo por microservicio (cada uno con su README)
    ├── ms01-identity/        # Registro, sesión, perfil, usuarios, roles y contraseña
    ├── ms02-campus/          # Edificios, espacios, zonas seguras y rutas (pantallas en feature/MS02-Campus)
    ├── ms03-alerts/          # Alertas: listado, crear y editar; alerta activa
    ├── ms04-evacuation/      # Estado de las personas y consolidado por punto de encuentro (sin pantallas aún)
    ├── ms05-brigades/        # Panel del brigadista
    ├── ms06-drills/          # Crear simulacro
    ├── ms07-training/        # Formación preventiva, evaluaciones y Tutor AI (sin pantallas aún)
    └── ms08-analytics/       # Indicadores, métricas y auditoría (sin pantallas aún)
```

Cada módulo tiene la misma forma. `pages/`, `components/`, `services/` y `hooks/` existen en todos (con `.gitkeep` mientras estén vacías; se borra al agregar el primer archivo); `utils/`, `styles/` y `types.ts` se crean cuando hacen falta:

```
modules/msXX-nombre/
├── pages/        # Pantallas (una por ruta)
├── components/   # Componentes que solo usa este módulo
├── services/     # Llamadas a su microservicio (o datos locales si aún no hay contrato)
├── hooks/        # Hooks propios del módulo
├── utils/        # Utilidades propias (etiquetas, validaciones…)
├── styles/       # CSS propio del módulo
├── types.ts      # Tipos del módulo
└── routes.tsx    # Rutas del módulo
```

## Reglas

1. **¿Dónde va un archivo?** Si lo usa un solo módulo, va dentro de ese módulo. Si lo usan dos o más, va en `shared/`. Cuando algo de un módulo empiece a usarse en otro, se mueve a `shared/` en vez de importarlo de un módulo a otro.
2. **Rutas:** cada módulo exporta su función de rutas en `routes.tsx`. Recibe la ruta y devuelve la pantalla, o `undefined` si la ruta no es suya. `app/App.tsx` solo encadena esas funciones; para agregar un módulo nuevo se importa su función ahí.
3. **Red:** las páginas nunca llaman `fetch`; todo pasa por `services/` del módulo. Para el API Gateway se usa `shared/services/http.ts` (`request`).
4. **Sesión:** `shared/services/session.ts` y el tipo `Session` son compartidos; la pantalla de inicio de sesión y las demás de identidad viven en `ms01-identity`.
5. **Estilos:** tokens y clases generales en `shared/styles.css`; lo propio de un módulo en su `styles/`.

## Para el squad de MS02

La rama `feature/MS02-Campus` todavía usa la estructura anterior. Al traer `develop`, mover:

| Antes | Ahora |
|---|---|
| `src/pages/campus/*.tsx` | `src/modules/ms02-campus/pages/` |
| `src/pages/campus/comun.tsx` | `src/modules/ms02-campus/components/comun.tsx` |
| `src/pages/campus/useEnvio.ts` | `src/modules/ms02-campus/hooks/useEnvio.ts` |
| `src/pages/campus/*.css` | `src/modules/ms02-campus/styles/` |
| `src/pages/campus/tipos.ts` y `src/types/campus.ts` | `src/modules/ms02-campus/types.ts` |
| `src/services/campus.ts` | `src/modules/ms02-campus/services/campus.ts` |
| Las rutas que agregaron en `App.tsx` | `campusRoutes` en `src/modules/ms02-campus/routes.tsx` (ya está encadenada en `app/App.tsx`) |

Los imports compartidos cambian a `shared/`: `components/Layout` → `shared/components/Layout`, `components/Icons` → `shared/components/Icons`, `services/http` → `shared/services/http`, `services/session` → `shared/services/session`.
