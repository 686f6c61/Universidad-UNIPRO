/**
 * ============================================================================
 * SHADERS PARA JUEGO DE LA VIDA DE CONWAY
 * ============================================================================
 *
 * Algoritmos Avanzados - UNIPRO - 2025
 *
 * Este archivo contiene los shaders GLSL (OpenGL Shading Language) que se
 * ejecutan en la GPU para calcular y renderizar el Juego de la Vida de Conway.
 *
 * CONCEPTOS CLAVE:
 * - Los shaders son programas que se ejecutan en paralelo en la GPU
 * - Cada pixel se procesa simultáneamente, logrando alto rendimiento
 * - WebGL utiliza GLSL ES (versión para sistemas embebidos)
 *
 * ESTRUCTURA:
 * 1. Vertex Shader: Transforma las coordenadas de los vértices
 * 2. Compute Shader: Calcula el siguiente estado del juego
 * 3. Display Shader: Renderiza el estado actual en pantalla
 * ============================================================================
 */

/**
 * ----------------------------------------------------------------------------
 * VERTEX SHADER
 * ----------------------------------------------------------------------------
 *
 * PROPÓSITO:
 * Procesa las coordenadas de los vértices de un quad (rectángulo) que cubre
 * toda la pantalla. Este quad es donde se renderizará el resultado.
 *
 * FLUJO DE DATOS:
 * 1. Recibe atributos (a_position, a_texCoord) desde JavaScript
 * 2. Pasa las coordenadas de textura al fragment shader mediante 'varying'
 * 3. Establece la posición final del vértice en gl_Position
 *
 * MATEMÁTICA:
 * - a_position está en coordenadas normalizadas [-1, 1] (NDC)
 * - gl_Position = vec4(x, y, z, w) donde w=1.0 para geometría 3D estándar
 * - Las coordenadas de textura van de [0, 1] en ambos ejes
 */
const vertexShaderSource = `
    // Atributo: posición del vértice en coordenadas de dispositivo normalizadas (NDC)
    // Valores típicos: (-1,-1) esquina inferior izquierda, (1,1) esquina superior derecha
    attribute vec2 a_position;

    // Atributo: coordenadas de textura (UV mapping)
    // (0,0) = esquina inferior izquierda de la textura
    // (1,1) = esquina superior derecha de la textura
    attribute vec2 a_texCoord;

    // Varying: variable que se interpola entre vértices y se pasa al fragment shader
    // Cada pixel recibirá una coordenada de textura interpolada
    varying vec2 v_texCoord;

    void main() {
        // Establecer la posición del vértice en el espacio de clip
        // vec4(x, y, z, w) - z=0 porque es 2D, w=1 para coordenadas homogéneas
        gl_Position = vec4(a_position, 0.0, 1.0);

        // Pasar las coordenadas de textura al fragment shader
        // Estas se interpolarán automáticamente para cada pixel
        v_texCoord = a_texCoord;
    }
`;

/**
 * ----------------------------------------------------------------------------
 * COMPUTE FRAGMENT SHADER
 * ----------------------------------------------------------------------------
 *
 * PROPÓSITO:
 * Implementa las reglas del Juego de la Vida de Conway calculando el estado
 * siguiente de cada célula basándose en su vecindario de Moore (8 vecinos).
 *
 * ALGORITMO:
 * 1. Para cada pixel (que representa una célula):
 *    a) Lee el estado de los 8 vecinos circundantes
 *    b) Cuenta cuántos vecinos están vivos
 *    c) Aplica las reglas de Conway para determinar el nuevo estado
 *
 * REGLAS DE CONWAY:
 * - Célula viva con 2 o 3 vecinos vivos → sobrevive
 * - Célula viva con <2 vecinos → muere (subpoblación)
 * - Célula viva con >3 vecinos → muere (sobrepoblación)
 * - Célula muerta con exactamente 3 vecinos → nace (reproducción)
 *
 * OPTIMIZACIONES GPU:
 * - Procesamiento paralelo: todas las células se calculan simultáneamente
 * - Acceso eficiente a texturas mediante cache de GPU
 * - Vecindario toroidal implementado con fract() (1 instrucción)
 *
 * COMPLEJIDAD:
 * - Por célula: O(1) - siempre 8 vecinos
 * - Total: O(n) donde n = número de células
 * - Pero ejecutado en paralelo, tiempo real ≈ O(1)
 */
const computeShaderSource = `
    // Precisión alta para cálculos con punto flotante
    // Necesaria para evitar artefactos visuales en texturas grandes
    precision highp float;

    // Uniform: textura que contiene el estado actual de todas las células
    // Cada pixel de la textura representa una célula (0=muerta, 1=viva)
    uniform sampler2D u_state;

    // Uniform: dimensiones de la textura (ancho, alto) en píxeles
    // Usado para calcular el tamaño de un pixel en coordenadas normalizadas
    uniform vec2 u_resolution;

    // Varying: coordenadas de textura interpoladas desde el vertex shader
    // Identifica qué célula estamos procesando actualmente
    varying vec2 v_texCoord;

    /**
     * Función auxiliar: obtiene el estado de una célula con offset
     *
     * PARÁMETROS:
     * @param offset - Desplazamiento relativo (dx, dy) desde la célula actual
     *                 Ejemplos: (-1, -1) = vecino diagonal superior izquierdo
     *                          (0, -1) = vecino directo arriba
     *
     * RETORNO:
     * @return float - Estado de la célula: 0.0 (muerta) o 1.0 (viva)
     *
     * IMPLEMENTACIÓN DE BORDES TOROIDALES:
     * - fract(coord) devuelve la parte fraccionaria, efectivamente haciendo
     *   que las coordenadas "envuelvan" al salirse del rango [0, 1]
     * - Ejemplo: coord=1.1 → fract(1.1)=0.1 (vuelve al inicio)
     * - Esto crea un toro topológico: el borde derecho conecta con el izquierdo
     */
    float getCell(vec2 offset) {
        // Calcular el tamaño de un pixel en coordenadas normalizadas [0, 1]
        // Si resolution = (512, 512), entonces pixel = (1/512, 1/512) ≈ (0.00195, 0.00195)
        vec2 pixel = vec2(1.0) / u_resolution;

        // Calcular la coordenada de textura del vecino
        // v_texCoord + offset * pixel mueve a la célula vecina
        vec2 coord = v_texCoord + offset * pixel;

        // Implementar bordes toroidales usando la función fract()
        // fract(x) = x - floor(x), devuelve solo la parte fraccionaria
        // Esto hace que coord "envuelva" al salirse del rango [0, 1]
        // Ejemplos: fract(1.2) = 0.2, fract(-0.1) = 0.9
        coord = fract(coord);

        // Muestrear la textura en la coordenada calculada
        // texture2D devuelve un vec4(r, g, b, a)
        // Como almacenamos el estado en todos los canales RGB, leemos .r
        vec4 cell = texture2D(u_state, coord);

        // Retornar el canal rojo: 0.0 = célula muerta, 1.0 = célula viva
        return cell.r;
    }

    /**
     * FUNCIÓN PRINCIPAL DEL COMPUTE SHADER
     *
     * Se ejecuta una vez por cada pixel (célula) de la textura
     * Calcula el nuevo estado basándose en el vecindario de Moore
     *
     * VECINDARIO DE MOORE:
     *   (-1,-1)  (0,-1)  (1,-1)
     *   (-1, 0)  (AQUÍ)  (1, 0)
     *   (-1, 1)  (0, 1)  (1, 1)
     */
    void main() {
        // PASO 1: Contar los 8 vecinos vivos
        // Se suman los estados (0.0 o 1.0) de todos los vecinos
        // Resultado: número flotante en el rango [0.0, 8.0]
        float neighbors =
            getCell(vec2(-1.0, -1.0)) +  // Vecino: arriba-izquierda
            getCell(vec2( 0.0, -1.0)) +  // Vecino: arriba
            getCell(vec2( 1.0, -1.0)) +  // Vecino: arriba-derecha
            getCell(vec2(-1.0,  0.0)) +  // Vecino: izquierda
            getCell(vec2( 1.0,  0.0)) +  // Vecino: derecha
            getCell(vec2(-1.0,  1.0)) +  // Vecino: abajo-izquierda
            getCell(vec2( 0.0,  1.0)) +  // Vecino: abajo
            getCell(vec2( 1.0,  1.0));   // Vecino: abajo-derecha

        // PASO 2: Obtener el estado actual de esta célula
        // getCell(vec2(0.0, 0.0)) lee la célula en la posición actual (sin offset)
        float currentState = getCell(vec2(0.0, 0.0));

        // PASO 3: Aplicar las reglas de Conway
        // Inicializar el nuevo estado como muerto (0.0)
        float newState = 0.0;

        // Comparación: currentState > 0.5 para evitar problemas con precisión flotante
        // Si guardáramos exactamente 1.0, podría leerse como 0.999999 por redondeo
        if (currentState > 0.5) {
            // CASO 1: La célula está actualmente VIVA

            // Regla de supervivencia: 2 o 3 vecinos vivos
            // - Con 2 vecinos: equilibrio perfecto, la célula sobrevive
            // - Con 3 vecinos: condiciones óptimas, sobrevive
            if (neighbors >= 2.0 && neighbors <= 3.0) {
                newState = 1.0; // La célula sobrevive
            }
            // Si tiene <2 vecinos: muere por subpoblación (soledad)
            // Si tiene >3 vecinos: muere por sobrepoblación (hacinamiento)
            // En ambos casos, newState permanece 0.0
        } else {
            // CASO 2: La célula está actualmente MUERTA

            // Regla de nacimiento: exactamente 3 vecinos vivos
            // Es el único caso donde una célula muerta cobra vida
            // Biológicamente: 3 "padres" crean nueva vida
            if (neighbors == 3.0) {
                newState = 1.0; // Nace una nueva célula
            }
            // Con cualquier otro número de vecinos, permanece muerta
        }

        // PASO 4: Escribir el resultado
        // gl_FragColor es la salida del fragment shader
        // Escribimos el nuevo estado en todos los canales RGB (vec4)
        // - R, G, B = newState (0.0 o 1.0)
        // - A = 1.0 (opacidad completa)
        // Esto se escribe en la textura de salida (framebuffer)
        gl_FragColor = vec4(newState, newState, newState, 1.0);
    }
`;

/**
 * ----------------------------------------------------------------------------
 * DISPLAY FRAGMENT SHADER
 * ----------------------------------------------------------------------------
 *
 * PROPÓSITO:
 * Renderiza el estado actual del juego en la pantalla.
 * Más simple que el compute shader: solo lee y muestra la textura.
 *
 * DIFERENCIA CON COMPUTE SHADER:
 * - Compute shader: procesa lógica del juego, escribe a framebuffer
 * - Display shader: solo visualiza, escribe a pantalla
 *
 * OPTIMIZACIÓN:
 * - Separar cómputo de visualización permite:
 *   1. Múltiples generaciones sin renderizar (para velocidades altas)
 *   2. Aplicar efectos visuales sin afectar la simulación
 *   3. Renderizar a diferentes resoluciones
 */
const displayShaderSource = `
    // Precisión alta para consistencia con compute shader
    precision highp float;

    // Uniform: textura con el estado actual que queremos mostrar
    // Esta es la misma textura que generó el compute shader
    uniform sampler2D u_state;

    // Varying: coordenadas de textura del pixel actual
    varying vec2 v_texCoord;

    /**
     * FUNCIÓN PRINCIPAL DEL DISPLAY SHADER
     *
     * Se ejecuta una vez por cada pixel de la pantalla
     * Simplemente lee la textura y la muestra
     */
    void main() {
        // Muestrear la textura en la coordenada actual
        // texture2D realiza filtrado bilinear automático si está configurado
        vec4 cell = texture2D(u_state, v_texCoord);

        // Extraer el valor del canal rojo (0.0=muerta, 1.0=viva)
        // En nuestra representación, R=G=B, así que da igual qué canal usar
        float value = cell.r;

        // Escribir el color final:
        // - Si value=0.0 → vec4(0,0,0,1) = negro (célula muerta)
        // - Si value=1.0 → vec4(1,1,1,1) = blanco (célula viva)
        // - Alpha siempre 1.0 (opacidad completa)
        gl_FragColor = vec4(value, value, value, 1.0);
    }
`;

/**
 * ----------------------------------------------------------------------------
 * EXPORTACIÓN DE MÓDULOS
 * ----------------------------------------------------------------------------
 *
 * Permite usar estos shaders tanto en navegador como en Node.js (para testing)
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        vertexShaderSource,
        computeShaderSource,
        displayShaderSource
    };
}
