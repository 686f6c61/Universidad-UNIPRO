# Actividad 1: Diseño, análisis y comparación de algoritmos

**Asignatura:** Algoritmos Avanzados
**Universidad:** UNIPRO
**Bachelor:** Ingeniería Informática

---

## Competencias de la actividad

El objetivo principal de esta actividad es poner en práctica los conceptos fundamentales sobre el análisis de algoritmos recursivos, la técnica de divide y vencerás, y la programación dinámica. El alumno será capaz de:

- Aplicar los principios de análisis de complejidad a algoritmos recursivos simples y compuestos
- Diseñar e implementar soluciones mediante la estrategia divide y conquista para subproblemas de gran tamaño
- Desarrollar versiones equivalentes mediante programación dinámica maximizando la reutilización de sub resultados
- Comparar empíricamente las tres aproximaciones (recursiva directa, divide-y-conquista y programación dinámica) en términos de tiempo y memoria
- Comunicar los hallazgos de forma clara y estructurada, justificando cada elección de diseño

Durante esta actividad el estudiante adquirirá las siguientes competencias necesarias para el desarrollo de páginas web utilizando las tecnologías básicas HTML, CSS y JS:

- **CT1** - Competencia en comunicación, oral y escrita, como mínimo en la lengua propia y en inglés. Esta competencia incluye tanto la capacidad de análisis como síntesis del discurso
- **CT3** - Utilizar estrategias para prever y resolver problemas, conflictos y cambios en el campo profesional
- **CT4** - Competencia de gestión de la información, lo que implica saber adquirir capacidades de búsqueda, discriminación, gestión y uso de la información de forma autónoma en un entorno profesional
- **CT5** - Saber aplicar tanto el análisis como la síntesis para organizar y planificar su propio trabajo
- **CT6** - Ser capaz de utilizar y aplicar las tecnologías de la información a nivel académico y profesional con criterios éticos
- **CT8** - Saber aprender de forma autónoma, actualizarse y poder profundizar en conocimientos permanentemente
- **CE1** - Desarrollar y coordinar aplicaciones informáticas: análisis, especificaciones, desarrollo, integración e implementación
- **CE2** - Elaborar juegos de test y evaluar la calidad de la solución
- **CE6** - Resolver problemas matemáticos que puedan surgir en la ingeniería

---

## Requisitos académicos

Para la elaboración de esta actividad es necesario estudiar los **temas 1, 2 y 3**.

---

## Problema propuesto

Desarrollar tres algoritmos que calculen la subsecuencia común más larga (LCS) de dos cadenas:

### Versión A - Recursiva directa (sin memorización)

Implementación recursiva natural que explora todas las combinaciones posibles sin memorización.

### Versión B - Estrategia divide y conquista de Hirschberg

Algoritmo de Hirschberg que combina dividir y conquistar con programación dinámica.

### Versión C - Programación dinámica tabular

Construcción de tabla completa mediante enfoque ascendente (bottom-up).

---

## Pautas de elaboración

### Implementación

- **Lenguaje:** Libre; entrega el código fuente
- **Restricciones:** Sin usar librerías externas específicas de LCS
- **Requisito:** Tu proyecto debe compilarse/ejecutarse con un único comando (make, npm start, etc.)

### Experimentos

- Genera al menos cinco parejas de cadenas de longitud creciente (≥ 1000 símbolos la mayor)
- Mide tiempo de CPU y uso máximo de memoria para cada versión
- Presenta los resultados en tablas o gráficas (puedes emplear scripts propios)

---

## Estructura del proyecto

```
.
├── LCS_ACT_01.ipynb          # Notebook principal con implementación completa
├── README.md                  # Este archivo
├── lcs_results.json           # Resultados en formato JSON
├── lcs_results.csv            # Resultados en formato CSV
└── lcs_comparison.png         # Gráficas comparativas
```

---

## Ejecución

Para ejecutar el notebook de Jupyter:

```bash
# Opción 1: Google Colab (recomendado)
# Subir el archivo LCS_ACT_01.ipynb a Google Colab
# Runtime > Run all

# Opción 2: Jupyter local
jupyter notebook LCS_ACT_01.ipynb
# Ejecutar todas las celdas: Cell > Run All
```

---

**Universidad:** UNIPRO
**Asignatura:** Algoritmos Avanzados
**Actividad:** Diseño, análisis y comparación de algoritmos
