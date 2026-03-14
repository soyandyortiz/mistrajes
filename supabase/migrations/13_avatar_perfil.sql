-- ============================================================
--  Migración: avatar_id en perfiles_usuario
--  Permite a cada usuario seleccionar un avatar preestablecido.
-- ============================================================

ALTER TABLE perfiles_usuario
ADD COLUMN IF NOT EXISTS avatar_id VARCHAR(50) DEFAULT NULL;

COMMENT ON COLUMN perfiles_usuario.avatar_id IS 'ID del avatar preestablecido seleccionado por el usuario (ej: admin_crown, emp_scissors)';
