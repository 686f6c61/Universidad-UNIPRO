-- ============================================================================
-- Sistema de gestión de flotas de transporte urbano
-- Modelo relacional normalizado hasta 3FN
-- SGBD: PostgreSQL 12+
-- ============================================================================

-- Configuración inicial
SET client_encoding = 'UTF8';
SET timezone = 'Europe/Madrid';

-- Eliminar tablas si existen (para recreación limpia)
DROP TABLE IF EXISTS evento_mantenimiento CASCADE;
DROP TABLE IF EXISTS incidente CASCADE;
DROP TABLE IF EXISTS paso_parada CASCADE;
DROP TABLE IF EXISTS trayecto CASCADE;
DROP TABLE IF EXISTS ruta_parada CASCADE;
DROP TABLE IF EXISTS asignacion_conductor_turno CASCADE;
DROP TABLE IF EXISTS asignacion_conductor_autobus CASCADE;
DROP TABLE IF EXISTS turno CASCADE;
DROP TABLE IF EXISTS conductor CASCADE;
DROP TABLE IF EXISTS parada CASCADE;
DROP TABLE IF EXISTS ruta CASCADE;
DROP TABLE IF EXISTS autobus CASCADE;
DROP TABLE IF EXISTS flota CASCADE;
DROP TABLE IF EXISTS empresa CASCADE;

-- ============================================================================
-- CREACIÓN DE TABLAS
-- ============================================================================

-- Tabla: EMPRESA
CREATE TABLE empresa (
    id_empresa SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL
);

COMMENT ON TABLE empresa IS 'Almacena información de empresas de transporte';
COMMENT ON COLUMN empresa.codigo IS 'Código alfanumérico único de la empresa';

-- Tabla: FLOTA
CREATE TABLE flota (
    id_flota SERIAL PRIMARY KEY,
    id_empresa INTEGER NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    marca_comun VARCHAR(100) NOT NULL,
    anio_adquisicion INTEGER NOT NULL CHECK (anio_adquisicion >= 1950 AND anio_adquisicion <= EXTRACT(YEAR FROM CURRENT_DATE)),
    FOREIGN KEY (id_empresa) REFERENCES empresa(id_empresa) ON DELETE CASCADE
);

COMMENT ON TABLE flota IS 'Agrupaciones de autobuses con características homogéneas';

-- Tabla: AUTOBUS
CREATE TABLE autobus (
    id_autobus SERIAL PRIMARY KEY,
    id_flota INTEGER NOT NULL,
    matricula VARCHAR(20) UNIQUE NOT NULL,
    capacidad INTEGER NOT NULL CHECK (capacidad > 0 AND capacidad <= 300),
    consumo_medio DECIMAL(5,2) NOT NULL CHECK (consumo_medio > 0),
    FOREIGN KEY (id_flota) REFERENCES flota(id_flota) ON DELETE CASCADE
);

COMMENT ON TABLE autobus IS 'Vehículos individuales de la flota';
COMMENT ON COLUMN autobus.consumo_medio IS 'Consumo en litros por kilómetro';

-- Tabla: CONDUCTOR
CREATE TABLE conductor (
    id_conductor SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(200) NOT NULL,
    permisos_conduccion VARCHAR(10) NOT NULL CHECK (permisos_conduccion IN ('D', 'D+E', 'D1', 'D1+E')),
    antiguedad INTEGER NOT NULL CHECK (antiguedad >= 0)
);

COMMENT ON TABLE conductor IS 'Personal autorizado para operar autobuses';
COMMENT ON COLUMN conductor.antiguedad IS 'Años de experiencia en la empresa';

-- Tabla: TURNO
CREATE TABLE turno (
    id_turno SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    franja_horaria VARCHAR(50) NOT NULL,
    dia_semana VARCHAR(20) NOT NULL
);

COMMENT ON TABLE turno IS 'Franjas horarias de trabajo';
COMMENT ON COLUMN turno.dia_semana IS 'Días de la semana (L,M,X,J,V,S,D)';

-- Tabla: ASIGNACION_CONDUCTOR_AUTOBUS
CREATE TABLE asignacion_conductor_autobus (
    id_conductor INTEGER NOT NULL,
    id_autobus INTEGER NOT NULL,
    fecha_asignacion DATE NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (id_conductor, id_autobus),
    FOREIGN KEY (id_conductor) REFERENCES conductor(id_conductor) ON DELETE CASCADE,
    FOREIGN KEY (id_autobus) REFERENCES autobus(id_autobus) ON DELETE CASCADE
);

COMMENT ON TABLE asignacion_conductor_autobus IS 'Relación M:N entre conductores y autobuses autorizados';

-- Tabla: ASIGNACION_CONDUCTOR_TURNO
CREATE TABLE asignacion_conductor_turno (
    id_conductor INTEGER NOT NULL,
    id_turno INTEGER NOT NULL,
    fecha_asignacion DATE NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (id_conductor, id_turno),
    FOREIGN KEY (id_conductor) REFERENCES conductor(id_conductor) ON DELETE CASCADE,
    FOREIGN KEY (id_turno) REFERENCES turno(id_turno) ON DELETE CASCADE
);

COMMENT ON TABLE asignacion_conductor_turno IS 'Relación M:N entre conductores y turnos de trabajo';

-- Tabla: RUTA
CREATE TABLE ruta (
    id_ruta SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    num_paradas INTEGER NOT NULL CHECK (num_paradas > 0),
    longitud_km DECIMAL(6,2) NOT NULL CHECK (longitud_km > 0)
);

COMMENT ON TABLE ruta IS 'Trayectos predefinidos con paradas específicas';

-- Tabla: PARADA
CREATE TABLE parada (
    id_parada SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    calle VARCHAR(200) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    coord_lat DECIMAL(10,8) NOT NULL CHECK (coord_lat >= -90 AND coord_lat <= 90),
    coord_lon DECIMAL(11,8) NOT NULL CHECK (coord_lon >= -180 AND coord_lon <= 180)
);

COMMENT ON TABLE parada IS 'Puntos de recogida y descenso de pasajeros';
COMMENT ON COLUMN parada.coord_lat IS 'Latitud en formato decimal (WGS84)';
COMMENT ON COLUMN parada.coord_lon IS 'Longitud en formato decimal (WGS84)';

-- Tabla: RUTA_PARADA
CREATE TABLE ruta_parada (
    id_ruta INTEGER NOT NULL,
    id_parada INTEGER NOT NULL,
    orden INTEGER NOT NULL CHECK (orden > 0),
    PRIMARY KEY (id_ruta, id_parada),
    FOREIGN KEY (id_ruta) REFERENCES ruta(id_ruta) ON DELETE CASCADE,
    FOREIGN KEY (id_parada) REFERENCES parada(id_parada) ON DELETE CASCADE,
    UNIQUE (id_ruta, orden)
);

COMMENT ON TABLE ruta_parada IS 'Relación M:N entre rutas y paradas con orden específico';

-- Tabla: TRAYECTO
CREATE TABLE trayecto (
    id_trayecto SERIAL PRIMARY KEY,
    id_autobus INTEGER NOT NULL,
    id_ruta INTEGER NOT NULL,
    fecha_inicio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_fin TIMESTAMP NULL,
    FOREIGN KEY (id_autobus) REFERENCES autobus(id_autobus) ON DELETE RESTRICT,
    FOREIGN KEY (id_ruta) REFERENCES ruta(id_ruta) ON DELETE RESTRICT,
    CHECK (fecha_fin IS NULL OR fecha_fin > fecha_inicio)
);

COMMENT ON TABLE trayecto IS 'Registros de viajes reales realizados por autobuses';

-- Tabla: PASO_PARADA
CREATE TABLE paso_parada (
    id_paso SERIAL PRIMARY KEY,
    id_trayecto INTEGER NOT NULL,
    id_parada INTEGER NOT NULL,
    hora_estimada TIME NOT NULL,
    hora_real TIME NULL,
    observaciones TEXT NULL,
    FOREIGN KEY (id_trayecto) REFERENCES trayecto(id_trayecto) ON DELETE CASCADE,
    FOREIGN KEY (id_parada) REFERENCES parada(id_parada) ON DELETE RESTRICT,
    UNIQUE (id_trayecto, id_parada)
);

COMMENT ON TABLE paso_parada IS 'Registro del paso de trayectos por paradas con horarios reales';

-- Tabla: INCIDENTE
CREATE TABLE incidente (
    id_incidente SERIAL PRIMARY KEY,
    id_trayecto INTEGER NOT NULL,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    descripcion TEXT NOT NULL,
    gravedad VARCHAR(20) NOT NULL CHECK (gravedad IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
    tiempo_resolucion INTEGER NULL CHECK (tiempo_resolucion IS NULL OR tiempo_resolucion >= 0),
    FOREIGN KEY (id_trayecto) REFERENCES trayecto(id_trayecto) ON DELETE CASCADE
);

COMMENT ON TABLE incidente IS 'Eventos anómalos ocurridos durante trayectos';
COMMENT ON COLUMN incidente.tiempo_resolucion IS 'Tiempo de resolución en minutos';

-- Tabla: EVENTO_MANTENIMIENTO
CREATE TABLE evento_mantenimiento (
    id_evento SERIAL PRIMARY KEY,
    id_autobus INTEGER NOT NULL,
    fecha DATE NOT NULL,
    tipo_mantenimiento VARCHAR(20) NOT NULL CHECK (tipo_mantenimiento IN ('PREVENTIVO', 'CORRECTIVO')),
    tecnico_responsable VARCHAR(200) NULL,
    tiempo_resolucion INTEGER NULL CHECK (tiempo_resolucion IS NULL OR tiempo_resolucion > 0),
    FOREIGN KEY (id_autobus) REFERENCES autobus(id_autobus) ON DELETE CASCADE
);

COMMENT ON TABLE evento_mantenimiento IS 'Intervenciones técnicas sobre autobuses';
COMMENT ON COLUMN evento_mantenimiento.tiempo_resolucion IS 'Duración en minutos';

-- ============================================================================
-- CREACIÓN DE ÍNDICES
-- ============================================================================

CREATE INDEX idx_flota_empresa ON flota(id_empresa);
CREATE INDEX idx_autobus_flota ON autobus(id_flota);
CREATE INDEX idx_autobus_matricula ON autobus(matricula);
CREATE INDEX idx_asig_cond_auto_conductor ON asignacion_conductor_autobus(id_conductor);
CREATE INDEX idx_asig_cond_auto_autobus ON asignacion_conductor_autobus(id_autobus);
CREATE INDEX idx_asig_cond_turno_conductor ON asignacion_conductor_turno(id_conductor);
CREATE INDEX idx_asig_cond_turno_turno ON asignacion_conductor_turno(id_turno);
CREATE INDEX idx_ruta_codigo ON ruta(codigo);
CREATE INDEX idx_parada_codigo ON parada(codigo);
CREATE INDEX idx_parada_ciudad ON parada(ciudad);
CREATE INDEX idx_ruta_parada_ruta ON ruta_parada(id_ruta, orden);
CREATE INDEX idx_trayecto_autobus ON trayecto(id_autobus);
CREATE INDEX idx_trayecto_ruta ON trayecto(id_ruta);
CREATE INDEX idx_trayecto_fecha ON trayecto(fecha_inicio);
CREATE INDEX idx_paso_parada_trayecto ON paso_parada(id_trayecto);
CREATE INDEX idx_paso_parada_parada ON paso_parada(id_parada);
CREATE INDEX idx_incidente_trayecto ON incidente(id_trayecto);
CREATE INDEX idx_incidente_gravedad ON incidente(gravedad);
CREATE INDEX idx_evento_mantenimiento_autobus ON evento_mantenimiento(id_autobus);
CREATE INDEX idx_evento_mantenimiento_fecha ON evento_mantenimiento(fecha);
CREATE INDEX idx_evento_mantenimiento_tipo ON evento_mantenimiento(tipo_mantenimiento);

-- ============================================================================
-- INSERCIÓN DE DATOS DE EJEMPLO
-- ============================================================================

-- Empresa
INSERT INTO empresa (codigo, nombre) VALUES
('EMT001', 'Urban Transport Solutions');

-- Flotas
INSERT INTO flota (id_empresa, codigo, marca_comun, anio_adquisicion) VALUES
(1, 'FLOTA_A', 'Mercedes-Benz', 2022),
(1, 'FLOTA_B', 'Volvo', 2020),
(1, 'FLOTA_C', 'Iveco', 2023);

-- Autobuses
INSERT INTO autobus (id_flota, matricula, capacidad, consumo_medio) VALUES
(1, '1234-ABC', 80, 0.35),
(1, '1235-ABC', 80, 0.35),
(1, '1236-ABC', 80, 0.36),
(2, '5678-DEF', 120, 0.42),
(2, '5679-DEF', 120, 0.41),
(3, '9012-GHI', 60, 0.28);

-- Conductores
INSERT INTO conductor (nombre_completo, permisos_conduccion, antiguedad) VALUES
('María López Fernández', 'D+E', 8),
('Juan García Martínez', 'D', 5),
('Ana Ruiz Sánchez', 'D+E', 12),
('Carlos Pérez González', 'D', 3),
('Laura Martínez Jiménez', 'D+E', 7);

-- Turnos
INSERT INTO turno (codigo, franja_horaria, dia_semana) VALUES
('TURNO_M', '06:00-14:00', 'L,M,X,J,V'),
('TURNO_T', '14:00-22:00', 'L,M,X,J,V'),
('TURNO_N', '22:00-06:00', 'L,M,X,J,V,S,D');

-- Asignaciones conductor-autobús
INSERT INTO asignacion_conductor_autobus (id_conductor, id_autobus, fecha_asignacion) VALUES
(1, 1, '2024-01-15'),
(1, 2, '2024-01-15'),
(2, 2, '2024-02-01'),
(2, 4, '2024-02-01'),
(3, 3, '2024-01-10'),
(3, 5, '2024-01-10'),
(4, 6, '2024-03-01'),
(5, 1, '2024-02-20'),
(5, 4, '2024-02-20');

-- Asignaciones conductor-turno
INSERT INTO asignacion_conductor_turno (id_conductor, id_turno, fecha_asignacion) VALUES
(1, 1, '2024-01-01'),
(2, 2, '2024-01-01'),
(3, 1, '2024-01-01'),
(4, 3, '2024-01-01'),
(5, 2, '2024-01-01');

-- Rutas
INSERT INTO ruta (codigo, nombre, num_paradas, longitud_km) VALUES
('R01', 'Centro - Aeropuerto', 15, 22.50),
('R02', 'Centro - Universidad', 12, 18.00),
('R03', 'Estación - Polígono Industrial', 20, 28.00),
('R04', 'Centro - Hospital', 10, 14.50),
('R05', 'Plaza Mayor - Estadio', 8, 12.00);

-- Paradas
INSERT INTO parada (codigo, nombre, calle, ciudad, coord_lat, coord_lon) VALUES
('P001', 'Plaza del Ayuntamiento', 'Plaza Mayor, 1', 'Madrid', 40.41677, -3.70379),
('P002', 'Estación de Atocha', 'Glorieta del Emperador Carlos V', 'Madrid', 40.40677, -3.69183),
('P003', 'Puerta del Sol', 'Plaza de la Puerta del Sol', 'Madrid', 40.41694, -3.70346),
('P004', 'Gran Vía - Callao', 'Gran Vía, 28', 'Madrid', 40.41996, -3.70653),
('P005', 'Aeropuerto T4', 'Avenida de la Hispanidad', 'Madrid', 40.49355, -3.56675),
('P006', 'Ciudad Universitaria', 'Avenida Complutense', 'Madrid', 40.44958, -3.72873),
('P007', 'Hospital La Paz', 'Paseo de la Castellana, 261', 'Madrid', 40.47981, -3.68413),
('P008', 'Polígono Industrial Coslada', 'Calle de la Industria, 50', 'Coslada', 40.42837, -3.54876),
('P009', 'Estadio Santiago Bernabéu', 'Avenida de Concha Espina, 1', 'Madrid', 40.45306, -3.68835),
('P010', 'Mercado de San Miguel', 'Plaza de San Miguel', 'Madrid', 40.41506, -3.70894);

-- Rutas-Paradas
INSERT INTO ruta_parada (id_ruta, id_parada, orden) VALUES
-- Ruta R01: Centro - Aeropuerto
(1, 1, 1), (1, 3, 2), (1, 4, 3), (1, 5, 4),
-- Ruta R02: Centro - Universidad
(2, 1, 1), (2, 3, 2), (2, 6, 3),
-- Ruta R03: Estación - Polígono Industrial
(3, 2, 1), (3, 8, 2),
-- Ruta R04: Centro - Hospital
(4, 1, 1), (4, 7, 2),
-- Ruta R05: Plaza Mayor - Estadio
(5, 1, 1), (5, 10, 2), (5, 9, 3);

-- Trayectos
INSERT INTO trayecto (id_autobus, id_ruta, fecha_inicio, fecha_fin) VALUES
(1, 1, '2024-11-25 08:00:00', '2024-11-25 09:15:00'),
(1, 1, '2024-11-25 10:30:00', '2024-11-25 11:45:00'),
(2, 2, '2024-11-25 07:45:00', '2024-11-25 08:50:00'),
(3, 3, '2024-11-25 14:00:00', '2024-11-25 15:30:00'),
(4, 4, '2024-11-25 09:00:00', '2024-11-25 09:45:00'),
(5, 5, '2024-11-25 16:00:00', '2024-11-25 16:40:00');

-- Pasos por paradas
INSERT INTO paso_parada (id_trayecto, id_parada, hora_estimada, hora_real, observaciones) VALUES
-- Trayecto 1 (R01)
(1, 1, '08:00:00', '08:02:00', 'Salida con 2 minutos de retraso'),
(1, 3, '08:15:00', '08:18:00', 'Tráfico denso en la zona'),
(1, 4, '08:30:00', '08:35:00', 'Retraso acumulado'),
(1, 5, '09:00:00', '09:15:00', 'Llegada con 15 minutos de retraso'),
-- Trayecto 2 (R01)
(2, 1, '10:30:00', '10:30:00', NULL),
(2, 3, '10:45:00', '10:46:00', NULL),
(2, 4, '11:00:00', '11:02:00', NULL),
(2, 5, '11:30:00', '11:45:00', 'Retención por accidente en M-40'),
-- Trayecto 3 (R02)
(3, 1, '07:45:00', '07:45:00', NULL),
(3, 3, '08:00:00', '08:00:00', NULL),
(3, 6, '08:30:00', '08:50:00', 'Retraso por obras en la Castellana');

-- Incidentes
INSERT INTO incidente (id_trayecto, codigo, descripcion, gravedad, tiempo_resolucion) VALUES
(1, 'INC001', 'Tráfico denso en acceso a M-40 por obras', 'MEDIA', 15),
(2, 'INC002', 'Retención por accidente en salida 12 de M-40', 'ALTA', 30),
(3, 'INC003', 'Obras de asfaltado en Paseo de la Castellana', 'BAJA', 10);

-- Eventos de mantenimiento
INSERT INTO evento_mantenimiento (id_autobus, fecha, tipo_mantenimiento, tecnico_responsable, tiempo_resolucion) VALUES
(1, '2024-11-01', 'PREVENTIVO', 'Carlos Martínez', 120),
(2, '2024-11-05', 'PREVENTIVO', 'Carlos Martínez', 120),
(3, '2024-11-10', 'PREVENTIVO', 'Laura Sánchez', 135),
(1, '2024-11-20', 'CORRECTIVO', 'Carlos Martínez', 240),
(4, '2024-11-15', 'PREVENTIVO', 'Laura Sánchez', 120),
(5, '2024-11-18', 'CORRECTIVO', 'Pedro García', 180);

-- ============================================================================
-- CONSULTAS DE VERIFICACIÓN
-- ============================================================================

-- Ver estructura de todas las tablas
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Verificar datos insertados
SELECT 'Empresas' AS entidad, COUNT(*) AS total FROM empresa
UNION ALL SELECT 'Flotas', COUNT(*) FROM flota
UNION ALL SELECT 'Autobuses', COUNT(*) FROM autobus
UNION ALL SELECT 'Conductores', COUNT(*) FROM conductor
UNION ALL SELECT 'Turnos', COUNT(*) FROM turno
UNION ALL SELECT 'Rutas', COUNT(*) FROM ruta
UNION ALL SELECT 'Paradas', COUNT(*) FROM parada
UNION ALL SELECT 'Trayectos', COUNT(*) FROM trayecto
UNION ALL SELECT 'Incidentes', COUNT(*) FROM incidente
UNION ALL SELECT 'Mantenimientos', COUNT(*) FROM evento_mantenimiento;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
