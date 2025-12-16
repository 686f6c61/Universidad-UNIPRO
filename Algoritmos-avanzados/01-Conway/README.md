# Juego de la Vida de Conway

Simulador del autómata celular de Conway implementado con WebGL para procesamiento en GPU.

![Presentación](assets/01%20presentacion.png)

## Descripción

Este proyecto es una implementación del Juego de la Vida de Conway que utiliza la GPU mediante WebGL para calcular generaciones de forma paralela y eficiente. Permite simular hasta 262,144 células (512×512) en tiempo real con detección automática de estados finales.

## Características

Este simulador incluye múltiples funcionalidades que aprovechan el poder de la GPU para ofrecer una experiencia fluida e interactiva.

- **Procesamiento GPU**: Los cálculos se ejecutan en paralelo mediante shaders GLSL
- **Técnica ping-pong**: Doble buffer con dos texturas para evitar condiciones de carrera
- **Bordes toroidales**: Los bordes están conectados formando una superficie toroidal
- **Velocidad ajustable**: De 1 a 60 generaciones por segundo
- **Dibujo interactivo**: Click y arrastre para crear patrones personalizados
- **14 patrones clásicos**: Incluye vidas estáticas, osciladores y naves espaciales
- **Detección automática**: Identifica extinción, estados estables y bucles periódicos

![Patrones](assets/02%20patrones.png)

## Reglas de Conway

El autómata celular funciona con cuatro reglas simples que determinan si una célula vive o muere en cada generación.

1. Una célula viva con 2 o 3 vecinos vivos sobrevive
2. Una célula viva con menos de 2 vecinos muere por subpoblación
3. Una célula viva con más de 3 vecinos muere por sobrepoblación
4. Una célula muerta con exactamente 3 vecinos vivos revive

## Controles

El simulador ofrece múltiples formas de interactuar con la simulación mediante teclado, ratón y botones en la interfaz.

### Teclado

Atajos rápidos para controlar la simulación sin usar el ratón.

- **Espacio**: Pausar/Reanudar simulación
- **R**: Generar patrón aleatorio
- **C**: Limpiar cuadrícula
- **↑ / ↓**: Aumentar/Disminuir velocidad

### Ratón

Interacción directa con el canvas para crear patrones personalizados.

- **Click y arrastre**: Dibujar células vivas en el canvas

### Interfaz

Controles visuales accesibles mediante botones en la página.

- Botones de control (Iniciar, Pausar, Aleatorio, Limpiar)
- Ajuste de velocidad (Lento, Rápido)
- Selección de patrones predefinidos

## Patrones incluidos

El simulador incluye 14 patrones clásicos documentados en la literatura del Juego de la Vida, organizados en tres categorías según su comportamiento.

### Vidas estáticas

Configuraciones estables que permanecen sin cambios generación tras generación.

- Bloque, Colmena de abejas, Pan, Bote, Bañera

### Osciladores

Patrones que alternan entre dos o más estados de forma periódica.

- Intermitente (período 2)
- Sapo (período 2)
- Faro (período 2)
- Púlsar (período 3)
- Pentadecatlón (período 15)

### Naves espaciales

Patrones que se trasladan por la cuadrícula manteniendo su forma mientras se desplazan.

- Planeador
- Nave espacial ligera (LWSS)
- Nave espacial de peso medio (MWSS)
- Nave espacial pesada (HWSS)

## Tecnología

El proyecto está construido con tecnologías web modernas que permiten aprovechar la GPU para cálculos paralelos sin dependencias externas.

### Arquitectura

Las tecnologías clave utilizadas para lograr alto rendimiento en el navegador.

- **WebGL**: Renderizado y cómputo en GPU
- **GLSL ES**: Shaders para implementar las reglas de Conway
- **Canvas 2D**: Previsualizaciones animadas de patrones
- **JavaScript vanilla**: Sin dependencias externas

### Archivos

El código está organizado en cinco archivos principales que separan responsabilidades de forma clara.

- `index.html`: Estructura y documentación
- `styles.css`: Estilos minimalistas en blanco y negro
- `main.js`: Inicialización WebGL, loop de animación, controles
- `game.js`: Clase GameOfLife con manejo de estado y patrones
- `shaders.js`: Vertex shader, compute shader y display shader

![Documentación](assets/03%20dpcumentacion.png)

## Implementación

Esta sección detalla los aspectos técnicos de la implementación, incluyendo el algoritmo matemático, la técnica de doble buffer y la detección de estados finales.

### Algoritmo usado

La evolución del sistema se basa en operaciones matemáticas sobre el vecindario de Moore de cada célula.

El estado de cada célula se calcula mediante:

```
N(i,j,t) = Σ C(i+di, j+dj, t) para (di,dj) ∈ {-1,0,1}² \ {(0,0)}

C(i,j,t+1) = (N(i,j,t) = 3) ∨ (C(i,j,t) ∧ N(i,j,t) = 2)
```

Donde:
- `C(i,j,t)` = estado de la célula en posición (i,j) en el tiempo t
- `N(i,j,t)` = número de vecinos vivos (vecindario de Moore)

### Técnica ping-pong

Para evitar condiciones de carrera al actualizar todas las células simultáneamente, se emplea un sistema de doble buffer.

Se utilizan dos texturas que intercambian roles en cada generación:

1. El shader lee el estado actual desde la textura A
2. Calcula el nuevo estado aplicando las reglas de Conway
3. Escribe el resultado en la textura B mediante un framebuffer
4. Las texturas intercambian roles: A ↔ B
5. Se repite el proceso para la siguiente generación

Esto evita condiciones de carrera al mantener el estado anterior completo mientras se calcula el siguiente.

### Detección de finalización

El sistema monitoriza automáticamente la evolución del juego para identificar cuándo se ha alcanzado un estado terminal.

El simulador detecta tres tipos de estados finales:

- **Extinción**: Todas las células mueren (0 células vivas)
- **Estado estable**: El patrón no cambia entre generaciones
- **Bucle periódico**: El patrón se repite cada N generaciones (detecta períodos 2-10)

La detección se realiza mediante hashing del estado y comparación con un historial de las últimas 10 generaciones.

## Uso

Instrucciones rápidas para comenzar a usar el simulador en tu navegador local.

1. Abre `index.html` en un navegador moderno con soporte WebGL
2. Selecciona un patrón predefinido o dibuja uno personalizado
3. Presiona "Iniciar" o la barra espaciadora
4. Ajusta la velocidad según necesites
5. Observa la evolución del sistema celular

## Requisitos

Este proyecto es completamente autónomo y solo requiere un navegador moderno para ejecutarse.

- Navegador con soporte WebGL (Chrome, Firefox, Safari, Edge)
- No requiere servidor web (puede ejecutarse localmente)
- No tiene dependencias externas

## Créditos

Proyecto educativo desarrollado para el curso de Algoritmos Avanzados - UNIPRO - 2025

El Juego de la Vida fue creado por John Horton Conway en 1970.
