# Programación en Windows: Tamaño de Ficheros

## Descripción

Actividad académica de Sistemas Operativos Avanzados (UNIPRO) que demuestra el uso de la API de Windows para gestión de archivos mediante programación en C y automatización con PowerShell.

## Competencias Desarrolladas

- Aplicación de conocimientos básicos de programación en C utilizando la API de Windows
- Uso de llamadas al sistema para gestionar ficheros y directorios en entornos Windows
- Automatización de tareas mediante scripts de PowerShell
- Comprensión del proceso de compilación y ejecución de programas en Windows
- Capacidad para documentar y explicar soluciones técnicas de forma clara y precisa

## Objetivos

Demostrar los conocimientos adquiridos en el manejo del intérprete de órdenes y las llamadas al sistema de Windows mediante:

1. Un programa en C que liste archivos del directorio actual con sus tamaños
2. Un script de PowerShell que ejecute el programa y analice los resultados

## Estructura del Proyecto

```
SOA/
├── lista_size.c      # Programa en C para listar archivos y tamaños
├── tamanos.ps1       # Script de PowerShell para análisis de resultados
└── README.md         # Este archivo
```

## Programa: lista_size.c

### Funcionalidad

Programa escrito en C que utiliza la API de Windows para:
- Obtener la lista de ficheros del directorio actual
- Escribir cada nombre de archivo seguido de su tamaño en `C:\tmp\lista_sz`
- Incluye control completo de errores

### Características Técnicas

- Utiliza funciones de la API de Windows:
  - `CreateDirectoryA()` - Crear directorio de salida
  - `CreateFileA()` - Crear/abrir archivo de salida
  - `FindFirstFileA()` / `FindNextFileA()` - Enumerar archivos
  - `WriteFile()` - Escribir datos
  - `CloseHandle()` / `FindClose()` - Liberar recursos

- Control de errores mediante:
  - Verificación de valores de retorno
  - Uso de `GetLastError()` para diagnóstico
  - Mensajes descriptivos de error

- Formato de salida: `nombre_archivo\ttamaño_en_bytes\r\n`

### Compilación

**¿Cómo se compila este programa para dar lugar al ejecutable lista_size.exe?**

Utilizando el compilador de Microsoft Visual C++ (MSVC):

```cmd
cl lista_size.c
```

O con MinGW-w64 en Windows:

```cmd
gcc lista_size.c -o lista_size.exe
```

Opciones adicionales recomendadas:

```cmd
# Con MSVC (optimización y advertencias)
cl /O2 /W4 lista_size.c

# Con GCC (optimización y advertencias)
gcc -O2 -Wall -Wextra lista_size.c -o lista_size.exe
```

## Script: tamanos.ps1

### Funcionalidad

Script de PowerShell que automatiza la ejecución y análisis:
1. Ejecuta `lista_size.exe`
2. Lee el archivo `C:\tmp\lista_sz` generado
3. Calcula y muestra:
   - Espacio total ocupado por el directorio
   - Archivo más grande
   - Archivo más pequeño

### Características Técnicas

- Configuración de encoding UTF-8
- Manejo estricto de errores (`$ErrorActionPreference = "Stop"`)
- Validación de existencia del ejecutable
- Procesamiento de salida con formato tabular
- Cálculo de estadísticas mediante cmdlets de PowerShell

### Ejecución

**¿Cómo se compila y ejecuta este script de PowerShell?**

PowerShell es un lenguaje interpretado, por lo que **no requiere compilación**. Para ejecutarlo:

#### Opción 1: Ejecución Directa

```powershell
.\tamanos.ps1
```

#### Opción 2: Con PowerShell Explícito

```powershell
powershell -ExecutionPolicy Bypass -File tamanos.ps1
```

#### Nota sobre Políticas de Ejecución

Si aparece un error de política de ejecución, modificar temporalmente:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\tamanos.ps1
```

Para restaurar la política original:

```powershell
Set-ExecutionPolicy -ExecutionPolicy Restricted -Scope CurrentUser
```

## Uso Completo

### Paso 1: Compilar el programa en C

```cmd
cl lista_size.c
```

Esto generará `lista_size.exe` en el directorio actual.

### Paso 2: Ejecutar el script de PowerShell

```powershell
.\tamanos.ps1
```

### Resultado Esperado

```
Ejecutando lista_size.exe...
Lista de archivos generada exitosamente en C:\tmp\lista_sz

Leyendo archivo de salida...

========================================
RESULTADOS DEL ANALISIS
========================================
Espacio total ocupado: 7198 bytes
Archivo mas grande: lista_size.c (3905 bytes)
Archivo mas pequeno: tamanos.ps1 (3293 bytes)
========================================
```

## Control de Errores

Ambos programas incluyen gestión completa de errores:

### En lista_size.c:
- Error al crear directorio C:\tmp
- Error al crear archivo de salida
- Error al buscar archivos
- Error al escribir en el archivo
- Error en formateo de cadenas

### En tamanos.ps1:
- Ejecutable no encontrado
- Error en la ejecución del programa
- Archivo de salida no generado
- Error al procesar el archivo
- Listado vacío

## Requisitos del Sistema

- Sistema Operativo: Windows (cualquier versión moderna)
- Compilador: Microsoft Visual C++ (cl.exe) o MinGW-w64 (gcc)
- PowerShell: Versión 5.1 o superior
- Permisos: Escritura en C:\tmp

