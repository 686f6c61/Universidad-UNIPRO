-- ============================================================================
-- Consultas analíticas paralelas
-- Sistema de gestión de flotas - Fase 4
-- ============================================================================

-- Configuración de paralelización
SET max_parallel_workers_per_gather = 4;
SET parallel_setup_cost = 100;
SET parallel_tuple_cost = 0.1;

-- ============================================================================
-- CREACIÓN DE TABLAS ADICIONALES PARA ANÁLISIS PARALELO
-- ============================================================================

-- Tabla: ZONA
CREATE TABLE IF NOT EXISTS zona (
    id_zona SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

-- Tabla: RENDIMIENTO (particionada por hash)
CREATE TABLE IF NOT EXISTS rendimiento (
    id_rendimiento SERIAL,
    id_trayecto INTEGER NOT NULL,
    tiempo_total_min INTEGER NOT NULL CHECK (tiempo_total_min >= 0),
    tiempo_parada_acum_min INTEGER NOT NULL CHECK (tiempo_parada_acum_min >= 0),
    velocidad_media_kmh DECIMAL(5,2) NOT NULL CHECK (velocidad_media_kmh > 0),
    consumo_energetico_litros DECIMAL(8,2) NOT NULL CHECK (consumo_energetico_litros >= 0),
    emisiones_co2_kg DECIMAL(8,2) NOT NULL CHECK (emisiones_co2_kg >= 0),
    PRIMARY KEY (id_rendimiento, id_trayecto)
) PARTITION BY HASH (id_trayecto);

-- Crear particiones hash para RENDIMIENTO
CREATE TABLE IF NOT EXISTS rendimiento_p0 PARTITION OF rendimiento
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE IF NOT EXISTS rendimiento_p1 PARTITION OF rendimiento
    FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE IF NOT EXISTS rendimiento_p2 PARTITION OF rendimiento
    FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE IF NOT EXISTS rendimiento_p3 PARTITION OF rendimiento
    FOR VALUES WITH (MODULUS 4, REMAINDER 3);

-- Tabla: PARADA_ZONA
CREATE TABLE IF NOT EXISTS parada_zona (
    id_parada INTEGER NOT NULL,
    id_zona INTEGER NOT NULL,
    PRIMARY KEY (id_parada, id_zona),
    FOREIGN KEY (id_parada) REFERENCES parada(id_parada) ON DELETE CASCADE,
    FOREIGN KEY (id_zona) REFERENCES zona(id_zona) ON DELETE CASCADE
);

-- Tabla: TRAYECTO_ZONA (particionada por hash)
CREATE TABLE IF NOT EXISTS trayecto_zona (
    id_trayecto INTEGER NOT NULL,
    id_zona INTEGER NOT NULL,
    PRIMARY KEY (id_trayecto, id_zona)
) PARTITION BY HASH (id_trayecto);

-- Crear particiones hash para TRAYECTO_ZONA
CREATE TABLE IF NOT EXISTS trayecto_zona_p0 PARTITION OF trayecto_zona
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE IF NOT EXISTS trayecto_zona_p1 PARTITION OF trayecto_zona
    FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE IF NOT EXISTS trayecto_zona_p2 PARTITION OF trayecto_zona
    FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE IF NOT EXISTS trayecto_zona_p3 PARTITION OF trayecto_zona
    FOR VALUES WITH (MODULUS 4, REMAINDER 3);

-- ============================================================================
-- INSERCIÓN DE DATOS DE EJEMPLO
-- ============================================================================

-- Zonas geográficas
INSERT INTO zona (codigo, nombre, descripcion) VALUES
('ZONA_NORTE', 'Norte', 'Área norte de Madrid (Chamartín, Hortaleza, Fuencarral)'),
('ZONA_SUR', 'Sur', 'Área sur de Madrid (Carabanchel, Villaverde, Usera)'),
('ZONA_CENTRO', 'Centro', 'Área centro de Madrid (Sol, Opera, Gran Vía)'),
('ZONA_ESTE', 'Este', 'Área este de Madrid (Salamanca, Retiro, Moratalaz)'),
('ZONA_OESTE', 'Oeste', 'Área oeste de Madrid (Moncloa, Latina, Carabanchel)')
ON CONFLICT (codigo) DO NOTHING;

-- Asignación de paradas a zonas
INSERT INTO parada_zona (id_parada, id_zona) VALUES
(1, 3), -- Plaza del Ayuntamiento -> Centro
(2, 3), -- Estación de Atocha -> Centro
(3, 3), -- Puerta del Sol -> Centro
(4, 3), -- Gran Vía -> Centro
(5, 1), -- Aeropuerto T4 -> Norte
(6, 5), -- Ciudad Universitaria -> Oeste
(7, 1), -- Hospital La Paz -> Norte
(8, 4), -- Polígono Industrial Coslada -> Este
(9, 1), -- Estadio Bernabéu -> Norte
(10, 3) -- Mercado San Miguel -> Centro
ON CONFLICT DO NOTHING;

-- Datos de rendimiento para trayectos existentes
INSERT INTO rendimiento (id_trayecto, tiempo_total_min, tiempo_parada_acum_min, velocidad_media_kmh, consumo_energetico_litros, emisiones_co2_kg)
SELECT
    id_trayecto,
    EXTRACT(EPOCH FROM (fecha_fin - fecha_inicio)) / 60,  -- tiempo total en minutos
    FLOOR(RANDOM() * 20 + 5),                              -- tiempo de parada acumulado
    ROUND((RANDOM() * 30 + 20)::NUMERIC, 2),              -- velocidad media entre 20-50 km/h
    ROUND((RANDOM() * 15 + 5)::NUMERIC, 2),               -- consumo energético
    ROUND((RANDOM() * 30 + 10)::NUMERIC, 2)               -- emisiones CO2
FROM trayecto
WHERE fecha_fin IS NOT NULL
ON CONFLICT DO NOTHING;

-- Asignación de trayectos a zonas (basado en las paradas que tocan)
INSERT INTO trayecto_zona (id_trayecto, id_zona)
SELECT DISTINCT t.id_trayecto, pz.id_zona
FROM trayecto t
JOIN paso_parada pp ON t.id_trayecto = pp.id_trayecto
JOIN parada_zona pz ON pp.id_parada = pz.id_parada
ON CONFLICT DO NOTHING;

-- ============================================================================
-- CONSULTA 1: Análisis de tiempos de viaje por zona
-- ============================================================================

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
    z.nombre AS zona,
    COUNT(t.id_trayecto) AS total_trayectos,
    ROUND(AVG(r.tiempo_total_min), 2) AS tiempo_promedio_min,
    ROUND(AVG(r.velocidad_media_kmh), 2) AS velocidad_promedio_kmh,
    ROUND(AVG(r.tiempo_parada_acum_min), 2) AS tiempo_parada_promedio_min
FROM zona z
JOIN trayecto_zona tz ON z.id_zona = tz.id_zona
JOIN trayecto t ON tz.id_trayecto = t.id_trayecto
JOIN rendimiento r ON t.id_trayecto = r.id_trayecto
WHERE t.fecha_inicio >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY z.id_zona, z.nombre
ORDER BY total_trayectos DESC;

-- Sin EXPLAIN para ver solo resultados
SELECT
    z.nombre AS zona,
    COUNT(t.id_trayecto) AS total_trayectos,
    ROUND(AVG(r.tiempo_total_min), 2) AS tiempo_promedio_min,
    ROUND(AVG(r.velocidad_media_kmh), 2) AS velocidad_promedio_kmh,
    ROUND(AVG(r.tiempo_parada_acum_min), 2) AS tiempo_parada_promedio_min
FROM zona z
JOIN trayecto_zona tz ON z.id_zona = tz.id_zona
JOIN trayecto t ON tz.id_trayecto = t.id_trayecto
JOIN rendimiento r ON t.id_trayecto = r.id_trayecto
WHERE t.fecha_inicio >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY z.id_zona, z.nombre
ORDER BY total_trayectos DESC;

-- ============================================================================
-- CONSULTA 2: Consumo energético y emisiones por zona y mes
-- ============================================================================

SELECT
    z.nombre AS zona,
    TO_CHAR(t.fecha_inicio, 'YYYY-MM') AS mes,
    COUNT(t.id_trayecto) AS total_trayectos,
    ROUND(SUM(r.consumo_energetico_litros), 2) AS consumo_total_litros,
    ROUND(AVG(r.consumo_energetico_litros), 2) AS consumo_promedio_litros,
    ROUND(SUM(r.emisiones_co2_kg), 2) AS emisiones_total_kg,
    ROUND(AVG(r.emisiones_co2_kg), 2) AS emisiones_promedio_kg
FROM zona z
JOIN trayecto_zona tz ON z.id_zona = tz.id_zona
JOIN trayecto t ON tz.id_trayecto = t.id_trayecto
JOIN rendimiento r ON t.id_trayecto = r.id_trayecto
WHERE t.fecha_inicio >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY z.id_zona, z.nombre, TO_CHAR(t.fecha_inicio, 'YYYY-MM')
ORDER BY mes DESC, consumo_total_litros DESC;

-- ============================================================================
-- CONSULTA 3: Ranking de autobuses por eficiencia energética
-- ============================================================================

SELECT
    a.matricula,
    f.marca_comun,
    COUNT(t.id_trayecto) AS total_trayectos,
    ROUND(AVG(r.velocidad_media_kmh), 2) AS velocidad_media_kmh,
    ROUND(AVG(r.consumo_energetico_litros), 2) AS consumo_promedio_litros,
    ROUND(AVG(r.emisiones_co2_kg), 2) AS emisiones_promedio_kg,
    ROUND(AVG(r.consumo_energetico_litros) / AVG(r.velocidad_media_kmh), 3) AS ratio_consumo_velocidad
FROM autobus a
JOIN flota f ON a.id_flota = f.id_flota
JOIN trayecto t ON a.id_autobus = t.id_autobus
JOIN rendimiento r ON t.id_trayecto = r.id_trayecto
WHERE t.fecha_inicio >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY a.id_autobus, a.matricula, f.marca_comun
HAVING COUNT(t.id_trayecto) >= 3  -- Solo autobuses con al menos 3 trayectos
ORDER BY ratio_consumo_velocidad ASC  -- Menor ratio = más eficiente
LIMIT 10;

-- ============================================================================
-- CONSULTA 4: Análisis de retrasos por zona y franja horaria
-- ============================================================================

SELECT
    z.nombre AS zona,
    CASE
        WHEN EXTRACT(HOUR FROM pp.hora_real) BETWEEN 6 AND 9 THEN 'Mañana (6-9h)'
        WHEN EXTRACT(HOUR FROM pp.hora_real) BETWEEN 10 AND 13 THEN 'Media mañana (10-13h)'
        WHEN EXTRACT(HOUR FROM pp.hora_real) BETWEEN 14 AND 17 THEN 'Tarde (14-17h)'
        WHEN EXTRACT(HOUR FROM pp.hora_real) BETWEEN 18 AND 21 THEN 'Noche (18-21h)'
        ELSE 'Madrugada (22-5h)'
    END AS franja_horaria,
    COUNT(*) AS total_pasos,
    COUNT(*) FILTER (WHERE pp.hora_real > pp.hora_estimada) AS pasos_con_retraso,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE pp.hora_real > pp.hora_estimada) / COUNT(*),
        2
    ) AS porcentaje_retraso,
    ROUND(
        AVG(EXTRACT(EPOCH FROM (pp.hora_real - pp.hora_estimada)) / 60)
        FILTER (WHERE pp.hora_real > pp.hora_estimada),
        2
    ) AS retraso_promedio_min
FROM zona z
JOIN trayecto_zona tz ON z.id_zona = tz.id_zona
JOIN trayecto t ON tz.id_trayecto = t.id_trayecto
JOIN paso_parada pp ON t.id_trayecto = pp.id_trayecto
WHERE
    t.fecha_inicio >= CURRENT_DATE - INTERVAL '30 days'
    AND pp.hora_real IS NOT NULL
GROUP BY z.id_zona, z.nombre, franja_horaria
ORDER BY z.nombre, porcentaje_retraso DESC;

-- ============================================================================
-- CONSULTA 5: Análisis comparativo de rendimiento por flota
-- ============================================================================

SELECT
    f.codigo AS flota,
    f.marca_comun,
    COUNT(DISTINCT a.id_autobus) AS total_autobuses,
    COUNT(t.id_trayecto) AS total_trayectos,
    ROUND(AVG(r.tiempo_total_min), 2) AS tiempo_promedio_min,
    ROUND(AVG(r.velocidad_media_kmh), 2) AS velocidad_promedio_kmh,
    ROUND(AVG(r.consumo_energetico_litros), 2) AS consumo_promedio_litros,
    ROUND(AVG(r.emisiones_co2_kg), 2) AS emisiones_promedio_kg,
    ROUND(
        SUM(r.consumo_energetico_litros) / NULLIF(SUM(r.tiempo_total_min / 60.0), 0),
        2
    ) AS consumo_por_hora
FROM flota f
JOIN autobus a ON f.id_flota = a.id_flota
JOIN trayecto t ON a.id_autobus = t.id_autobus
JOIN rendimiento r ON t.id_trayecto = r.id_trayecto
WHERE t.fecha_inicio >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY f.id_flota, f.codigo, f.marca_comun
ORDER BY consumo_por_hora ASC;

-- ============================================================================
-- CONSULTA 6: Trayectos más lentos por zona (top 10)
-- ============================================================================

SELECT
    z.nombre AS zona,
    r.nombre AS ruta,
    t.fecha_inicio,
    a.matricula,
    rd.tiempo_total_min,
    rd.velocidad_media_kmh,
    rd.tiempo_parada_acum_min,
    ROUND(
        100.0 * rd.tiempo_parada_acum_min / NULLIF(rd.tiempo_total_min, 0),
        2
    ) AS porcentaje_tiempo_parado
FROM trayecto t
JOIN autobus a ON t.id_autobus = a.id_autobus
JOIN ruta r ON t.id_ruta = r.id_ruta
JOIN rendimiento rd ON t.id_trayecto = rd.id_trayecto
JOIN trayecto_zona tz ON t.id_trayecto = tz.id_trayecto
JOIN zona z ON tz.id_zona = z.id_zona
WHERE t.fecha_inicio >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY rd.velocidad_media_kmh ASC
LIMIT 10;

-- ============================================================================
-- CONSULTA 7: Métricas agregadas globales (para dashboard)
-- ============================================================================

SELECT
    'Global' AS alcance,
    COUNT(DISTINCT a.id_autobus) AS total_autobuses_activos,
    COUNT(DISTINCT c.id_conductor) AS total_conductores_activos,
    COUNT(t.id_trayecto) AS total_trayectos,
    ROUND(AVG(r.tiempo_total_min), 2) AS tiempo_promedio_min,
    ROUND(AVG(r.velocidad_media_kmh), 2) AS velocidad_promedio_kmh,
    ROUND(SUM(r.consumo_energetico_litros), 2) AS consumo_total_litros,
    ROUND(SUM(r.emisiones_co2_kg), 2) AS emisiones_total_kg,
    COUNT(*) FILTER (WHERE i.id_incidente IS NOT NULL) AS total_incidentes
FROM trayecto t
JOIN autobus a ON t.id_autobus = a.id_autobus
JOIN rendimiento r ON t.id_trayecto = r.id_trayecto
LEFT JOIN asignacion_conductor_autobus aca ON a.id_autobus = aca.id_autobus
LEFT JOIN conductor c ON aca.id_conductor = c.id_conductor
LEFT JOIN incidente i ON t.id_trayecto = i.id_trayecto
WHERE t.fecha_inicio >= CURRENT_DATE - INTERVAL '30 days';

-- ============================================================================
-- CONSULTA 8: Análisis de paralelismo (verificar plan de ejecución)
-- ============================================================================

-- Forzar paralelización al mínimo coste
SET parallel_setup_cost = 0;
SET parallel_tuple_cost = 0.001;

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT
    COUNT(*) AS total_registros,
    COUNT(DISTINCT id_trayecto) AS trayectos_unicos,
    ROUND(AVG(consumo_energetico_litros), 2) AS consumo_promedio,
    ROUND(SUM(emisiones_co2_kg), 2) AS emisiones_totales
FROM rendimiento
WHERE velocidad_media_kmh > 30;

-- Restaurar configuración por defecto
RESET parallel_setup_cost;
RESET parallel_tuple_cost;

-- ============================================================================
-- FIN DE CONSULTAS PARALELAS
-- ============================================================================
