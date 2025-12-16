/**
 * ============================================================================
 * LÓGICA DEL JUEGO DE LA VIDA DE CONWAY
 * ============================================================================
 *
 * Algoritmos Avanzados - UNIPRO - 2025
 *
 * Este archivo contiene:
 * 1. Patrones clásicos predefinidos del Juego de la Vida
 * 2. Clase GameOfLife que maneja el estado y las texturas en WebGL
 * 3. Algoritmos de detección de finalización (extinción, bucles, estados estables)
 *
 * ARQUITECTURA:
 * - Utiliza técnica de ping-pong con dos texturas
 * - Gestiona framebuffers para renderizado off-screen
 * - Implementa hashing para detección de estados repetidos
 *
 * CONCEPTOS CLAVE:
 * - Framebuffer: superficie de renderizado en memoria (no visible)
 * - Textura: array 2D de píxeles usado como almacenamiento
 * - Ping-pong: técnica de doble buffer para evitar condiciones de carrera
 * ============================================================================
 */

/**
 * ============================================================================
 * PATRONES CLÁSICOS DEL JUEGO DE LA VIDA
 * ============================================================================
 *
 * Esta colección contiene 14 patrones famosos descubiertos por diversos
 * matemáticos y entusiastas desde 1970.
 *
 * ESTRUCTURA DE DATOS:
 * - Cada patrón es un array de coordenadas [x, y]
 * - Las coordenadas son relativas (origen en 0,0)
 * - Al cargar, se centran automáticamente en la cuadrícula
 *
 * CLASIFICACIÓN:
 * 1. Vidas estáticas (still lifes): patrones que nunca cambian
 * 2. Osciladores (oscillators): patrones con comportamiento periódico
 * 3. Naves espaciales (spaceships): patrones que se desplazan
 *
 * HISTORIA:
 * - Block: el patrón estático más simple (2x2)
 * - Glider: primer "spaceship" descubierto (Richard Guy, 1970)
 * - Pulsar: oscilador más común en "sopa" aleatoria
 */
const PATTERNS = {
    /**
     * ------------------------------------------------------------------------
     * VIDAS ESTÁTICAS (Still Lifes)
     * ------------------------------------------------------------------------
     * Patrones que permanecen inmóviles indefinidamente.
     * Cada célula tiene exactamente 2 o 3 vecinos vivos (regla de supervivencia).
     */

    /**
     * BLOCK (Bloque) - 2x2
     * El patrón estático más pequeño posible.
     * Todas las células tienen exactamente 3 vecinos → sobreviven siempre
     *
     * Visualización:
     * ██
     * ██
     */
    block: [
        [0, 0], [1, 0],
        [0, 1], [1, 1]
    ],

    /**
     * BEEHIVE (Colmena de abejas) - 4x3
     * Patrón hexagonal simétrico, muy estable.
     * Densidad óptima: 6 células en 12 posiciones (50%)
     *
     * Visualización:
     *  ██
     * █  █
     *  ██
     */
    beehive: [
        [1, 0], [2, 0],
        [0, 1], [3, 1],
        [1, 2], [2, 2]
    ],

    /**
     * LOAF (Pan) - 4x4
     * Patrón asimétrico con una "esquina doblada".
     * Interesante porque no es simétrico pero es estable.
     *
     * Visualización:
     *  ██
     * █  █
     *  █ █
     *   █
     */
    loaf: [
        [1, 0], [2, 0],
        [0, 1], [3, 1],
        [1, 2], [3, 2],
        [2, 3]
    ],

    /**
     * BOAT (Bote) - 3x3
     * Pequeño patrón triangular estable.
     * Una de las formas estáticas más compactas.
     *
     * Visualización:
     * ██
     * █ █
     *  █
     */
    boat: [
        [0, 0], [1, 0],
        [0, 1], [2, 1],
        [1, 2]
    ],

    /**
     * TUB (Bañera) - 3x3
     * Célula central rodeada, forma de copa.
     * Todas las células exteriores tienen 2 vecinos.
     *
     * Visualización:
     *  █
     * █ █
     *  █
     */
    tub: [
        [1, 0],
        [0, 1], [2, 1],
        [1, 2]
    ],

    /**
     * ------------------------------------------------------------------------
     * OSCILADORES (Oscillators)
     * ------------------------------------------------------------------------
     * Patrones que ciclan entre diferentes estados con un período fijo.
     * Después de P generaciones, vuelven al estado inicial.
     */

    /**
     * BLINKER (Intermitente) - Período 2
     * El oscilador más simple. Alterna entre horizontal y vertical.
     * Muy común en configuraciones aleatorias.
     *
     * Estado 1:     Estado 2:
     * ███            █
     *                █
     *                █
     */
    blinker: [
        [0, 0], [1, 0], [2, 0]
    ],

    /**
     * TOAD (Sapo) - Período 2
     * Oscilador que se "balancea" como un sapo saltando.
     * Requiere 6 células.
     *
     * Estado 1:    Estado 2:
     *  ███          █
     * ███           █ █
     *                █
     */
    toad: [
        [1, 0], [2, 0], [3, 0],
        [0, 1], [1, 1], [2, 1]
    ],

    /**
     * BEACON (Faro) - Período 2
     * Dos bloques que "parpadean" en las esquinas.
     * Ejemplo clásico de oscilación local.
     *
     * Estado 1:    Estado 2:
     * ██           ██
     * ██           █
     *    ██           █
     *    ██           ██
     */
    beacon: [
        [0, 0], [1, 0],
        [0, 1],
        [3, 2],
        [2, 3], [3, 3]
    ],

    /**
     * PULSAR (Púlsar) - Período 3
     * Uno de los osciladores más famosos y hermosos.
     * Tiene simetría rotacional de 90°.
     * Es el oscilador natural más común (aparece en sopas aleatorias).
     *
     * Tamaño: 13x13
     * Población: oscila entre 48 y 56 células
     */
    pulsar: [
        [2, 0], [3, 0], [4, 0], [8, 0], [9, 0], [10, 0],
        [0, 2], [5, 2], [7, 2], [12, 2],
        [0, 3], [5, 3], [7, 3], [12, 3],
        [0, 4], [5, 4], [7, 4], [12, 4],
        [2, 5], [3, 5], [4, 5], [8, 5], [9, 5], [10, 5],
        [2, 7], [3, 7], [4, 7], [8, 7], [9, 7], [10, 7],
        [0, 8], [5, 8], [7, 8], [12, 8],
        [0, 9], [5, 9], [7, 9], [12, 9],
        [0, 10], [5, 10], [7, 10], [12, 10],
        [2, 12], [3, 12], [4, 12], [8, 12], [9, 12], [10, 12]
    ],

    /**
     * PENTADECATHLON (Pentadecatlón) - Período 15
     * Oscilador de período largo, muy estable.
     * Nombre: "penta" (5) + "deca" (10) + "thlon" = 15
     * Es el oscilador de período >2 más común.
     *
     * Ciclo completo: 15 generaciones
     * Tamaño: varía entre 3x10 y 18x3
     */
    pentadecathlon: [
        [1, 0],
        [0, 1], [2, 1],
        [1, 2],
        [1, 3],
        [1, 4],
        [1, 5],
        [0, 6], [2, 6],
        [1, 7]
    ],

    /**
     * ------------------------------------------------------------------------
     * NAVES ESPACIALES (Spaceships)
     * ------------------------------------------------------------------------
     * Patrones que se trasladan por la cuadrícula manteniendo su forma.
     * Se mueven en diagonal u ortogonalmente.
     *
     * VELOCIDADES:
     * - c/4 diagonal (glider): 1 celda cada 4 generaciones
     * - c/2 ortogonal (LWSS, MWSS, HWSS): 1 celda cada 2 generaciones
     */

    /**
     * GLIDER (Planeador) - Velocidad c/4 diagonal
     * La nave espacial más pequeña posible.
     * Se mueve diagonalmente: 1 celda en (x,y) cada 4 generaciones.
     * Descubierto por Richard Guy en 1970.
     *
     * Patrón icónico del Juego de la Vida (usado en logos, etc.)
     *
     * Visualización:
     *  █
     *   █
     * ███
     */
    glider: [
        [1, 0],
        [2, 1],
        [0, 2], [1, 2], [2, 2]
    ],

    /**
     * LWSS (Light-Weight SpaceShip) - Velocidad c/2 ortogonal
     * Nave espacial ligera, se mueve horizontalmente.
     * Desplazamiento: 2 celdas cada 4 generaciones.
     *
     * Tamaño: 5x4
     * Primera nave espacial ortogonal descubierta.
     */
    lwss: [
        [1, 0], [4, 0],
        [0, 1],
        [0, 2], [4, 2],
        [0, 3], [1, 3], [2, 3], [3, 3]
    ],

    /**
     * MWSS (Middle-Weight SpaceShip) - Velocidad c/2 ortogonal
     * Nave espacial de peso medio, variante más grande del LWSS.
     *
     * Tamaño: 6x5
     */
    mwss: [
        [2, 0],
        [0, 1], [4, 1],
        [0, 2],
        [0, 3], [5, 3],
        [0, 4], [1, 4], [2, 4], [3, 4], [4, 4]
    ],

    /**
     * HWSS (Heavy-Weight SpaceShip) - Velocidad c/2 ortogonal
     * Nave espacial pesada, la más grande de la familia xWSS.
     *
     * Tamaño: 7x5
     */
    hwss: [
        [2, 0], [3, 0],
        [0, 1], [5, 1],
        [0, 2],
        [0, 3], [6, 3],
        [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4]
    ]
};

/**
 * ============================================================================
 * CLASE PRINCIPAL: GameOfLife
 * ============================================================================
 *
 * Gestiona el estado completo del juego usando WebGL.
 *
 * RESPONSABILIDADES:
 * 1. Crear y gestionar texturas para almacenar el estado de las células
 * 2. Implementar técnica ping-pong para evitar condiciones de carrera
 * 3. Detectar estados finales (extinción, estables, bucles)
 * 4. Contar células vivas
 * 5. Cargar y dibujar patrones
 *
 * ARQUITECTURA DE TEXTURAS:
 * - Dos texturas (A y B) almacenan el estado de las células
 * - En cada generación, lee de una textura y escribe en la otra
 * - Después de cada paso, las texturas intercambian roles (ping-pong)
 *
 * ¿POR QUÉ PING-PONG?
 * Sin ping-pong, al actualizar las células en el mismo lugar donde se leen,
 * algunas células leerían valores ya actualizados (del futuro), causando
 * resultados incorrectos. Con ping-pong, leemos del pasado y escribimos
 * al futuro, garantizando consistencia.
 * ============================================================================
 */
class GameOfLife {
    /**
     * Constructor de la clase GameOfLife
     *
     * @param {WebGLRenderingContext} gl - Contexto WebGL para renderizado GPU
     * @param {number} width - Ancho de la cuadrícula en células
     * @param {number} height - Alto de la cuadrícula en células
     *
     * INICIALIZACIÓN:
     * 1. Crea dos texturas para ping-pong
     * 2. Crea dos framebuffers (uno por textura)
     * 3. Inicializa contadores y estado
     */
    constructor(gl, width, height) {
        this.gl = gl;
        this.width = width;
        this.height = height;

        // Texturas para técnica ping-pong
        // textures[0] y textures[1] alternan roles de lectura/escritura
        this.textures = [
            this.createTexture(),
            this.createTexture()
        ];

        // Framebuffers para renderizar a texturas (off-screen rendering)
        // Cada framebuffer está asociado a una textura
        this.framebuffers = [
            this.createFramebuffer(this.textures[0]),
            this.createFramebuffer(this.textures[1])
        ];

        // Índice de textura actual (0 o 1)
        // Determina qué textura es lectura y cuál es escritura
        // Lectura: textures[currentTexture]
        // Escritura: textures[1 - currentTexture]
        this.currentTexture = 0;

        // Estadísticas del juego
        this.generation = 0;      // Contador de generaciones
        this.aliveCells = 0;      // Número de células vivas actualmente

        // Sistema de detección de finalización
        this.hasEnded = false;               // Flag: ¿ha terminado el juego?
        this.endReason = '';                 // Mensaje descriptivo del fin
        this.stateHistory = [];              // Historial de hashes de estados
        this.maxHistorySize = 10;            // Máximo de estados a recordar
    }

    /**
     * ------------------------------------------------------------------------
     * MÉTODO: createTexture
     * ------------------------------------------------------------------------
     * Crea una textura WebGL para almacenar el estado de las células.
     *
     * DETALLES TÉCNICOS:
     * - Formato RGBA: aunque solo usamos R, RGBA es más compatible
     * - NEAREST filtering: sin interpolación (queremos píxeles exactos)
     * - REPEAT wrapping: implementa bordes toroidales automáticamente
     * - UNSIGNED_BYTE: cada componente es 0-255 (0=muerta, 255=viva)
     *
     * @returns {WebGLTexture} Textura creada y configurada
     *
     * MEMORIA:
     * Para 512x512: 512 × 512 × 4 bytes = 1,048,576 bytes ≈ 1 MB por textura
     * Total: 2 MB (dos texturas para ping-pong)
     */
    createTexture() {
        const gl = this.gl;

        // Crear objeto de textura
        const texture = gl.createTexture();

        // Activar esta textura para configurarla
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Configurar parámetros de la textura

        // TEXTURE_WRAP_S y TEXTURE_WRAP_T: qué hacer en los bordes
        // gl.REPEAT hace que las coordenadas "envuelvan" (bordes toroidales)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

        // TEXTURE_MIN_FILTER y TEXTURE_MAG_FILTER: cómo interpolar
        // gl.NEAREST = sin interpolación, queremos píxeles exactos
        // Alternativa: gl.LINEAR haría blur entre células (indeseable aquí)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        // Crear textura vacía (todos los píxeles en negro/muerto)
        // null = sin datos iniciales, se inicializará a 0
        gl.texImage2D(
            gl.TEXTURE_2D,          // Target: textura 2D
            0,                      // Nivel de mipmap (0 = nivel base)
            gl.RGBA,                // Formato interno (cómo se almacena en GPU)
            this.width,             // Ancho en píxeles
            this.height,            // Alto en píxeles
            0,                      // Border (siempre 0 en WebGL)
            gl.RGBA,                // Formato de datos
            gl.UNSIGNED_BYTE,       // Tipo de datos (0-255 por componente)
            null                    // Datos (null = inicializar a ceros)
        );

        return texture;
    }

    /**
     * ------------------------------------------------------------------------
     * MÉTODO: createFramebuffer
     * ------------------------------------------------------------------------
     * Crea un framebuffer asociado a una textura para renderizado off-screen.
     *
     * ¿QUÉ ES UN FRAMEBUFFER?
     * Normalmente, WebGL renderiza a la pantalla. Un framebuffer es una
     * "pantalla virtual" que renderiza a una textura en memoria.
     *
     * USO EN ESTE PROYECTO:
     * El compute shader escribe el nuevo estado en un framebuffer (textura B)
     * mientras lee el estado anterior de otra textura (textura A).
     *
     * @param {WebGLTexture} texture - Textura donde se renderizará
     * @returns {WebGLFramebuffer} Framebuffer creado
     *
     * FLUJO:
     * 1. Crear framebuffer
     * 2. Asociarlo con la textura
     * 3. Ahora, gl.drawArrays escribirá a la textura en lugar de la pantalla
     */
    createFramebuffer(texture) {
        const gl = this.gl;

        // Crear objeto framebuffer
        const framebuffer = gl.createFramebuffer();

        // Activar este framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

        // Asociar la textura como "color attachment"
        // COLOR_ATTACHMENT0 = destino donde se escribirá gl_FragColor
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,             // Target
            gl.COLOR_ATTACHMENT0,       // Attachment point
            gl.TEXTURE_2D,              // Texture target
            texture,                    // Textura a asociar
            0                           // Mipmap level
        );

        return framebuffer;
    }

    /**
     * ------------------------------------------------------------------------
     * MÉTODO: randomize
     * ------------------------------------------------------------------------
     * Inicializa la cuadrícula con un patrón aleatorio.
     *
     * ALGORITMO:
     * - Para cada célula, generar número aleatorio
     * - Si random < 0.3 (30%), la célula está viva
     * - Esto produce configuraciones interesantes (no muy densas ni vacías)
     *
     * PROBABILIDAD ÓPTIMA:
     * - <20%: tiende a morir rápido (subpoblación)
     * - 20-40%: comportamiento interesante
     * - >50%: tiende a morir rápido (sobrepoblación)
     * - 30% es un buen compromiso
     *
     * COMPLEJIDAD: O(n) donde n = width × height
     */
    randomize() {
        const gl = this.gl;

        // Crear array de datos para la textura
        // 4 bytes por pixel (RGBA), width × height píxeles
        const data = new Uint8Array(this.width * this.height * 4);

        // Generar patrón aleatorio
        for (let i = 0; i < this.width * this.height; i++) {
            // 30% de probabilidad de estar vivo
            const alive = Math.random() < 0.3 ? 255 : 0;

            // Escribir en los 4 componentes (R, G, B, A)
            // Solo usamos R para el estado, pero WebGL prefiere RGBA completo
            data[i * 4 + 0] = alive;  // Red
            data[i * 4 + 1] = alive;  // Green
            data[i * 4 + 2] = alive;  // Blue
            data[i * 4 + 3] = 255;    // Alpha (siempre opaco)
        }

        // Subir datos a la textura actual
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentTexture]);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            this.width,
            this.height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            data
        );

        // Resetear estadísticas y detección de finalización
        this.reset();
    }

    /**
     * ------------------------------------------------------------------------
     * MÉTODO: clear
     * ------------------------------------------------------------------------
     * Limpia toda la cuadrícula (todas las células muertas).
     *
     * IMPLEMENTACIÓN:
     * - Crea array de ceros (Uint8Array se inicializa a 0)
     * - Sube a la textura actual
     * - Resetea estadísticas
     *
     * COMPLEJIDAD: O(n) donde n = width × height
     */
    clear() {
        const gl = this.gl;

        // Crear array de ceros (todas las células muertas)
        const data = new Uint8Array(this.width * this.height * 4);

        // Subir a la textura
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentTexture]);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            this.width,
            this.height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            data
        );

        this.reset();
    }

    /**
     * ------------------------------------------------------------------------
     * MÉTODO: drawCell
     * ------------------------------------------------------------------------
     * Dibuja o borra una célula individual en las coordenadas dadas.
     *
     * PROCESO:
     * 1. Leer toda la textura a memoria (readPixels)
     * 2. Modificar el píxel específico
     * 3. Subir la textura modificada de vuelta
     *
     * NOTA DE RENDIMIENTO:
     * Este método es lento (lee/escribe textura completa por cada célula).
     * Adecuado para dibujo manual del usuario, no para generación automática.
     * Para dibujos grandes, mejor usar loadPattern o randomize.
     *
     * @param {number} x - Coordenada X de la célula
     * @param {number} y - Coordenada Y de la célula
     * @param {boolean} alive - true = viva, false = muerta
     *
     * COMPLEJIDAD: O(n) donde n = width × height (por el readPixels)
     */
    drawCell(x, y, alive) {
        const gl = this.gl;

        // Leer los datos actuales de la textura
        // Necesario porque no podemos modificar un píxel individual directamente
        const data = new Uint8Array(this.width * this.height * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[this.currentTexture]);
        gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, data);

        // Calcular índice en el array lineal
        // Fórmula: (y * width + x) * 4
        // Multiplicamos por 4 porque cada píxel tiene 4 componentes (RGBA)
        const index = (y * this.width + x) * 4;
        const value = alive ? 255 : 0;

        // Modificar el píxel
        data[index + 0] = value;  // Red
        data[index + 1] = value;  // Green
        data[index + 2] = value;  // Blue
        data[index + 3] = 255;    // Alpha (siempre opaco)

        // Subir la textura modificada
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentTexture]);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            this.width,
            this.height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            data
        );
    }

    /**
     * ------------------------------------------------------------------------
     * MÉTODO: swap
     * ------------------------------------------------------------------------
     * Intercambia las texturas en la técnica ping-pong.
     *
     * FUNCIONAMIENTO:
     * - Si currentTexture = 0, lo cambia a 1
     * - Si currentTexture = 1, lo cambia a 0
     * - Expresión matemática: currentTexture = 1 - currentTexture
     *
     * EFECTO:
     * - La textura de escritura se convierte en lectura
     * - La textura de lectura se convierte en escritura
     * - Listo para la siguiente generación
     *
     * COMPLEJIDAD: O(1)
     */
    swap() {
        this.currentTexture = 1 - this.currentTexture;
    }

    /**
     * ------------------------------------------------------------------------
     * MÉTODO: getReadTexture
     * ------------------------------------------------------------------------
     * Retorna la textura desde la cual debemos LEER el estado actual.
     *
     * @returns {WebGLTexture} Textura de lectura
     *
     * USO:
     * El compute shader lee de esta textura para calcular el siguiente estado.
     */
    getReadTexture() {
        return this.textures[this.currentTexture];
    }

    /**
     * ------------------------------------------------------------------------
     * MÉTODO: getWriteFramebuffer
     * ------------------------------------------------------------------------
     * Retorna el framebuffer donde debemos ESCRIBIR el nuevo estado.
     *
     * @returns {WebGLFramebuffer} Framebuffer de escritura
     *
     * USO:
     * El compute shader escribe a este framebuffer (que está asociado a la
     * otra textura, no a la de lectura).
     */
    getWriteFramebuffer() {
        return this.framebuffers[1 - this.currentTexture];
    }

    /**
     * ------------------------------------------------------------------------
     * MÉTODO: countAliveCells
     * ------------------------------------------------------------------------
     * Cuenta cuántas células están vivas en el estado actual.
     *
     * ALGORITMO:
     * 1. Leer toda la textura a memoria
     * 2. Iterar por cada píxel
     * 3. Si el componente rojo > 128, incrementar contador
     *
     * UMBRAL 128:
     * Usamos >128 en lugar de ==255 por seguridad ante imprecisiones numéricas.
     * Si por algún motivo el valor fuera 254, seguiría contando como viva.
     *
     * @returns {number} Cantidad de células vivas
     *
     * COMPLEJIDAD: O(n) donde n = width × height
     */
    countAliveCells() {
        const gl = this.gl;

        // Leer la textura actual
        const data = new Uint8Array(this.width * this.height * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[this.currentTexture]);
        gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, data);

        // Contar píxeles vivos
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
            // Saltar de 4 en 4 (solo mirar componente R de cada píxel)
            if (data[i] > 128) count++;
        }

        // Actualizar variable de instancia y retornar
        this.aliveCells = count;
        return count;
    }

    /**
     * ------------------------------------------------------------------------
     * MÉTODO: getStateHash
     * ------------------------------------------------------------------------
     * Calcula un hash simple del estado actual para detectar repeticiones.
     *
     * ALGORITMO DE HASH:
     * - Hash polinomial con base 31 (número primo)
     * - Fórmula: hash = (hash * 31 + posición) mod 2^32
     * - Solo considera células vivas (eficiente para estados dispersos)
     *
     * ¿POR QUÉ 31?
     * - Es primo (reduce colisiones)
     * - Multiplicación por 31 es rápida: 31*x = (x << 5) - x
     * - Usado en hashCode() de Java
     *
     * LIMITACIONES:
     * - No es criptográfico (pueden haber colisiones)
     * - Suficiente para detectar bucles en el Juego de la Vida
     * - Colisión = falso positivo de bucle (poco probable, poco problema)
     *
     * @returns {number} Hash del estado (entero de 32 bits sin signo)
     *
     * COMPLEJIDAD: O(n) donde n = número de células (ancho × alto)
     */
    getStateHash() {
        const gl = this.gl;

        // Leer estado actual
        const data = new Uint8Array(this.width * this.height * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[this.currentTexture]);
        gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, data);

        // Calcular hash polinomial
        let hash = 0;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] > 128) {  // Solo células vivas
                // Multiplicar por 31 y sumar posición
                hash = (hash * 31 + i) >>> 0;  // >>> 0 convierte a unsigned 32-bit
            }
        }

        return hash;
    }

    /**
     * ------------------------------------------------------------------------
     * MÉTODO: checkEnd
     * ------------------------------------------------------------------------
     * Detecta si el juego ha llegado a un estado final.
     *
     * TRES TIPOS DE FINALIZACIÓN:
     *
     * 1. EXTINCIÓN: Todas las células han muerto (aliveCells = 0)
     *    - Más común con densidades bajas
     *    - Irreversible
     *
     * 2. ESTADO ESTABLE: Patrón no cambia entre generaciones
     *    - Hash actual = hash de generación anterior
     *    - Ejemplo: block, beehive, etc.
     *
     * 3. BUCLE PERIÓDICO: Patrón se repite cada N generaciones
     *    - Hash actual aparece en historial (pero no en posición anterior)
     *    - Ejemplo: blinker (período 2), pulsar (período 3)
     *    - Detectamos períodos de hasta 10 generaciones
     *
     * ALGORITMO DE DETECCIÓN:
     * 1. Contar células vivas → si 0, es extinción
     * 2. Calcular hash del estado actual
     * 3. Buscar hash en historial:
     *    - Si está en última posición → estado estable
     *    - Si está en otra posición → bucle con período (histLen - pos)
     * 4. Agregar hash actual al historial
     * 5. Mantener historial limitado a maxHistorySize
     *
     * @returns {boolean} true si ha terminado, false si continúa
     *
     * COMPLEJIDAD: O(n + h) donde n=células, h=tamaño del historial
     */
    checkEnd() {
        // Si ya terminó antes, no volver a verificar
        if (this.hasEnded) return true;

        // CASO 1: Detectar extinción
        const alive = this.countAliveCells();
        if (alive === 0) {
            this.hasEnded = true;
            this.endReason = 'EXTINCIÓN - Todas las células han muerto';
            return true;
        }

        // CASOS 2 y 3: Detectar estado estable o bucle
        const currentHash = this.getStateHash();

        // Buscar hash actual en el historial
        for (let i = 0; i < this.stateHistory.length; i++) {
            if (this.stateHistory[i] === currentHash) {
                this.hasEnded = true;

                // Determinar si es estado estable o bucle
                if (i === this.stateHistory.length - 1) {
                    // Hash coincide con la generación inmediatamente anterior
                    this.endReason = 'ESTADO ESTABLE - El patrón no cambia';
                } else {
                    // Hash coincide con una generación anterior (no la inmediata)
                    // Período = distancia desde la coincidencia hasta ahora
                    const period = this.stateHistory.length - i;
                    this.endReason = `BUCLE PERIÓDICO - Periodo de ${period} generaciones`;
                }
                return true;
            }
        }

        // No se detectó fin, agregar hash al historial
        this.stateHistory.push(currentHash);

        // Mantener historial limitado (ventana deslizante)
        // Solo recordamos los últimos maxHistorySize estados
        if (this.stateHistory.length > this.maxHistorySize) {
            this.stateHistory.shift();  // Eliminar el más antiguo
        }

        return false;
    }

    /**
     * ------------------------------------------------------------------------
     * MÉTODO: nextGeneration
     * ------------------------------------------------------------------------
     * Incrementa el contador de generaciones.
     *
     * NOTA:
     * Este método solo incrementa el contador. El cálculo del estado
     * siguiente se hace en main.js usando el compute shader.
     *
     * COMPLEJIDAD: O(1)
     */
    nextGeneration() {
        this.generation++;
    }

    /**
     * ------------------------------------------------------------------------
     * MÉTODO: reset
     * ------------------------------------------------------------------------
     * Reinicia todas las estadísticas y el sistema de detección de fin.
     *
     * USO:
     * - Después de cargar un nuevo patrón
     * - Después de randomizar
     * - Después de limpiar
     * - Cuando el usuario dibuja manualmente
     *
     * COMPLEJIDAD: O(n) por el countAliveCells
     */
    reset() {
        this.generation = 0;
        this.aliveCells = 0;
        this.hasEnded = false;
        this.endReason = '';
        this.stateHistory = [];
        this.countAliveCells();  // Actualizar contador inicial
    }

    /**
     * ------------------------------------------------------------------------
     * MÉTODO: loadPattern
     * ------------------------------------------------------------------------
     * Carga un patrón predefinido en el centro de la cuadrícula.
     *
     * PROCESO:
     * 1. Obtener patrón de la tabla PATTERNS
     * 2. Limpiar la cuadrícula (array de ceros)
     * 3. Calcular dimensiones del patrón
     * 4. Calcular offset para centrarlo
     * 5. Dibujar patrón en el array
     * 6. Subir array a la textura
     * 7. Resetear estadísticas
     *
     * CENTRADO:
     * - Se calcula el bounding box del patrón (minX, maxX, minY, maxY)
     * - Se centra el centro del bounding box en el centro de la cuadrícula
     *
     * @param {string} patternName - Nombre del patrón (clave en PATTERNS)
     *
     * COMPLEJIDAD: O(n + p) donde n=células, p=tamaño del patrón
     */
    loadPattern(patternName) {
        const pattern = PATTERNS[patternName];
        if (!pattern) {
            console.error(`Patron ${patternName} no encontrado`);
            return;
        }

        const gl = this.gl;

        // Limpiar la cuadrícula
        const data = new Uint8Array(this.width * this.height * 4);

        // Calcular centro de la cuadrícula
        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);

        // Calcular bounding box del patrón
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        for (const [x, y] of pattern) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }

        // Dimensiones del patrón
        const patternWidth = maxX - minX;
        const patternHeight = maxY - minY;

        // Dibujar el patrón centrado
        for (const [px, py] of pattern) {
            // Calcular posición final centrada
            const x = centerX + px - Math.floor(patternWidth / 2);
            const y = centerY + py - Math.floor(patternHeight / 2);

            // Verificar que está dentro de los límites
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                const index = (y * this.width + x) * 4;
                data[index + 0] = 255;  // Red
                data[index + 1] = 255;  // Green
                data[index + 2] = 255;  // Blue
                data[index + 3] = 255;  // Alpha
            }
        }

        // Subir la textura
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentTexture]);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            this.width,
            this.height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            data
        );

        // Resetear estadísticas
        this.reset();
    }
}

/**
 * ----------------------------------------------------------------------------
 * EXPORTACIÓN DE MÓDULOS
 * ----------------------------------------------------------------------------
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameOfLife;
}
