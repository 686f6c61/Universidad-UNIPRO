#include <windows.h>
#include <stdio.h>
#include <stdlib.h>

#define OUTPUT_FILE "C:\\tmp\\lista_sz"
#define BUFFER_SIZE 512

/*
 * Autor: Rafael Benitez - UNIPRO - Sistemas Operativos Avanzados
 * Programa: lista_size.c
 * Objetivo: Enumerar los ficheros del directorio actual y escribir
 *           su nombre y tamano en C:\tmp\lista_sz usando la API de Windows
 */

int main(int argc, char *argv[]) {
    WIN32_FIND_DATAA findFileData;
    HANDLE hFind = INVALID_HANDLE_VALUE;
    HANDLE hFile = INVALID_HANDLE_VALUE;
    DWORD dwBytesWritten = 0;
    char buffer[BUFFER_SIZE];
    int result = 0;
    DWORD dwError = 0;

    // Mostrar encabezado
    printf("========================================\n");
    printf("UNIPRO - SISTEMAS OPERATIVOS AVANZADOS\n");
    printf("Actividad 1\n");
    printf("========================================\n\n");

    // Crear el directorio C:\tmp si no existe
    if (!CreateDirectoryA("C:\\tmp", NULL)) {
        dwError = GetLastError();
        if (dwError != ERROR_ALREADY_EXISTS) {
            fprintf(stderr, "Error al crear el directorio C:\\tmp: %lu\n", dwError);
            return 1;
        }
    }

    // Abrir/crear el archivo de salida
    hFile = CreateFileA(
        OUTPUT_FILE,
        GENERIC_WRITE,
        0,
        NULL,
        CREATE_ALWAYS,
        FILE_ATTRIBUTE_NORMAL,
        NULL
    );

    if (hFile == INVALID_HANDLE_VALUE) {
        dwError = GetLastError();
        fprintf(stderr, "Error al crear el archivo %s: %lu\n", OUTPUT_FILE, dwError);
        return 1;
    }

    // Buscar archivos en el directorio actual
    hFind = FindFirstFileA("*", &findFileData);

    if (hFind == INVALID_HANDLE_VALUE) {
        dwError = GetLastError();
        fprintf(stderr, "Error al buscar archivos en el directorio actual: %lu\n", dwError);
        CloseHandle(hFile);
        return 1;
    }

    // Procesar cada archivo encontrado
    do {
        // Ignorar directorios (incluyendo . y ..)
        if (findFileData.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) {
            continue;
        }

        // Calcular el tamaño del archivo (combinar partes alta y baja)
        ULONGLONG fileSize = ((ULONGLONG)findFileData.nFileSizeHigh << 32) | findFileData.nFileSizeLow;

        // Formatear la línea de salida: nombre y tamaño
        int bytesFormatted = snprintf(buffer, BUFFER_SIZE, "%s\t%llu\r\n",
                                      findFileData.cFileName, fileSize);

        if (bytesFormatted < 0 || bytesFormatted >= BUFFER_SIZE) {
            fprintf(stderr, "Error al formatear la salida para el archivo: %s\n",
                    findFileData.cFileName);
            continue;
        }

        // Escribir en el archivo de salida
        if (!WriteFile(hFile, buffer, bytesFormatted, &dwBytesWritten, NULL)) {
            dwError = GetLastError();
            fprintf(stderr, "Error al escribir en el archivo de salida: %lu\n", dwError);
            result = 1;
            break;
        }

        if (dwBytesWritten != (DWORD)bytesFormatted) {
            fprintf(stderr, "Advertencia: No se escribieron todos los bytes para %s\n",
                    findFileData.cFileName);
        }

    } while (FindNextFileA(hFind, &findFileData) != 0);

    // Verificar si hubo error en la búsqueda
    dwError = GetLastError();
    if (dwError != ERROR_NO_MORE_FILES) {
        fprintf(stderr, "Error durante la enumeración de archivos: %lu\n", dwError);
        result = 1;
    }

    // Cerrar handles
    if (hFind != INVALID_HANDLE_VALUE) {
        FindClose(hFind);
    }

    if (hFile != INVALID_HANDLE_VALUE) {
        CloseHandle(hFile);
    }

    if (result == 0) {
        printf("Lista de archivos generada exitosamente en %s\n", OUTPUT_FILE);
    }

    return result;
}

