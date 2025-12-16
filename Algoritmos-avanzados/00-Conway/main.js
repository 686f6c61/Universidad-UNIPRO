/**
 * ============================================================================
 * CONTROLADOR PRINCIPAL DEL JUEGO DE LA VIDA DE CONWAY
 * ============================================================================
 *
 * Algoritmos Avanzados - UNIPRO - 2025
 *
 * Este archivo contiene la lógica principal de la aplicación:
 * 1. Inicialización de WebGL y compilación de shaders
 * 2. Creación de buffers de geometría (quad fullscreen)
 * 3. Bucle de animación principal
 * 4. Sistema de controles (teclado, mouse, botones)
 * 5. Sistema de previsualización de patrones en mini-canvas
 *
 * ARQUITECTURA DE RENDERIZADO:
 * - Dos pasadas por generación:
 *   a) Compute pass: calcula siguiente estado → framebuffer
 *   b) Display pass: renderiza estado actual → pantalla
 *
 * FLUJO PRINCIPAL:
 * 1. Usuario inicia simulación o carga patrón
 * 2. Bucle animate() se ejecuta cada frame (~60 FPS)
 * 3. Cada N milisegundos (según velocidad):
 *    - computeNextState(): GPU calcula nueva generación
 *    - checkEnd(): verifica si terminó
 *    - render(): muestra en pantalla
 *    - updateUI(): actualiza estadísticas
 *
 * OPTIMIZACIONES:
 * - Renderizado condicional (solo cuando hay cambios)
 * - Cálculo GPU-acelerado (miles de células en paralelo)
 * - Previsualización independiente (no afecta simulación principal)
 * ============================================================================
 */

/**
 * ----------------------------------------------------------------------------
 * CONFIGURACIÓN GLOBAL
 * ----------------------------------------------------------------------------
 */

// Tamaño de la cuadrícula principal (512x512 = 262,144 células)
const GRID_SIZE = 512;

// Velocidad inicial: 10 generaciones por segundo
const DEFAULT_SPEED = 10;

// Rango de velocidades permitidas
const MIN_SPEED = 1;    // 1 FPS (muy lento, para análisis detallado)
const MAX_SPEED = 60;   // 60 FPS (máximo del navegador por requestAnimationFrame)

/**
 * ----------------------------------------------------------------------------
 * VARIABLES GLOBALES DEL SIMULADOR PRINCIPAL
 * ----------------------------------------------------------------------------
 */

// Contexto WebGL para renderizado acelerado por GPU
let gl;

// Instancia del juego (gestiona texturas, framebuffers, patrones)
let game;

// Programas de shaders compilados
let computeProgram;   // Para calcular siguiente generación
let displayProgram;   // Para mostrar en pantalla

// Buffers de geometría
let quadBuffer;       // Vértices del quad fullscreen
let texCoordBuffer;   // Coordenadas de textura UV

// Estado de la simulación
let isRunning = false;        // ¿Está la simulación en ejecución?
let speed = DEFAULT_SPEED;    // Generaciones por segundo
let lastUpdateTime = 0;       // Timestamp de la última actualización
let isDrawing = false;        // ¿Usuario está dibujando con el mouse?

/**
 * ============================================================================
 * INICIALIZACIÓN
 * ============================================================================
 */

/**
 * ----------------------------------------------------------------------------
 * EVENT LISTENER: DOMContentLoaded
 * ----------------------------------------------------------------------------
 *
 * Se ejecuta cuando el DOM está completamente cargado.
 * Inicializa todo el sistema: WebGL, shaders, buffers, controles.
 *
 * ORDEN DE INICIALIZACIÓN (importante):
 * 1. Obtener contexto WebGL
 * 2. Compilar shaders
 * 3. Crear buffers de geometría
 * 4. Crear instancia del juego
 * 5. Generar patrón inicial
 * 6. Configurar event listeners
 * 7. Iniciar bucle de animación
 */
window.addEventListener('DOMContentLoaded', () => {
    // Obtener elemento canvas del DOM
    const canvas = document.getElementById('glCanvas');

    // Intentar obtener contexto WebGL
    // WebGL es la API de JavaScript para gráficos 3D/2D acelerados por GPU
    gl = canvas.getContext('webgl');

    if (!gl) {
        // Navegador no soporta WebGL
        alert('WebGL no está disponible en este navegador');
        return;
    }

    // Inicializar WebGL: compilar shaders, crear buffers
    initWebGL();

    // Crear instancia del juego con el tamaño de la cuadrícula
    game = new GameOfLife(gl, GRID_SIZE, GRID_SIZE);

    // Generar configuración inicial aleatoria
    game.randomize();

    // Configurar todos los controles (botones, teclado, mouse)
    setupControls();

    // Renderizar el estado inicial en la pantalla
    render();

    // Actualizar la interfaz de usuario (estadísticas, botones)
    updateUI();
});

/**
 * ----------------------------------------------------------------------------
 * FUNCIÓN: initWebGL
 * ----------------------------------------------------------------------------
 *
 * Inicializa todos los recursos WebGL necesarios.
 *
 * PROCESO:
 * 1. Compilar vertex y fragment shaders desde strings
 * 2. Enlazar shaders en programas (compute y display)
 * 3. Crear buffer para quad (6 vértices = 2 triángulos)
 * 4. Crear buffer para coordenadas de textura
 * 5. Configurar viewport
 *
 * GEOMETRÍA DEL QUAD:
 * Un quad es un rectángulo formado por 2 triángulos.
 * Cubre toda la pantalla en coordenadas normalizadas [-1, 1].
 *
 *   (-1,1) +-----+ (1,1)
 *          |   / |
 *          | /   |
 * (-1,-1) +-----+ (1,-1)
 *
 * COMPLEJIDAD: O(1) - operaciones constantes
 */
function initWebGL() {
    /**
     * PASO 1: Compilar programas de shaders
     * Los shaders están definidos en shaders.js como strings
     */
    computeProgram = createProgram(vertexShaderSource, computeShaderSource);
    displayProgram = createProgram(vertexShaderSource, displayShaderSource);

    /**
     * PASO 2: Crear buffer para vértices del quad
     *
     * Float32Array contiene 12 valores (6 vértices × 2 coordenadas):
     * Triángulo 1: (-1,-1), (1,-1), (-1,1)
     * Triángulo 2: (-1,1), (1,-1), (1,1)
     *
     * Nota: ordenados en sentido antihorario (convención de OpenGL)
     */
    quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
            -1, -1,   // Vértice 0: esquina inferior izquierda
             1, -1,   // Vértice 1: esquina inferior derecha
            -1,  1,   // Vértice 2: esquina superior izquierda
            -1,  1,   // Vértice 3: esquina superior izquierda (segundo triángulo)
             1, -1,   // Vértice 4: esquina inferior derecha (segundo triángulo)
             1,  1    // Vértice 5: esquina superior derecha
        ]),
        gl.STATIC_DRAW  // Hint: los datos no cambiarán
    );

    /**
     * PASO 3: Crear buffer para coordenadas de textura
     *
     * Mapean los vértices del quad a coordenadas de textura [0,1]:
     * (0,0) = esquina inferior izquierda de la textura
     * (1,1) = esquina superior derecha de la textura
     */
    texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
            0, 0,   // Vértice 0: esquina inferior izquierda de textura
            1, 0,   // Vértice 1: esquina inferior derecha de textura
            0, 1,   // Vértice 2: esquina superior izquierda de textura
            0, 1,   // Vértice 3: esquina superior izquierda de textura
            1, 0,   // Vértice 4: esquina inferior derecha de textura
            1, 1    // Vértice 5: esquina superior derecha de textura
        ]),
        gl.STATIC_DRAW
    );

    /**
     * PASO 4: Configurar viewport
     * Define el área de renderizado en píxeles de la pantalla
     * (0, 0) es la esquina inferior izquierda en WebGL
     */
    gl.viewport(0, 0, GRID_SIZE, GRID_SIZE);
}

/**
 * ----------------------------------------------------------------------------
 * FUNCIÓN: createProgram
 * ----------------------------------------------------------------------------
 *
 * Compila y enlaza un programa de shaders completo.
 *
 * PROCESO:
 * 1. Compilar vertex shader
 * 2. Compilar fragment shader
 * 3. Crear programa
 * 4. Adjuntar ambos shaders al programa
 * 5. Enlazar (link) el programa
 * 6. Verificar errores
 *
 * ¿QUÉ ES ENLAZAR (LINKING)?
 * Es el proceso de conectar las salidas del vertex shader con las entradas
 * del fragment shader. Similar al linking en compiladores de C/C++.
 *
 * @param {string} vertexSource - Código fuente del vertex shader (GLSL)
 * @param {string} fragmentSource - Código fuente del fragment shader (GLSL)
 * @returns {WebGLProgram} Programa de shaders compilado y enlazado
 *
 * COMPLEJIDAD: O(n) donde n = tamaño del código shader
 */
function createProgram(vertexSource, fragmentSource) {
    // Compilar cada shader por separado
    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);

    // Crear programa (contenedor para los shaders)
    const program = gl.createProgram();

    // Adjuntar ambos shaders al programa
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    // Enlazar el programa
    // Esto conecta las salidas del vertex shader con las entradas del fragment shader
    gl.linkProgram(program);

    // Verificar que el enlace fue exitoso
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Error al enlazar programa:', gl.getProgramInfoLog(program));
        return null;
    }

    return program;
}

/**
 * ----------------------------------------------------------------------------
 * FUNCIÓN: compileShader
 * ----------------------------------------------------------------------------
 *
 * Compila un shader individual (vertex o fragment).
 *
 * PROCESO:
 * 1. Crear objeto shader del tipo especificado
 * 2. Cargar código fuente en el shader
 * 3. Compilar
 * 4. Verificar errores de compilación
 *
 * TIPOS DE SHADER:
 * - gl.VERTEX_SHADER: procesa vértices (posiciones)
 * - gl.FRAGMENT_SHADER: procesa píxeles (colores)
 *
 * @param {GLenum} type - Tipo de shader (VERTEX_SHADER o FRAGMENT_SHADER)
 * @param {string} source - Código fuente GLSL del shader
 * @returns {WebGLShader} Shader compilado
 *
 * COMPLEJIDAD: O(n) donde n = longitud del código fuente
 */
function compileShader(type, source) {
    // Crear objeto shader
    const shader = gl.createShader(type);

    // Cargar el código fuente
    gl.shaderSource(shader, source);

    // Compilar
    gl.compileShader(shader);

    // Verificar compilación exitosa
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Error al compilar shader:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

/**
 * ----------------------------------------------------------------------------
 * FUNCIÓN: setupAttributes
 * ----------------------------------------------------------------------------
 *
 * Configura los atributos de un programa de shaders.
 *
 * ATRIBUTOS:
 * Son variables de entrada del vertex shader que cambian por vértice.
 * En nuestro caso: posición (a_position) y coordenadas UV (a_texCoord).
 *
 * PROCESO:
 * 1. Obtener location (índice) de cada atributo
 * 2. Activar el buffer correspondiente
 * 3. Configurar cómo leer datos del buffer (stride, offset, etc.)
 * 4. Habilitar el atributo
 *
 * @param {WebGLProgram} program - Programa donde configurar atributos
 *
 * COMPLEJIDAD: O(1)
 */
function setupAttributes(program) {
    // Obtener locations de los atributos
    // Estos índices identifican los atributos en el programa
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');

    /**
     * Configurar atributo a_position (coordenadas de vértices)
     */
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);     // Activar buffer de posiciones
    gl.enableVertexAttribArray(positionLocation);   // Habilitar el atributo
    gl.vertexAttribPointer(
        positionLocation,    // Índice del atributo
        2,                   // Número de componentes por vértice (x, y)
        gl.FLOAT,            // Tipo de datos
        false,               // ¿Normalizar? (no necesario para posiciones)
        0,                   // Stride: bytes entre vértices consecutivos (0 = compacto)
        0                    // Offset: bytes desde el inicio del buffer
    );

    /**
     * Configurar atributo a_texCoord (coordenadas de textura)
     */
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);  // Activar buffer de UVs
    gl.enableVertexAttribArray(texCoordLocation);    // Habilitar el atributo
    gl.vertexAttribPointer(
        texCoordLocation,    // Índice del atributo
        2,                   // Número de componentes (u, v)
        gl.FLOAT,            // Tipo de datos
        false,               // No normalizar
        0,                   // Stride: 0 (datos compactos)
        0                    // Offset: 0 (empezar desde el inicio)
    );
}

/**
 * ============================================================================
 * BUCLE DE SIMULACIÓN PRINCIPAL
 * ============================================================================
 */

/**
 * ----------------------------------------------------------------------------
 * FUNCIÓN: computeNextState
 * ----------------------------------------------------------------------------
 *
 * Calcula el siguiente estado del juego usando el compute shader en la GPU.
 *
 * ARQUITECTURA PING-PONG:
 * 1. Lee de textures[currentTexture] (estado actual)
 * 2. Escribe a textures[1-currentTexture] (nuevo estado) mediante framebuffer
 * 3. Intercambia texturas (swap)
 *
 * PROCESO DETALLADO:
 * 1. Activar programa compute
 * 2. Configurar atributos de geometría
 * 3. Pasar uniforms (textura de estado, resolución)
 * 4. Activar textura de lectura
 * 5. Activar framebuffer de escritura
 * 6. Renderizar quad (ejecuta compute shader para cada píxel)
 * 7. Intercambiar texturas
 *
 * GPU PARALLEL PROCESSING:
 * El compute shader se ejecuta en paralelo para TODAS las células
 * simultáneamente. En una GPU moderna, esto puede ser 1000x más rápido
 * que procesar célula por célula en CPU.
 *
 * COMPLEJIDAD:
 * - CPU: O(1) - solo configuración
 * - GPU: O(n) donde n = número de células, pero ejecutado en paralelo
 * - Tiempo real: ≈ O(1) gracias al paralelismo masivo
 */
function computeNextState() {
    // Activar el programa compute (compilado al inicio)
    gl.useProgram(computeProgram);

    // Configurar atributos de geometría (posición y UV)
    setupAttributes(computeProgram);

    /**
     * Configurar uniforms (variables globales del shader)
     */

    // u_state: textura con el estado actual
    const stateLocation = gl.getUniformLocation(computeProgram, 'u_state');
    // u_resolution: dimensiones de la cuadrícula
    const resolutionLocation = gl.getUniformLocation(computeProgram, 'u_resolution');

    // Decir al shader que u_state está en la unidad de textura 0
    gl.uniform1i(stateLocation, 0);
    // Pasar dimensiones de la cuadrícula
    gl.uniform2f(resolutionLocation, GRID_SIZE, GRID_SIZE);

    /**
     * Activar textura de lectura
     * TEXTURE0 es la primera unidad de textura (hay múltiples disponibles)
     */
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, game.getReadTexture());

    /**
     * Activar framebuffer de escritura
     * Esto hace que gl.drawArrays renderice a la textura en lugar de la pantalla
     */
    gl.bindFramebuffer(gl.FRAMEBUFFER, game.getWriteFramebuffer());

    /**
     * Dibujar el quad (6 vértices = 2 triángulos)
     * Esto ejecuta el compute shader una vez por cada píxel de la textura
     */
    gl.drawArrays(
        gl.TRIANGLES,    // Modo: triángulos
        0,               // Primer vértice
        6                // Número de vértices
    );

    /**
     * Intercambiar texturas (ping-pong)
     * La textura de escritura se convierte en lectura para la siguiente frame
     */
    game.swap();
}

/**
 * ----------------------------------------------------------------------------
 * FUNCIÓN: render
 * ----------------------------------------------------------------------------
 *
 * Renderiza el estado actual del juego en la pantalla.
 *
 * DIFERENCIA CON computeNextState:
 * - computeNextState: calcula → escribe a framebuffer (off-screen)
 * - render: visualiza → escribe a pantalla (on-screen)
 *
 * PROCESO:
 * 1. Activar programa display
 * 2. Configurar atributos
 * 3. Pasar textura de estado actual
 * 4. Renderizar a pantalla (framebuffer null)
 * 5. Dibujar quad
 *
 * COMPLEJIDAD: O(1) en CPU, O(n) en GPU (pero paralelizado)
 */
function render() {
    // Activar programa display
    gl.useProgram(displayProgram);

    // Configurar atributos de geometría
    setupAttributes(displayProgram);

    // Configurar uniform u_state
    const stateLocation = gl.getUniformLocation(displayProgram, 'u_state');
    gl.uniform1i(stateLocation, 0);

    // Activar textura de estado actual
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, game.getReadTexture());

    /**
     * Renderizar a pantalla (framebuffer = null)
     * null significa "pantalla por defecto" (no off-screen)
     */
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Dibujar el quad
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

/**
 * ----------------------------------------------------------------------------
 * FUNCIÓN: animate
 * ----------------------------------------------------------------------------
 *
 * Bucle de animación principal. Se ejecuta aproximadamente 60 veces por segundo.
 *
 * CONTROL DE VELOCIDAD:
 * No calculamos una nueva generación cada frame, sino cada N milisegundos
 * según la velocidad configurada. Esto permite velocidades < 60 FPS.
 *
 * ALGORITMO:
 * 1. Si la simulación no está corriendo o terminó → no hacer nada
 * 2. Calcular tiempo transcurrido desde última actualización
 * 3. Si pasó suficiente tiempo (según velocidad):
 *    a) Calcular siguiente estado
 *    b) Verificar si terminó
 *    c) Si terminó: detener y mostrar mensaje
 *    d) Si no terminó: incrementar generación
 *    e) Renderizar
 *    f) Actualizar UI
 * 4. Solicitar siguiente frame
 *
 * @param {number} timestamp - Tiempo actual en milisegundos (DOMHighResTimeStamp)
 *
 * COMPLEJIDAD: O(1) en CPU (sin contar GPU)
 */
function animate(timestamp) {
    // Solo procesar si está corriendo y no ha terminado
    if (isRunning && !game.hasEnded) {
        // Calcular intervalo en milisegundos entre actualizaciones
        // speed = generaciones por segundo
        // interval = 1000 ms / speed
        // Ejemplo: speed=10 → interval=100ms → 10 generaciones por segundo
        const interval = 1000 / speed;

        // Verificar si pasó suficiente tiempo desde la última actualización
        if (timestamp - lastUpdateTime >= interval) {
            // Calcular siguiente estado en la GPU
            computeNextState();

            /**
             * IMPORTANTE: Verificar finalización ANTES de incrementar generación
             * Esto asegura que el contador muestre la generación correcta al terminar
             */
            if (game.checkEnd()) {
                // Juego terminó, incrementar generación final
                game.nextGeneration();
                // Detener simulación
                isRunning = false;
                // Mostrar mensaje de finalización
                showEndMessage(game.endReason);
                // Actualizar UI (deshabilitar botones, etc.)
                updateUI();
            } else {
                // Continúa, incrementar generación
                game.nextGeneration();
            }

            // Renderizar estado actual en pantalla
            render();

            // Actualizar estadísticas en la UI
            updateUI();

            // Actualizar timestamp de última actualización
            lastUpdateTime = timestamp;
        }
    }

    // Solicitar siguiente frame de animación
    // requestAnimationFrame llama a animate ~60 veces por segundo
    requestAnimationFrame(animate);
}

/**
 * ============================================================================
 * INTERFAZ DE USUARIO
 * ============================================================================
 */

/**
 * ----------------------------------------------------------------------------
 * FUNCIÓN: updateUI
 * ----------------------------------------------------------------------------
 *
 * Actualiza todos los elementos de la interfaz de usuario.
 *
 * ELEMENTOS ACTUALIZADOS:
 * - Contador de generaciones
 * - Contador de células vivas
 * - Velocidad actual
 * - Estado de botones (habilitado/deshabilitado)
 *
 * LÓGICA DE BOTONES:
 * - Si terminó: deshabilitar start y pause
 * - Si corriendo: deshabilitar start, habilitar pause
 * - Si pausado: habilitar start, deshabilitar pause
 *
 * COMPLEJIDAD: O(1)
 */
function updateUI() {
    // Actualizar estadísticas en el DOM
    document.getElementById('generation').textContent = game.generation;
    document.getElementById('aliveCells').textContent = game.aliveCells;
    document.getElementById('speed').textContent = speed;

    // Obtener referencias a botones
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');

    // Actualizar estado de botones según estado del juego
    if (game.hasEnded) {
        // Juego terminado: deshabilitar ambos botones
        startBtn.disabled = true;
        pauseBtn.disabled = true;
    } else {
        // Juego activo:
        // - Deshabilitar start si está corriendo
        // - Deshabilitar pause si está pausado
        startBtn.disabled = isRunning;
        pauseBtn.disabled = !isRunning;
    }
}

/**
 * ----------------------------------------------------------------------------
 * FUNCIÓN: showEndMessage
 * ----------------------------------------------------------------------------
 *
 * Muestra un mensaje de finalización superpuesto en el canvas.
 *
 * @param {string} reason - Mensaje descriptivo (ej: "EXTINCIÓN - ...")
 *
 * COMPLEJIDAD: O(1)
 */
function showEndMessage(reason) {
    const endMessage = document.getElementById('endMessage');
    endMessage.textContent = reason;
    endMessage.classList.remove('hidden');
}

/**
 * ----------------------------------------------------------------------------
 * FUNCIÓN: hideEndMessage
 * ----------------------------------------------------------------------------
 *
 * Oculta el mensaje de finalización.
 *
 * COMPLEJIDAD: O(1)
 */
function hideEndMessage() {
    const endMessage = document.getElementById('endMessage');
    endMessage.classList.add('hidden');
}

/**
 * ============================================================================
 * SISTEMA DE CONTROLES
 * ============================================================================
 */

/**
 * ----------------------------------------------------------------------------
 * FUNCIÓN: setupControls
 * ----------------------------------------------------------------------------
 *
 * Configura todos los event listeners para controles de usuario.
 *
 * CONTROLES CONFIGURADOS:
 * 1. Botones de la interfaz (iniciar, pausar, aleatorio, limpiar, velocidad)
 * 2. Botones de patrones predefinidos
 * 3. Teclado (espacio, R, C, flechas)
 * 4. Mouse (click y arrastre para dibujar)
 * 5. Touch (soporte para dispositivos táctiles)
 *
 * EVENT LISTENERS vs INLINE HANDLERS:
 * Usamos addEventListener en lugar de onclick por:
 * - Permite múltiples listeners en el mismo elemento
 * - Mejor separación de responsabilidades (HTML vs JavaScript)
 * - Más fácil de mantener y testear
 *
 * COMPLEJIDAD: O(n) donde n = número de patrones
 */
function setupControls() {
    /**
     * ------------------------------------------------------------------------
     * BOTONES PRINCIPALES
     * ------------------------------------------------------------------------
     */

    // Botón INICIAR: inicia la simulación
    document.getElementById('startBtn').addEventListener('click', () => {
        if (!game.hasEnded) {
            isRunning = true;
            updateUI();
        }
    });

    // Botón PAUSAR: pausa la simulación
    document.getElementById('pauseBtn').addEventListener('click', () => {
        isRunning = false;
        updateUI();
    });

    // Botón ALEATORIO: genera configuración aleatoria
    document.getElementById('randomBtn').addEventListener('click', () => {
        game.randomize();
        hideEndMessage();
        render();
        updateUI();
    });

    // Botón LIMPIAR: borra todas las células
    document.getElementById('clearBtn').addEventListener('click', () => {
        game.clear();
        hideEndMessage();
        render();
        updateUI();
    });

    // Botón LENTO: reduce velocidad en 5 FPS
    document.getElementById('slowBtn').addEventListener('click', () => {
        speed = Math.max(MIN_SPEED, speed - 5);
        updateUI();
    });

    // Botón RÁPIDO: aumenta velocidad en 5 FPS
    document.getElementById('fastBtn').addEventListener('click', () => {
        speed = Math.min(MAX_SPEED, speed + 5);
        updateUI();
    });

    /**
     * ------------------------------------------------------------------------
     * BOTONES DE PATRONES PREDEFINIDOS
     * ------------------------------------------------------------------------
     * Configura event listener para cada botón de patrón.
     * Los botones tienen atributo data-pattern con el nombre del patrón.
     */
    document.querySelectorAll('.pattern-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Obtener nombre del patrón del atributo data
            const patternName = btn.getAttribute('data-pattern');

            // Cargar patrón en el juego
            game.loadPattern(patternName);

            // Limpiar UI
            hideEndMessage();
            render();
            updateUI();
        });
    });

    /**
     * ------------------------------------------------------------------------
     * CONTROLES DE TECLADO
     * ------------------------------------------------------------------------
     */
    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case ' ':  // Barra espaciadora: pausar/reanudar
                e.preventDefault();  // Evitar scroll de página
                if (!game.hasEnded) {
                    isRunning = !isRunning;  // Toggle
                    updateUI();
                }
                break;

            case 'r':  // R: patrón aleatorio
            case 'R':
                game.randomize();
                hideEndMessage();
                render();
                updateUI();
                break;

            case 'c':  // C: limpiar
            case 'C':
                game.clear();
                hideEndMessage();
                render();
                updateUI();
                break;

            case 'ArrowUp':  // Flecha arriba: más rápido
                e.preventDefault();  // Evitar scroll
                speed = Math.min(MAX_SPEED, speed + 5);
                updateUI();
                break;

            case 'ArrowDown':  // Flecha abajo: más lento
                e.preventDefault();  // Evitar scroll
                speed = Math.max(MIN_SPEED, speed - 5);
                updateUI();
                break;
        }
    });

    /**
     * ------------------------------------------------------------------------
     * CONTROLES DE MOUSE - DIBUJO MANUAL
     * ------------------------------------------------------------------------
     * Permite al usuario dibujar células clickeando y arrastrando sobre el canvas.
     */
    const canvas = document.getElementById('glCanvas');

    // Mouse down: iniciar dibujo
    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        drawAtPosition(e);
    });

    // Mouse move: continuar dibujando si el botón está presionado
    canvas.addEventListener('mousemove', (e) => {
        if (isDrawing) {
            drawAtPosition(e);
        }
    });

    // Mouse up: terminar dibujo
    canvas.addEventListener('mouseup', () => {
        isDrawing = false;
        game.reset();  // Resetear estadísticas
        hideEndMessage();
        updateUI();
    });

    // Mouse leave: terminar dibujo si el mouse sale del canvas
    canvas.addEventListener('mouseleave', () => {
        isDrawing = false;
    });

    /**
     * ------------------------------------------------------------------------
     * SOPORTE PARA DISPOSITIVOS TÁCTILES
     * ------------------------------------------------------------------------
     */

    // Touch start: iniciar dibujo
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();  // Evitar scroll/zoom
        isDrawing = true;
        drawAtPosition(e.touches[0]);  // Primer dedo
    });

    // Touch move: continuar dibujando
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (isDrawing) {
            drawAtPosition(e.touches[0]);
        }
    });

    // Touch end: terminar dibujo
    canvas.addEventListener('touchend', () => {
        isDrawing = false;
        game.reset();
        hideEndMessage();
        updateUI();
    });
}

/**
 * ----------------------------------------------------------------------------
 * FUNCIÓN: drawAtPosition
 * ----------------------------------------------------------------------------
 *
 * Dibuja una célula viva en la posición del mouse/touch.
 *
 * CONVERSIÓN DE COORDENADAS:
 * 1. Coordenadas del evento (e.clientX, e.clientY) están en píxeles de página
 * 2. Restar offset del canvas para obtener coordenadas relativas al canvas
 * 3. Escalar a coordenadas de la cuadrícula (0 a GRID_SIZE-1)
 * 4. Invertir eje Y (canvas usa origen arriba, OpenGL usa origen abajo)
 *
 * @param {MouseEvent|Touch} e - Evento de mouse o touch
 *
 * EJEMPLO:
 * - Canvas 512x512 en pantalla
 * - Click en (256, 128) píxeles del canvas
 * - Escalar: x = 256/512*512 = 256, y = 128/512*512 = 128
 * - Invertir Y: glY = 512 - 1 - 128 = 383
 * - Dibujar célula en (256, 383)
 *
 * COMPLEJIDAD: O(n) donde n = GRID_SIZE² (por drawCell que lee/escribe textura)
 */
function drawAtPosition(e) {
    const canvas = document.getElementById('glCanvas');

    // Obtener rectángulo del canvas en la página
    // Incluye posición, ancho y alto
    const rect = canvas.getBoundingClientRect();

    /**
     * Calcular coordenadas relativas al canvas (0 a ancho/alto del canvas)
     * clientX/Y = posición en la página
     * rect.left/top = posición del canvas en la página
     * rect.width/height = dimensiones renderizadas del canvas
     */
    const x = Math.floor((e.clientX - rect.left) / rect.width * GRID_SIZE);
    const y = Math.floor((e.clientY - rect.top) / rect.height * GRID_SIZE);

    /**
     * Invertir eje Y porque:
     * - Canvas HTML usa origen en esquina superior izquierda (Y aumenta hacia abajo)
     * - OpenGL/WebGL usa origen en esquina inferior izquierda (Y aumenta hacia arriba)
     */
    const glY = GRID_SIZE - 1 - y;

    // Verificar que la coordenada está dentro de los límites
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
        // Dibujar célula viva
        game.drawCell(x, glY, true);

        // Renderizar para mostrar el cambio inmediatamente
        render();
    }
}

/**
 * ============================================================================
 * SISTEMA DE PREVISUALIZACIÓN DE PATRONES
 * ============================================================================
 *
 * Cada botón de patrón tiene un mini-canvas que muestra una animación
 * del patrón en tiempo real. Estos usan Canvas 2D (no WebGL) por simplicidad.
 */

/**
 * ----------------------------------------------------------------------------
 * CLASE: PatternPreview
 * ----------------------------------------------------------------------------
 *
 * Implementa un simulador independiente del Juego de la Vida en Canvas 2D.
 *
 * DIFERENCIAS CON EL SIMULADOR PRINCIPAL:
 * - Usa Canvas 2D en lugar de WebGL (más simple, menos rendimiento)
 * - Cuadrícula pequeña (20x20 vs 512x512)
 * - Actualización lenta (500ms vs variable)
 * - Sin detección de finalización (cicla infinitamente)
 *
 * PROPÓSITO:
 * Dar al usuario una vista previa de cómo se comporta cada patrón antes
 * de cargarlo en el simulador principal.
 *
 * ARQUITECTURA:
 * - Cada preview mantiene su propio grid 2D
 * - Implementa reglas de Conway en JavaScript puro
 * - Se anima independientemente del simulador principal
 */
class PatternPreview {
    /**
     * Constructor de PatternPreview
     *
     * @param {HTMLCanvasElement} canvas - Canvas donde se dibujará
     * @param {string} patternName - Nombre del patrón a previsualizar
     */
    constructor(canvas, patternName) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.patternName = patternName;

        // Tamaño de la cuadrícula interna (20x20 = 400 células)
        this.gridSize = 20;

        // Tamaño de cada célula en píxeles (canvas 60x60 / grid 20x20 = 3px)
        this.cellSize = canvas.width / this.gridSize;

        // Obtener patrón de la tabla global PATTERNS
        this.pattern = PATTERNS[patternName];

        /**
         * Crear grids internos (arrays 2D)
         * grid: estado actual
         * nextGrid: estado siguiente (para técnica de doble buffer)
         */
        this.grid = [];
        this.nextGrid = [];
        for (let i = 0; i < this.gridSize; i++) {
            this.grid[i] = [];
            this.nextGrid[i] = [];
            for (let j = 0; j < this.gridSize; j++) {
                this.grid[i][j] = 0;      // 0 = muerta
                this.nextGrid[i][j] = 0;
            }
        }

        // Colocar patrón inicial en el centro
        this.initPattern();

        // Configuración de animación
        this.generation = 0;              // Contador de generaciones
        this.lastUpdate = 0;              // Timestamp de última actualización
        this.updateInterval = 500;        // Actualizar cada 500ms (2 FPS)
    }

    /**
     * ------------------------------------------------------------------------
     * MÉTODO: initPattern
     * ------------------------------------------------------------------------
     * Coloca el patrón en el centro de la cuadrícula.
     *
     * ALGORITMO:
     * 1. Limpiar grid
     * 2. Calcular bounding box del patrón
     * 3. Calcular offset para centrarlo
     * 4. Colocar cada célula del patrón
     * 5. Resetear contador de generaciones
     *
     * COMPLEJIDAD: O(g² + p) donde g=gridSize, p=tamaño del patrón
     */
    initPattern() {
        // Limpiar grid
        for (let i = 0; i < this.gridSize; i++) {
            for (let j = 0; j < this.gridSize; j++) {
                this.grid[i][j] = 0;
            }
        }

        // Calcular bounding box
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        for (const [x, y] of this.pattern) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }

        // Dimensiones del patrón
        const patternWidth = maxX - minX;
        const patternHeight = maxY - minY;

        // Centro de la cuadrícula
        const centerX = Math.floor(this.gridSize / 2);
        const centerY = Math.floor(this.gridSize / 2);

        // Colocar patrón centrado
        for (const [px, py] of this.pattern) {
            const x = centerX + px - Math.floor(patternWidth / 2);
            const y = centerY + py - Math.floor(patternHeight / 2);

            if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
                this.grid[y][x] = 1;  // 1 = viva
            }
        }

        this.generation = 0;
    }

    /**
     * ------------------------------------------------------------------------
     * MÉTODO: countNeighbors
     * ------------------------------------------------------------------------
     * Cuenta los vecinos vivos de una célula (vecindario de Moore).
     *
     * VECINDARIO DE MOORE (8 vecinos):
     *   (x-1,y-1)  (x,y-1)  (x+1,y-1)
     *   (x-1,y  )  (AQUÍ)   (x+1,y  )
     *   (x-1,y+1)  (x,y+1)  (x+1,y+1)
     *
     * BORDES TOROIDALES:
     * Usa operador módulo (%) para envolver coordenadas.
     * Ejemplo: x=-1 → x=(−1+20)%20=19 (borde derecho)
     *
     * @param {number} x - Coordenada X de la célula
     * @param {number} y - Coordenada Y de la célula
     * @returns {number} Número de vecinos vivos (0-8)
     *
     * COMPLEJIDAD: O(1) - siempre 8 vecinos
     */
    countNeighbors(x, y) {
        let count = 0;

        // Iterar sobre los 8 vecinos
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                // Saltar la célula central
                if (dx === 0 && dy === 0) continue;

                // Calcular coordenadas con bordes toroidales
                // (x + dx + gridSize) % gridSize maneja correctamente negativos
                const nx = (x + dx + this.gridSize) % this.gridSize;
                const ny = (y + dy + this.gridSize) % this.gridSize;

                // Sumar estado del vecino (0 o 1)
                count += this.grid[ny][nx];
            }
        }

        return count;
    }

    /**
     * ------------------------------------------------------------------------
     * MÉTODO: update
     * ------------------------------------------------------------------------
     * Calcula la siguiente generación del Juego de la Vida.
     *
     * ALGORITMO:
     * 1. Para cada célula en el grid:
     *    a) Contar vecinos vivos
     *    b) Aplicar reglas de Conway
     *    c) Escribir nuevo estado en nextGrid
     * 2. Intercambiar grids (nextGrid → grid)
     * 3. Incrementar contador de generaciones
     * 4. Si llegó al período conocido, reiniciar
     *
     * REGLAS DE CONWAY (implementadas en código):
     * - Célula viva con 2 o 3 vecinos → sobrevive
     * - Célula muerta con 3 vecinos → nace
     * - Cualquier otro caso → muere o permanece muerta
     *
     * RESETEO AUTOMÁTICO:
     * Cada patrón tiene un período conocido. Después de ese número de
     * generaciones, se resetea para crear un bucle infinito.
     *
     * COMPLEJIDAD: O(g²) donde g=gridSize (20x20=400 operaciones)
     */
    update() {
        // Calcular siguiente generación
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                // Contar vecinos vivos
                const neighbors = this.countNeighbors(x, y);

                // Estado actual de esta célula
                const current = this.grid[y][x];

                // Aplicar reglas de Conway
                if (current === 1) {
                    // Célula viva: sobrevive con 2 o 3 vecinos
                    this.nextGrid[y][x] = (neighbors === 2 || neighbors === 3) ? 1 : 0;
                } else {
                    // Célula muerta: nace con exactamente 3 vecinos
                    this.nextGrid[y][x] = (neighbors === 3) ? 1 : 0;
                }
            }
        }

        // Intercambiar grids (doble buffer)
        // Destructuring assignment de ES6 para swap elegante
        [this.grid, this.nextGrid] = [this.nextGrid, this.grid];

        // Incrementar contador
        this.generation++;

        /**
         * Tabla de períodos conocidos para cada patrón
         * Después de estas generaciones, el patrón vuelve al estado inicial
         */
        const resetGenerations = {
            // Vidas estáticas (nunca cambian)
            block: 1,
            beehive: 1,
            loaf: 1,
            boat: 1,
            tub: 1,

            // Osciladores (períodos conocidos)
            blinker: 2,
            toad: 2,
            beacon: 2,
            pulsar: 3,
            pentadecathlon: 15,

            // Naves espaciales (4 generaciones para ver el movimiento)
            glider: 4,
            lwss: 4,
            mwss: 4,
            hwss: 4
        };

        // Obtener período de este patrón (default 10 si no está en la tabla)
        const resetAt = resetGenerations[this.patternName] || 10;

        // Reiniciar si llegamos al período
        if (this.generation >= resetAt) {
            this.initPattern();
        }
    }

    /**
     * ------------------------------------------------------------------------
     * MÉTODO: draw
     * ------------------------------------------------------------------------
     * Dibuja el estado actual del grid en el canvas.
     *
     * RENDERIZADO:
     * - Negro (0,0,0) para células muertas
     * - Blanco (255,255,255) para células vivas
     * - Sin bordes entre células (aspecto sólido)
     *
     * CANVAS 2D API:
     * - fillStyle: establece el color de relleno
     * - fillRect(x, y, w, h): dibuja un rectángulo relleno
     *
     * COMPLEJIDAD: O(g²) donde g=gridSize
     */
    draw() {
        // Limpiar canvas (fondo negro)
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Dibujar células vivas (blancas)
        this.ctx.fillStyle = '#fff';
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.grid[y][x] === 1) {
                    // Calcular posición en píxeles
                    const px = x * this.cellSize;
                    const py = y * this.cellSize;

                    // Dibujar rectángulo
                    // Math.ceil asegura que no haya gaps entre células por redondeo
                    this.ctx.fillRect(
                        px,
                        py,
                        Math.ceil(this.cellSize),
                        Math.ceil(this.cellSize)
                    );
                }
            }
        }
    }

    /**
     * ------------------------------------------------------------------------
     * MÉTODO: animate
     * ------------------------------------------------------------------------
     * Método de animación llamado desde el bucle global.
     *
     * CONTROL DE VELOCIDAD:
     * Solo actualiza cada updateInterval milisegundos (500ms = 2 FPS).
     * Más lento que el simulador principal para mejor visibilidad.
     *
     * @param {number} timestamp - Tiempo actual en milisegundos
     *
     * COMPLEJIDAD: O(1) si no actualiza, O(g²) si actualiza
     */
    animate(timestamp) {
        // Verificar si pasó suficiente tiempo
        if (timestamp - this.lastUpdate >= this.updateInterval) {
            this.update();  // Calcular siguiente generación
            this.draw();    // Dibujar en el canvas
            this.lastUpdate = timestamp;
        }
    }
}

/**
 * ============================================================================
 * INICIALIZACIÓN DE PREVISUALIZACIONES
 * ============================================================================
 */

/**
 * Crear una instancia de PatternPreview para cada canvas de previsualización.
 * Los canvas tienen clase .pattern-preview y atributo data-pattern-name.
 */
const previews = [];
document.querySelectorAll('.pattern-preview').forEach(canvas => {
    const patternName = canvas.getAttribute('data-pattern-name');
    const preview = new PatternPreview(canvas, patternName);

    // Dibujar estado inicial
    preview.draw();

    // Agregar a la lista de previews para animar
    previews.push(preview);
});

/**
 * Bucle de animación para todas las previsualizaciones.
 * Se ejecuta independientemente del bucle principal del simulador.
 *
 * @param {number} timestamp - Tiempo actual en milisegundos
 */
function animatePreviews(timestamp) {
    // Animar cada preview
    previews.forEach(preview => preview.animate(timestamp));

    // Solicitar siguiente frame
    requestAnimationFrame(animatePreviews);
}

// Iniciar bucle de previsualizaciones
requestAnimationFrame(animatePreviews);

/**
 * ============================================================================
 * INICIAR BUCLE DE ANIMACIÓN PRINCIPAL
 * ============================================================================
 *
 * Solicitar el primer frame de animación.
 * Esto inicia el bucle infinito de animate().
 */
requestAnimationFrame(animate);
