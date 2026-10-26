# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

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