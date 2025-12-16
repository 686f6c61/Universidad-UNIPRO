# Diseño evolutivo de un sistema de bases de datos

## Objetivos de la actividad

Para realizar esta actividad, tendrás que haber revisado los temas «Introducción a los diferentes sistemas de bases de datos», «Lenguaje XML», «Bases de datos para documentos XML», «Bases de datos paralelas» y «Bases de datos distribuidas» y los tests correspondientes a sus video clases.

Una vez realizada la actividad, habrás obtenido las siguientes competencias:

1. Transversales: CT1, CT4, CT5, CT8.
2. Específicas: CE1, CE5, CE7.

## Pautas de elaboración

Se deberá diseñar y evolucionar un sistema de bases de datos. Se debe comenzar por un modelo jerárquico simple y luego evolucionar sucesivamente hacia modelos más sofisticados (en red, relacional, paralelas y distribuidas). Finalmente, deberán desarrollar un esquema de integración mediante extensible markup language (XML) y document type definition (DTD) para el intercambio de datos vía application programming interface (API).

La actividad se contextualiza en una empresa tecnológica especializada en la gestión de flotas de transporte inteligente urbano, que ofrece servicios de movilidad bajo demanda. Esta empresa necesita evolucionar su sistema de gestión de datos para adaptarse a nuevas exigencias funcionales y técnicas, derivadas del crecimiento del negocio.

La actividad se dividirá en seis fases, cada una con sus propios objetivos y entregables. En cada fase se incrementará el nivel de complejidad y se exigirá decisiones de diseño argumentadas.

### Fase 1. Modelo jerárquico

- Objetivo: diseñar un sistema simple jerárquico para registrar autobuses y sus rutas fijas diarias.
- Entregable: diagrama jerárquico y descripción de nodos, niveles y relaciones padre-hijo.
- Restricciones: solo debe contemplarse una jerarquía unidireccional (empresa > flota > autobuses > rutas).

### Fase 2. Modelo en red

- Objetivo: ampliar el sistema para reflejar relaciones M:N (por ejemplo, conductores que manejan varios autobuses en distintos turnos).
- Entregable: diagrama en red (especificando nodos, conjuntos de registros y punteros), justificación de diseño.
- Requisito: inclusión de horarios, turnos y eventos de mantenimiento compartidos.

### Fase 3. Modelo relacional

- Objetivo: reorganizar el sistema usando un modelo relacional normalizado (hasta 3FN), que incorpore el registro de trayectos reales (con paradas, hora de paso, incidentes, etc.).
- Entregable:
  - Diccionario de datos con claves primarias y foráneas.
  - Diagrama entidad-relación (DER) y su equivalencia en tablas relacionales.
  - Scripts de creación SQL (DDL).

### Fase 4. Modelo de bases de datos paralelas

- Objetivo: adaptar el sistema relacional para operar sobre un entorno de BD paralelas (por ejemplo, análisis de tiempos de viaje y consumo energético por zona geográfica).
- Entregable:
  - Estrategia de particionado (por rango, hash o lista) y paralelismo.
  - Explicación del modelo de acceso concurrente.
  - Simulación de consultas paralelas con PostgreSQL o similar.

### Fase 5. Modelo distribuido

- Objetivo: rediseñar el sistema para operar en múltiples sedes (diferentes ciudades con sus propias flotas), conservando consistencia y disponibilidad.
- Entregable:
  - Esquema de fragmentación horizontal y vertical.
  - Protocolo de sincronización y replicación.
  - Estrategia de control de concurrencia distribuida.
  - Evaluación de técnicas CAP y diseño elegido.
