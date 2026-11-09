# React + Vite

## Estructura del proyecto

El código está organizado por microservicio: `src/app/` (shell), `src/shared/` (lo reutilizable por todos) y `src/modules/msXX-*/` (lo propio de cada microservicio). Las reglas y la guía para mover archivos están en [docs/ESTRUCTURA.md](docs/ESTRUCTURA.md).

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## Despliegue en Azure (CI/CD)

El frontend se publica en **Azure Static Web Apps** con GitHub Actions (`.github/workflows/ci-cd.yml`):

| Evento | Qué hace |
|---|---|
| Pull request a `develop` o `main` | Revisa tipos, lint y compila (CI) |
| Push a `develop` | CI y, si existe el token, publica en Azure (CD) |
| Ejecución manual (Actions > CI/CD > Run workflow) | Igual que un push |

La app llama al **API Gateway** (`VITE_API_URL`). Por defecto usa el Gateway de prueba
`https://campusseguro-gw.northcentralus.cloudapp.azure.com:8443`; para cambiarlo, crear la variable de repositorio `API_URL`.

### Pasos (una sola vez)

1. **Azure (portal, cuenta de estudiante):** Crear un recurso > *Static Web App* > plan **Free**, región cercana
   (East US 2), origen de implementación **Otro** (el despliegue lo hace este workflow, no Azure).
2. En la Static Web App: *Manage deployment token* > copiar el token.
3. **GitHub (un admin del repositorio):** Settings > Secrets and variables > Actions > *New repository secret*
   `AZURE_STATIC_WEB_APPS_API_TOKEN` con el token. Opcional: variable `API_URL`.
4. **API Gateway (responsable del GW):** agregar la URL de la Static Web App (`https://<nombre>.azurestaticapps.net`)
   a `CORS_ALLOWED_ORIGINS` del entorno `gw-test` (y de `gw-prod` cuando se use).
5. Hacer merge a `develop` o ejecutar el workflow a mano. La URL queda en el job "Desplegar en Azure Static Web Apps".

`public/staticwebapp.config.json` configura la página de respaldo (`index.html`), la caché de `/assets` y cabeceras de seguridad.

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