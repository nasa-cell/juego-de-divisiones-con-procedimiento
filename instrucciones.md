# Juego de Divisiones

Juego para aprender a dividir paso a paso con el método de la galera.

## Qué hace (versión 1.3.4)

- Divisiones por el método de la galera, rellenando casillas paso a paso. Al 4.º error el juego enseña la división y luego da una parecida.
- Dos modos: **sin reloj** (niveles Fácil, Medio, Difícil y Avanzado, rondas de 13) y **con reloj** (escalera 3D de 12 escalones que el juego sube o baja solo; el tiempo se calcula con la velocidad de cada alumno). Mientras juega, una tarjeta con dos puntitos le dice cuánto le falta para subir de escalón o le avisa antes de bajar, y al terminar cada división una frase le explica qué pasó.
- Las tablas salen repartidas por igual en los dos modos: la tabla que más le cuesta sale algo más, pero nunca dos veces seguidas ni más de 4 en una ronda, y no se repite ninguna división dentro de la misma ronda.
- Aprende de cada alumno (pasos donde falla, tabla débil, velocidad) y crea problemas nuevos a su medida.
- Alumnos con nombre y dibujo o foto propia («Editar perfil»), «Mi progreso» con gráficas y medallas, informe PDF para los padres, sonidos.
- Salir a mitad de ronda no hace perder nada: las estrellas se suman al terminar cada división, la ronda queda para continuarla y, si se deja a medias y se empieza otra, el juego también aprende de ella (nivel recomendado).
- Modo enseñar con 6 pasos a la vista en vertical: los hechos en celeste con ✓, el actual en morado y los que faltan en gris azulado. El primer paso de cada vuelta se llama «¿Por cuánto multiplico?» (antes «cabe»): «¿Qué número por 6 se acerca a 53 sin pasarse?».
- Ayuda que se retira: cada alumno tiene un nivel de pista por tipo de paso (completa, solo la pregunta, solo números iluminados, sin pista). Baja con 3 aciertos seguidos sin ayuda y sube con 2 errores. El botón Ayuda se abre tras unos segundos pensando o tras un error, y la espera crece si la pide seguido (8, 15, 25, 40 s). El botón Ayuda, una vez abierto, sigue abierto hasta que se usa. Focos de ayuda por ronda según la dificultad (Fácil 2, Medio 2, Difícil 3, Avanzado 4, con reloj 3), dibujados como bombillas; se recupera un foco cada 3 divisiones seguidas sin pedir ayuda (cada 2 en Avanzado) sin pasar del máximo; los que guarde se cambian por estrellas al terminar la ronda (no si la deja a medias). Medallas «Lo hice solo» y «Sin ruedas» (5 rondas sin ayuda) y, en «Mi progreso», cuánta ayuda necesita en cada paso.
- En celular todo cabe en una pantalla, sin scroll: la división se ajusta sola, la pista, los errores y los focos van dentro del tablero junto al resultado (en recuadros con borde rojo y amarillo) y el teclado queda abajo. Con reloj, el marcador va en una fila; en el modo enseñar, los pasos son una fila de cuadritos y una tarjeta con el paso actual.
- Foto de perfil: la parte clara del recorte llega justo hasta el aro amarillo y la foto siempre llena el círculo.
- Al elegir un alumno en la portada aparece el botón rojo «Borrar alumno», que pregunta antes de borrar. Los botones de esa barra tienen colores distintos y borde negro, y se ven con cualquier color de perfil.
- El diseño aprovecha toda la pantalla en PC (también a pantalla completa o en ventanas angostas o bajas) y en tablet: el tablero y el teclado crecen hasta abajo sin quedar enormes. En tablet vertical, sin reloj, el teclado va debajo del tablero.
- Seguridad: el nombre solo lleva letras (de 2 a 16, sin números ni símbolos), como mucho 60 alumnos, fotos de hasta 15 MB y solo imágenes de verdad, los datos guardados se revisan al abrir, la página no carga código de fuera y la ventana de PC no abre otras páginas.
- Pistas con los números de cada casilla: se iluminan los números que hay que usar, al equivocarse explica por qué ese número no vale y el botón Ayuda hace la cuenta paso a paso. Cada pista tiene varias formas de decirse, para que no se repita.

## Carpetas

- `juego/`: el juego completo (pantallas, estilos, fuentes).
  - `juego/codigo/division.js`: calcula las casillas y los pasos de cada división.
  - `juego/codigo/aprendizaje.js`: niveles, problemas nuevos según los errores del alumno, estrellas y medallas.
  - `juego/codigo/pistas.js`: pistas de cada casilla con los números de la división en juego, la explicación de cada error y la ayuda paso a paso. Cada pista tiene varias formas de decirse.
  - `juego/codigo/aplicacion.js`: pantallas y botones.
  - `juego/codigo/almacen.js`: guarda alumnos y progreso en el equipo, con copia de seguridad.
  - `juego/codigo/informe.js`: crea el informe PDF de 4 páginas (carátula, gráficas explicadas, rondas y lo que ya hace bien, consejos y plan de la semana).
  - `juego/codigo/logo.js`: el logo del juego (escalera 3D con la ficha ÷).
  - `juego/codigo/sonidos.js`: los sonidos.
- `pc/`: ventana de la aplicación de Windows.
- `celular/`: proyecto de Android (lo crea Capacitor).
- `recursos/`: icono del instalador.
- `pruebas/`: pruebas del motor y de las pantallas (con capturas en `pruebas/capturas`).
- `instaladores/`: aquí aparecen el `.exe` y el `.apk` al compilar.

`package.json`, `package-lock.json`, `capacitor.config.json` y `node_modules` llevan esos nombres porque las herramientas los exigen.

## Comandos

- Probar el motor: `npm run pruebas`
- Probar el aprendizaje: `node pruebas/probar-aprendizaje.js`, `node pruebas/probar-reloj.js` (alumnos simulados en el modo con reloj) `node pruebas/probar-recaida.js` (alumno que ya sabía y empieza a fallar) `node pruebas/probar-guia-escalon.js` (la guía del escalón y las frases dicen la verdad) y `node pruebas/probar-pistas.js` (las pistas llevan a la respuesta correcta en miles de divisiones y no se repiten)
- Probar las pantallas: `npx electron pruebas/probar-pantallas.js` (ronda sin reloj) y `npx electron pruebas/probar-ronda-reloj.js` (ronda con reloj)
- Probar el diseño en 13 tamaños de pantalla (celulares, tablet y PC grande, 2K, ultraancha, ventana angosta y baja) y crear un PDF de ejemplo: `npx electron pruebas/probar-tamanos.js`
- Probar que no se pierden los datos del alumno: `npx electron pruebas/probar-guardado.js`
- Probar la seguridad (nombres, fotos falsas, límite de alumnos): `npx electron pruebas/probar-seguridad.js`
- Probar salir a mitad de ronda: `npx electron pruebas/probar-salir.js`
- Probar la ayuda que se retira (niveles de pista, espera, focos, medallas): `npx electron pruebas/probar-ayuda.js`
- Probar el botón Borrar alumno y los colores de los botones con los 6 perfiles: `npx electron pruebas/probar-borrar.js`
- Volver a crear los iconos a partir del logo: `npx electron recursos/crear-iconos.js`
- Abrir el juego en la PC: `npm run pc`
- Crear el instalador de Windows: `npm run instalador`
- Crear el APK: en PowerShell, `.\compilar-apk.ps1`. Se compila en una copia en `D:\herramientas\compilacion` (Gradle falla en el disco E:, que es FAT32) y el APK queda en `instaladores`.

Las herramientas de Android están en `D:\herramientas`.

## Dónde se guardan los datos de los alumnos

- PC: dentro de la aplicación y en la copia `%APPDATA%\Juego de Divisiones\datos-juego.json` (más `datos-juego.anterior.json`). Desinstalar el juego no borra esta carpeta.
- Celular: dentro de la aplicación y en una copia en el almacenamiento propio de Android. Instalar un APK nuevo encima del anterior conserva los datos; desinstalar la app sí los borra.
- La clave de firma del APK está copiada en `recursos/clave-android`. No la borres: sin la misma clave, un APK nuevo no se puede instalar encima del anterior.
