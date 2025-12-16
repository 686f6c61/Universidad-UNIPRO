<#
.SYNOPSIS
    Script que ejecuta lista_size.exe y analiza los resultados

.DESCRIPTION
    Este script ejecuta el programa lista_size.exe para generar un listado
    de archivos del directorio actual con sus tamanos en C:\tmp\lista_sz,
    luego lee ese archivo y calcula:
    - Espacio total ocupado por el directorio
    - Archivo mas grande
    - Archivo mas pequeno

.AUTHOR
    Rafael Benitez - UNIPRO - Sistemas Operativos Avanzados
#>

# Configurar la salida de consola para UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Configuración de errores estricta
$ErrorActionPreference = "Stop"

# Ruta al ejecutable lista_size.exe (en el mismo directorio que el script)
$exePath = Join-Path $PSScriptRoot "lista_size.exe"
$outputFile = "C:\tmp\lista_sz"

# Verificar que existe el ejecutable
if (-not (Test-Path $exePath)) {
    Write-Error "No se encuentra el ejecutable: $exePath"
    exit 1
}

# Ejecutar lista_size.exe
Write-Host "Ejecutando lista_size.exe..." -ForegroundColor Green
try {
    $process = Start-Process -FilePath $exePath -NoNewWindow -Wait -PassThru
    if ($process.ExitCode -ne 0) {
        Write-Error "lista_size.exe termino con codigo de error: $($process.ExitCode)"
        exit 1
    }
}
catch {
    Write-Error "Error al ejecutar lista_size.exe: $_"
    exit 1
}

# Verificar que se generó el archivo de salida
if (-not (Test-Path $outputFile)) {
    Write-Error "No se genero el archivo de salida: $outputFile"
    exit 1
}

# Leer y procesar el archivo
Write-Host "`nLeyendo archivo de salida..." -ForegroundColor Green
try {
    $files = @()
    $lines = Get-Content $outputFile

    foreach ($line in $lines) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        # Separar nombre y tamano (formato: nombre\ttamano)
        $parts = $line -split "`t"
        if ($parts.Count -eq 2) {
            $files += [PSCustomObject]@{
                Nombre = $parts[0].Trim()
                Tamano = [int64]$parts[1].Trim()
            }
        }
    }

    if ($files.Count -eq 0) {
        Write-Error "No se encontraron archivos en el listado"
        exit 1
    }

    # Calcular estadísticas
    $totalBytes = ($files | Measure-Object -Property Tamano -Sum).Sum
    $archivoMasGrande = $files | Sort-Object -Property Tamano -Descending | Select-Object -First 1
    $archivoMasPequeno = $files | Sort-Object -Property Tamano | Select-Object -First 1

    # Mostrar resultados
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "RESULTADOS DEL ANALISIS" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Espacio total ocupado: $totalBytes bytes" -ForegroundColor Yellow
    Write-Host "Archivo mas grande: $($archivoMasGrande.Nombre) ($($archivoMasGrande.Tamano) bytes)" -ForegroundColor Yellow
    Write-Host "Archivo mas pequeno: $($archivoMasPequeno.Nombre) ($($archivoMasPequeno.Tamano) bytes)" -ForegroundColor Yellow
    Write-Host "========================================`n" -ForegroundColor Cyan
}
catch {
    Write-Error "Error al procesar el archivo de salida: $_"
    exit 1
}
