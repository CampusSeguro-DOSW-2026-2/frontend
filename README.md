# React + Vite

## Estructura del proyecto

El código está organizado por microservicio: `src/app/` (shell), `src/shared/` (lo reutilizable por todos) y `src/modules/msXX-*/` (lo propio de cada microservicio). Las reglas y la guía para mover archivos están en [docs/ESTRUCTURA.md](docs/ESTRUCTURA.md).

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## Despliegue en Azure (CI/CD)

El frontend se publica como **sitio web estático de Azure Storage** con GitHub Actions (`.github/workflows/ci-cd.yml`),
siguiendo la guía [Conexión al API Gateway](https://github.com/CampusSeguro-DOSW-2026-2/documentation/wiki/Conexión-al-API-Gateway) de la wiki.
El navegador llama solo al **API Gateway** (`VITE_API_URL`) por HTTPS con JWT; el CORS lo maneja el GW.
(No se usa Static Web Apps porque Azure for Students solo permite regiones donde ese servicio no existe.)

| Evento | Qué hace | Entorno de GitHub | API Gateway |
|---|---|---|---|
| Pull request a `develop` o `main` | Revisa tipos, lint y compila (CI) | — | — |
| Push a `develop` | CI y publica en la cuenta de almacenamiento de prueba | `front-test` | Prueba (`:8443`) |
| Push a `main` | CI y publica en la de producción (requiere aprobación) | `front-prod` | Producción (`:443`) |

### Pasos (una sola vez por entorno)

1. **Azure (cuenta de estudiante):** Crear *Cuenta de almacenamiento*: región permitida (p. ej. Mexico Central),
   rendimiento **Estándar**, redundancia **LRS**. Nombre: solo minúsculas y números (p. ej. `campusseguroftest`).
2. En la cuenta: *Administración de datos > Sitio web estático* > **Habilitado**; documento de índice y de error: `index.html`.
   Guardar y copiar el **punto de conexión principal** (`https://<cuenta>.z<n>.web.core.windows.net`).
3. En la cuenta: *Seguridad y redes > Firma de acceso compartido*: servicio **Blob**; tipos de recurso **Contenedor** y
   **Objeto**; permisos **Leer, Escribir, Eliminar, Enumerar, Agregar, Crear**; fecha de expiración (fin del semestre);
   solo HTTPS. Generar y copiar el **token SAS**.
4. **GitHub (admin del repositorio):** *Settings > Environments*:
   * `front-test`: *Deployment branches* `develop`. `front-prod`: *Deployment branches* `main`; *Required reviewers*: el líder.
   * En cada uno: variable `STORAGE_ACCOUNT` (nombre de la cuenta), secreto `AZURE_STORAGE_SAS_TOKEN` y variable `GATEWAY_URL`:

   | Variable | `front-test` | `front-prod` |
   |---|---|---|
   | `GATEWAY_URL` | `https://campusseguro-gw.northcentralus.cloudapp.azure.com:8443` | `https://campusseguro-gw.northcentralus.cloudapp.azure.com` |

5. Hacer merge a `develop` (o *Actions > CI/CD > Run workflow* sobre `develop`).
6. **Equipo del GW (mensaje privado):** pedir que agreguen el punto de conexión del paso 2 (sin `/` final) a
   `CORS_ALLOWED_ORIGINS` de `gw-test` (y el de producción a `gw-prod` cuando se use). Mientras tanto el navegador bloquea
   las llamadas por CORS.

Nunca se suben tokens ni `.env` al repositorio. El token SAS vence: renovarlo en el entorno cuando expire.

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Cosas Pendientes / Notas

### Del commit de Daniel Morales, en el frontend del Login

Se agrego el frontend del login y se conecto con las pantallas disponibles, en este caso en el commit actual se conecto registro y simulacro activo (Que se tomo como la pantalla de inicio)

Las rutas disponibles al momento de subir este commit son

* http://localhost:5173/#/login
* http://localhost:5173/#/registro
* http://localhost:5173/#/crear-simulacro
* http://localhost:5173/#/simulacro
* http://localhost:5173/#/brigadista

Debido a que no se tiene implementado ni el backend ni el frontend de cerrar sesion ni otros features, entonces no se puede cerrar la sesion actualmente para volver a la pagina de inicio de sesion, por ende se debe de usar las rutas previamente descritas si se desea navegar por las paginas actuales, aun asi en la pagina de inicio de sesion esta disponible el boton de inicar sesion, registrarse, y olvidaste tu contraseña (aunque este lleva a una pagina vacia pues no se ha implementado), en registrarse tambien se conecto el boton inicar sesion con la pagina de inicio de sesion, se comprobo ademas que funcionada correctamente la creacion de cuenta desde registro, y tambien que se inicia sesion