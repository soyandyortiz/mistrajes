-- Script de Migración: Actualización de Tabla cierres_caja
-- Ejecutar en el SQL Editor de Supabase

-- 1. Añadir nuevas columnas necesarias para el cuadre físico y saldo acumulado
ALTER TABLE public.cierres_caja
ADD COLUMN IF NOT EXISTS monto_fisico_contado NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS diferencia NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS saldo_acumulado NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'cerrado' CHECK (estado IN ('cerrado'));

-- Nota: Si la columna 'notas' ya existe, la dejamos intacta. Si quisieras renombrarla a observaciones, 
-- usa: ALTER TABLE public.cierres_caja RENAME COLUMN notas TO observaciones;

-- 2. Asegurar que los comentarios del esquema estén actualizados (opcional)
COMMENT ON COLUMN public.cierres_caja.monto_fisico_contado IS 'Dinero real contado en gaveta al momento del cierre';
COMMENT ON COLUMN public.cierres_caja.diferencia IS 'Faltante (<0), Sobrante (>0) o Cuadre (0)';
COMMENT ON COLUMN public.cierres_caja.saldo_acumulado IS 'Saldo histórico acumulado hasta la fecha de este cierre';
