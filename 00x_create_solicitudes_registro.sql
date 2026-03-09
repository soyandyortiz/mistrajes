-- Ejecuta este script SQL en el SQL Editor de tu Dashboard de Supabase

CREATE TABLE IF NOT EXISTS public.solicitudes_registro (
  id uuid default gen_random_uuid() primary key,
  nombre_negocio text not null,
  slug text not null,
  plan_id uuid references public.plans(id),
  nombre_propietario text not null,
  cedula_ruc_propietario text,
  email_propietario text not null,
  whatsapp_propietario text,
  ciudad text,
  pais text,
  direccion text,
  estado text default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  fecha_creacion timestamp with time zone default now()
);

-- Habilitar Políticas de Seguridad (RLS)
ALTER TABLE public.solicitudes_registro ENABLE ROW LEVEL SECURITY;

-- Permitir que cualquier persona envié (inserte) una solicitud desde el formulario público
CREATE POLICY "Permitir insercion publica en solicitudes_registro"
  ON public.solicitudes_registro
  FOR INSERT
  WITH CHECK (true);

-- (Opcional) Si usas el cliente normal de Supabase para leerlas como SuperAdmin,
-- necesitarías una política de lectura. Si usas supabaseAdmin (service_role), esto bypassa el RLS.
CREATE POLICY "Permitir lectura de solicitudes a usuarios autenticados"
  ON public.solicitudes_registro
  FOR SELECT
  USING (auth.role() = 'authenticated');
