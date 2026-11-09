# 🎲 Hub de Juegos de Mesa & 🚌 ¡Toco timbre! Me bajo del bondi 🔔

Plataforma web modular de juegos de mesa digitales pensada para jugar entre amigos en la mesa, desde el celular o proyectada en la televisión del living. Todo corre 100% en el navegador (client-side), sin bases de datos ni backend, listo para alojarse gratis en **GitHub Pages**.

---

## 🌟 Arquitectura Modular del Hub

El repositorio funciona como una **Sala de Juegos centralizada** que comparte la lista de participantes entre todos los juegos de la juntada:

1. **La Mesa (Gestor Global de Jugadores - `js/hub-shared.js`)**:
   - Administra los participantes en `localStorage` bajo la clave `"hub_jugadores"`.
   - Permite agregar, remover, reordenar turnos al azar (🎲 *Mezclar turnos*) y cargar mesas rápidas de 2 a 10 jugadores (ideal para la mesa de 6 amigos).
   - Los juegos leen y sincronizan sus participantes automáticamente con esta lista.
2. **Modo Living TV**:
   - Botón integrado en la barra superior con la `Fullscreen API` nativa para proyectar el Hub en televisores inteligentes.
3. **Cartelera de Juegos**:
   - **🚌 ¡Toco timbre! Me bajo del bondi**: Juego de aproximación numérica y apuestas en `/toco-timbre/`.
   - **📻 Sintonía Fina**: Juego de telepatía y opuestos (inspirado en *Wavelength*) con pantalla TV + 1 Celular Remoto vía WebRTC en `/sintonia-fina/`.
   - **🔄 ¡En Una Vuelta!**: Módulo conectado listo para desarrollar (inspirado en *Just One*) en `/en-una-vuelta/`.

---

## 🛞 ¡Toco timbre! Me bajo del bondi

Una aplicación web ambientada con la estética y el humor de los colectivos porteños de Buenos Aires, inspirada en la mecánica de *"Shoot for the Stars"*.

### Características Principales:
1. **Dos Modos de Juego**:
   - **🎴 Modo Presencial (El Tarjetero)**: Para cuando los jugadores están en la misma mesa charlando y solo necesitan el celular como mazo digital interactivo con botón de revelación y dato curioso.
   - **🎮 Modo Digital (App Completa)**: Gestiona turnos, quién está al volante (Chofer), quién confía, quién toca timbre y calcula automáticamente los saldos en la tarjeta virtual **SUBE**. Precarga automáticamente los jugadores de la mesa compartida.
2. **Sistema Escalable de Categorías y Dificultades**:
   - Selector dinámico de categorías y niveles de dificultad (🟢 Fácil, 🟡 Medio, 🟠 Difícil y 🔴 Extremo).
   - **Cantidad de Cartas por Combinación**: Permite elegir cuántas preguntas tomar de cada combinación seleccionada (Todas las disponibles, 1, 3, 5, 10 o Personalizado), mezcladas al azar mediante Fisher-Yates.
   - Contador en vivo: `"Total disponibles que coinciden: X cartas | Mazo a jugar: Y cartas"`.
   - Memorización automática de tus filtros preferidos en `localStorage`.
3. **Base de Datos Masiva con 1.000 Preguntas Verificadas**:
   - 10 categorías temáticas con 100 preguntas numéricas reales cada una:
     - 🇦🇷 Cultura Argentina | ⚽ Deportes | 🎬 Cine & TV | 🎵 Música | 🌍 Geografía
     - 🏛️ Historia | 🔬 Ciencia | 🎮 Cultura Pop | 🍔 Cotidiano | 🤯 Récords Bizarros
4. **Efectos de Sonido Nativos (Web Audio API)**:
   - Sintetizador para el timbre de colectivo ("¡Ding-dong!"), bocina ("¡Mee-meep!"), frenada a la banquina y fanfarria triunfal sin dependencias externas.
5. **Navegación Fluida**:
   - Botón directo **"🏠 Volver a la Sala de Juegos"** tanto en el encabezado como en el menú principal.

---

## 📖 Reglas Rápidas de ¡Toco Timbre!

### Objetivo
Acercarse lo más posible al número real de la pregunta sin pasarse de largo.

### En cada Ronda
1. **El Chofer inicial** (rota cada ronda) ingresa un número inicial prudente.
2. Cada pasajero en su turno tiene 3 opciones:
   - **🛞 Agarrar el volante (Subir número):** Ingresa un número estrictamente mayor y pasa a ser el nuevo Chofer.
   - **🧍 Quedarme en el bondi:** Confía en que el Chofer actual no se pasó y se queda arriba.
   - **🔔 ¡Toco timbre! Me bajo:** Cree que el Chofer ya se pasó del número real. Se baja en la parada y ya no participa en esta ronda.
3. Las apuestas terminan cuando todos los que siguen arriba eligieron "Quedarme", o cuando todos se bajaron y el Chofer quedó solo.

### Puntuación Oficial
- **Si el Chofer NO SE PASÓ ($\le$ respuesta real):**
   - Chofer solitario (todos tocaron timbre): **+6 puntos**.
   - Chofer con pasajeros: **+3 puntos** para el Chofer y **+2 puntos** para cada pasajero arriba.
   - *Bonus exacto:* Si clavó el número 100% justo, **+2 puntos extra** para el Chofer.
   - Pasajeros que tocaron timbre: **0 puntos**.
- **Si el Chofer SE PASÓ ($>$ respuesta real):**
   - El Chofer resta **-1 punto** por mandar el colectivo a la banquina.
   - Pasajeros que se quedaron arriba: **0 puntos**.
   - Cada pasajero que **tocó timbre**: **+2 puntos** por bajarse a tiempo.

---

## 📂 Estructura del Repositorio

```text
hub-juegos/
├── index.html                  # Sala de Juegos principal (Hub TV / Mobile)
├── css/
│   └── hub.css                 # Estilos del Hub (estética Living TV / Noche de Juegos)
├── js/
│   └── hub-shared.js           # Gestor global de jugadores sincronizado en localStorage
├── toco-timbre/                # Juego 1 (Activo y completo)
│   ├── index.html              # Vista de ¡Toco timbre! con enlace de retorno al Hub
│   ├── css/styles.css          # Estilos temáticos de colectivos porteños y SUBE
│   ├── js/app.js               # Lógica del juego y sincronización con hub_jugadores
│   └── data/                   # Categorías y banco de 1.000 preguntas (JSON y bundle)
├── sintonia-fina/              # Juego 2 (Activo y completo: TV + 1 Celular Remoto vía WebRTC)
│   ├── index.html              # Vista de Sintonía Fina (TV, Celular Remoto o 1 Dispositivo)
│   ├── css/styles.css          # Estilos del dial semicircular y controles móviles
│   ├── js/app.js               # Conexión WebRTC PeerJS, giroscopio/slider y estados de ronda
│   └── data/                   # Banco de 200 espectros opuestos (JSON y bundle)
├── en-una-vuelta/              # Juego 3 (Módulo conectado listo para desarrollar)
│   └── index.html              # Vista placeholder con retorno al Hub y lectura de la mesa
└── README.md                   # Documentación general
```

---

## 🚀 Cómo Jugar o Publicar

### Opción 1: Abrir directamente (Doble clic)
Abrí el archivo `index.html` en la raíz con cualquier navegador moderno para acceder a la Sala de Juegos.

### Opción 2: Probar con servidor local
```bash
# Con Python:
python -m http.server 8080

# O con Node.js:
npx serve .
```
Y abrir `http://localhost:8080`.

### Opción 3: Publicar gratis en GitHub Pages
1. Subí este repositorio a tu cuenta de GitHub.
2. Andá a **Settings** > **Pages**.
3. En **Branch**, seleccioná `main` (o `master`) y la carpeta `/ (root)`.
4. ¡Listo! El Hub de Juegos estará online y gratis en `https://<tu-usuario>.github.io/<repo>/`.
