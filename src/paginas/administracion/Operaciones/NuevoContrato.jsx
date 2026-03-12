import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from 'sonner';
import { 
  User, Building2, Calendar, MapPin, Search, Plus, Trash2, Loader2,
  CreditCard, ShieldCheck, Printer, CheckCircle2, ChevronRight,
  ChevronLeft, AlertTriangle, PackageSearch, XCircle, Hash,
  Lock, Unlock
} from 'lucide-react';



const METODOS_PAGO = ['Banco Pichincha', 'Pago QR De Una', 'Cooperativa Riobamba', 'Cooperativa CACECH', 'Efectivo'];

export default function NuevoContrato({ onVolver }) {
  const { profile } = useAuthStore();
  const [step, setStep] = useState(1);
  const [contratoGuardado, setContratoGuardado] = useState(false);
  
  // -- ESTADO PASO 1: CLIENTE --
  const [busquedaDoc, setBusquedaDoc] = useState('');
  const [clientType, setClientType] = useState('natural'); // 'natural' | 'empresa'
  const [isClientReadOnly, setIsClientReadOnly] = useState(false);
  const [cliente, setCliente] = useState({
    identificacion: '', nombres: '', email: '', telefono: '', 
    pais: 'Ecuador', provincia: '', ciudad: '', direccion: '', 
    direccion_evento: '', referencia_nombre: '', referencia_celular: '',
    razon_social: '', tipo_empresa: '', responsable_nombre: '', 
    responsable_celular: '', responsable_email: ''
  });

  const buscarCliente = async () => {
    if(!busquedaDoc) return;
    toast.loading('Buscando cliente...', { id: 'search-client' });
    try {
      const { data, error } = await supabase.from('clientes')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('identificacion', busquedaDoc)
        .maybeSingle(); // maybeSingle() devuelve null si no existe, nunca 406
        
      if (error) throw error;

      if (data) {
        setIsClientReadOnly(true);
        const isEmpr = data.tipo_entidad === 'empresa' || data.identificacion?.length === 13;
        setClientType(isEmpr ? 'empresa' : 'natural');
        setCliente(prev => ({
          ...prev,
          identificacion: data.identificacion,
          nombres: data.nombre_completo || '',
          email: data.email || '',
          telefono: data.whatsapp || '',           // campo real: whatsapp
          direccion: data.direccion_domicilio || '', // campo real: direccion_domicilio
          ciudad: data.ciudad || '',
          provincia: data.provincia || '',
          razon_social: data.nombre_completo || '',
          nombre_empresa: data.nombre_empresa || '',
          ruc_empresa: data.ruc_empresa || '',
        }));
        toast.success('Cliente encontrado', { id: 'search-client' });
      } else {
        setIsClientReadOnly(false);
        setCliente(prev => ({...prev, identificacion: busquedaDoc}));
        toast.info('Cliente nuevo — complete el formulario', { id: 'search-client' });
      }
    } catch (err) {
      console.error('buscarCliente error:', err);
      toast.error('Error al buscar cliente', { id: 'search-client' });
    }
  };

  // -- ESTADO PASO 2: FECHAS Y TIPO --
  // Horas disponibles: 06:00 a 23:00 cada 30 min
  const HORAS_DISPONIBLES = useMemo(() => {
    const horas = [];
    for (let h = 6; h <= 23; h++) {
      horas.push(`${String(h).padStart(2,'0')}:00`);
      if (h < 23) horas.push(`${String(h).padStart(2,'0')}:30`);
    }
    return horas;
  }, []);

  const [fechas, setFechas] = useState({
    tipo_entrega: 'Presencial',
    // Salida
    fecha_salida_date: '',
    fecha_salida_time: '08:00',
    // Evento
    fecha_evento_date: '',
    fecha_evento_time: '10:00',
    // Devolución (auto)
    fecha_devolucion_date: '',
    fecha_devolucion_time: '08:00',
  });

  // -- ESTADO: Lock/Unlock de fecha de devolución --
  const [devolucionBloqueada, setDevolucionBloqueada] = useState(true);
  const [devolucionModificada, setDevolucionModificada] = useState(false);

  // -- ESTADO: Días de alquiler y facturación multi-día --
  const [diasAlquiler, setDiasAlquiler] = useState(1);
  const [precioPorDia, setPrecioPorDia] = useState('');
  const [precioPorDiaManual, setPrecioPorDiaManual] = useState(false);
  const [subtotalAlquiler, setSubtotalAlquiler] = useState('');
  const [subtotalAlquilerManual, setSubtotalAlquilerManual] = useState(false);

  // Combina date + time → formato YYYY-MM-DDThh:mm para la BD
  const combinarFechaHora = (date, time) => {
    if (!date) return '';
    return `${date}T${time || '08:00'}`;
  };

  // Getters para el payload de guardado (compatibilidad total)
  const fechaSalidaFull = combinarFechaHora(fechas.fecha_salida_date, fechas.fecha_salida_time);
  const fechaEventoFull = combinarFechaHora(fechas.fecha_evento_date, fechas.fecha_evento_time);
  const fechaDevolucionFull = combinarFechaHora(fechas.fecha_devolucion_date, fechas.fecha_devolucion_time);

  // Calcula días de alquiler a partir de las fechas
  const calcularDiasAlquiler = (salidaDate, salidaTime, devDate, devTime) => {
    if (!salidaDate || !devDate) return 1;
    const salida = new Date(`${salidaDate}T${salidaTime || '08:00'}`);
    const devolucion = new Date(`${devDate}T${devTime || '08:00'}`);
    if (isNaN(salida) || isNaN(devolucion)) return 1;
    const diffMs = devolucion.getTime() - salida.getTime();
    const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    return Math.max(1, diffDays);
  };

  const handleSalidaChange = (field, val) => {
    const newFechas = { ...fechas, [field]: val };
    // Recalcular devolución (+24h desde salida) solo si está bloqueada
    const salidaDate = newFechas.fecha_salida_date;
    const salidaTime = newFechas.fecha_salida_time;
    if (salidaDate && devolucionBloqueada) {
      const salida = new Date(`${salidaDate}T${salidaTime}`);
      if (!isNaN(salida)) {
        const dev = new Date(salida.getTime() + (24 * 60 * 60 * 1000));
        const devDate = dev.toISOString().slice(0, 10);
        const devTime = `${String(dev.getHours()).padStart(2,'0')}:${String(dev.getMinutes()).padStart(2,'0')}`;
        newFechas.fecha_devolucion_date = devDate;
        newFechas.fecha_devolucion_time = devTime;
        toast.success('Validando stock automáticamente para las fechas seleccionadas');
      }
    }
    setFechas(newFechas);
    // Recalcular días
    const dias = calcularDiasAlquiler(newFechas.fecha_salida_date, newFechas.fecha_salida_time, newFechas.fecha_devolucion_date, newFechas.fecha_devolucion_time);
    setDiasAlquiler(dias);
  };

  // Handler para cambios en la fecha de devolución (cuando está desbloqueada)
  const handleDevolucionChange = (field, val) => {
    const newFechas = { ...fechas, [field]: val };
    // Validar que la fecha de devolución no sea anterior a la de salida
    if (newFechas.fecha_salida_date && newFechas.fecha_devolucion_date) {
      const salida = new Date(`${newFechas.fecha_salida_date}T${newFechas.fecha_salida_time}`);
      const devolucion = new Date(`${newFechas.fecha_devolucion_date}T${newFechas.fecha_devolucion_time}`);
      if (devolucion < salida) {
        toast.error('La fecha de devolución no puede ser anterior a la fecha de salida.');
        return;
      }
    }
    setFechas(newFechas);
    setDevolucionModificada(true);
    const dias = calcularDiasAlquiler(newFechas.fecha_salida_date, newFechas.fecha_salida_time, newFechas.fecha_devolucion_date, newFechas.fecha_devolucion_time);
    setDiasAlquiler(dias);
  };

  // Toggle lock/unlock de la fecha de devolución
  const toggleDevolucionLock = () => {
    if (!devolucionBloqueada) {
      // Re-bloquear: recalcular fecha devolución auto (+24h)
      if (fechas.fecha_salida_date) {
        const salida = new Date(`${fechas.fecha_salida_date}T${fechas.fecha_salida_time}`);
        if (!isNaN(salida)) {
          const dev = new Date(salida.getTime() + (24 * 60 * 60 * 1000));
          const devDate = dev.toISOString().slice(0, 10);
          const devTime = `${String(dev.getHours()).padStart(2,'0')}:${String(dev.getMinutes()).padStart(2,'0')}`;
          setFechas(prev => ({ ...prev, fecha_devolucion_date: devDate, fecha_devolucion_time: devTime }));
          setDiasAlquiler(1);
        }
      }
      setDevolucionModificada(false);
      setSubtotalAlquilerManual(false);
      setPrecioPorDiaManual(false);
    }
    setDevolucionBloqueada(prev => !prev);
  };



  // ── ESTADO PASO 3: PRODUCTOS ──
  const [busquedaProd, setBusquedaProd] = useState('');
  const [resultadosProd, setResultadosProd] = useState([]);
  const [buscandoProd, setBuscandoProd] = useState(false);
  const [cargandoPiezas, setCargandoPiezas] = useState(null);
  // Cada item: { id, nombre, precio_unitario, thumbnail, cantidad_total, fase, piezas }
  // fase: 'cantidad' (paso A) | 'tallas' (paso B) | 'confirmado' (paso C)
  // piezas: [{ id, nombre, tallasDisponibles:[{talla,stock}], tallasCantidades:{[talla]:cantidad} }]
  const [productosCarrito, setProductosCarrito] = useState([]);

  // Recalcular precio por día y subtotal de alquiler cuando cambian los productos o los días
  useEffect(() => {
    if (diasAlquiler <= 1) {
      // Reset multi-day fields
      if (!precioPorDiaManual) setPrecioPorDia('');
      if (!subtotalAlquilerManual) setSubtotalAlquiler('');
      return;
    }
    // Sugerir precio por día = suma de precios unitarios de todos los productos
    const precioBaseSugerido = productosCarrito.reduce((acc, p) => acc + (Number(p.precio_unitario) || 0) * (Number(p.cantidad_total) || 1), 0);
    if (!precioPorDiaManual) {
      setPrecioPorDia(precioBaseSugerido.toFixed(2));
    }
    // Sugerir subtotal alquiler = precio_por_dia × dias
    const ppd = precioPorDiaManual ? (parseFloat(precioPorDia) || 0) : precioBaseSugerido;
    if (!subtotalAlquilerManual) {
      setSubtotalAlquiler((ppd * diasAlquiler).toFixed(2));
    }
  }, [diasAlquiler, productosCarrito, precioPorDiaManual, precioPorDia]);

  // Busca productos activos del tenant en tiempo real
  const realizarBusquedaProd = async (q) => {
    setBusquedaProd(q);
    if (q.trim().length < 2) { setResultadosProd([]); return; }
    setBuscandoProd(true);
    try {
      const { data: prods, error } = await supabase
        .from('productos')
        .select('id, nombre, precio_unitario')
        .eq('tenant_id', profile.tenant_id)
        .eq('estado', 'activo')
        .is('deleted_at', null)
        .ilike('nombre', `%${q.trim()}%`)
        .limit(8);
      if (error) throw error;
      const ids = (prods || []).map(p => p.id);
      let imgMap = {};
      if (ids.length > 0) {
        const { data: imgs } = await supabase
          .from('imagenes_productos')
          .select('producto_id, url')
          .in('producto_id', ids)
          .order('orden_visual', { ascending: true });
        (imgs || []).forEach(img => {
          if (!imgMap[img.producto_id]) imgMap[img.producto_id] = img.url;
        });
      }
      setResultadosProd((prods || []).map(p => ({ ...p, thumbnail: imgMap[p.id] || null })));
    } catch (e) {
      console.error('Error buscando productos:', e);
      setResultadosProd([]);
    } finally {
      setBuscandoProd(false);
    }
  };

  // Cargar producto y sus piezas con stock real (fase inicial = 'cantidad')
  const agregarProducto = async (prod) => {
    if (productosCarrito.find(p => p.id === prod.id))
      return toast.info('El producto ya está en la lista');
    setCargandoPiezas(prod.id);
    setBusquedaProd('');
    setResultadosProd([]);
    try {
      const { data: ppRows, error: ppError } = await supabase
        .from('piezas_producto')
        .select('pieza_id, orden_visual, pieza:pieza_id(id, nombre)')
        .eq('producto_id', prod.id)
        .eq('tenant_id', profile.tenant_id)
        .order('orden_visual', { ascending: true });
      if (ppError) throw ppError;
      const piezaIds = (ppRows || []).map(r => r.pieza?.id).filter(Boolean);
      let stockMap = {};
      if (piezaIds.length > 0) {
        const { data: stocks } = await supabase
          .from('stock_piezas')
          .select('pieza_id, etiqueta_talla, stock_total')
          .in('pieza_id', piezaIds)
          .eq('tenant_id', profile.tenant_id);
        (stocks || []).forEach(s => {
          if (!stockMap[s.pieza_id]) stockMap[s.pieza_id] = [];
          stockMap[s.pieza_id].push({ talla: s.etiqueta_talla, stock: s.stock_total });
        });
      }
      const piezas = (ppRows || []).map(row => {
        const pz = row.pieza;
        if (!pz) return null;
        const tallasDisponibles = stockMap[pz.id] || [];
        // tallasCantidades: objeto {[talla]: cantidad} inicializado en 0
        const tallasCantidades = {};
        tallasDisponibles.forEach(t => { tallasCantidades[t.talla] = 0; });
        return { id: pz.id, nombre: pz.nombre, tallasDisponibles, tallasCantidades };
      }).filter(Boolean);

      setProductosCarrito(prev => [...prev, {
        ...prod,
        cantidad_total: 1,
        fase: 'cantidad',  // A: ingresar cantidad total
        piezas,
      }]);
      toast.success(`"${prod.nombre}" agregado. Define la cantidad total.`);
    } catch (e) {
      console.error('Error cargando piezas:', e);
      toast.error(`No se pudieron cargar las piezas de "${prod.nombre}"`);
    } finally {
      setCargandoPiezas(null);
    }
  };

  // Confirmar cantidad total → pasar a fase tallas
  const confirmarCantidadTotal = (prodId) => {
    setProductosCarrito(prev => prev.map(p => {
      if (p.id !== prodId) return p;
      if (!p.cantidad_total || p.cantidad_total < 1)
        return (toast.error('La cantidad debe ser al menos 1'), p);
      // si no tiene piezas, confirmar directamente
      if (p.piezas.length === 0) return { ...p, fase: 'confirmado' };
      return { ...p, fase: 'tallas' };
    }));
  };

  // Actualizar cantidad de una talla específica para una pieza
  const updateTallaCantidad = (prodId, piezaId, talla, valor) => {
    const v = Math.max(0, parseInt(valor, 10) || 0);
    setProductosCarrito(prev => prev.map(p => {
      if (p.id !== prodId) return p;
      return {
        ...p,
        piezas: p.piezas.map(pz => {
          if (pz.id !== piezaId) return pz;
          return { ...pz, tallasCantidades: { ...pz.tallasCantidades, [talla]: v } };
        })
      };
    }));
  };

  // Suma total asignado en las tallas de una pieza
  const totalAsignadoPieza = (pieza) =>
    Object.values(pieza.tallasCantidades || {}).reduce((a, b) => a + b, 0);

  // Valida si TODAS las piezas de un producto tienen la suma == cantidad_total
  const piezasValidas = (prod) => {
    if (prod.piezas.length === 0) return true;
    return prod.piezas.every(pz => totalAsignadoPieza(pz) === prod.cantidad_total);
  };

  // Confirmar distribución de tallas → fase 'confirmado'
  const confirmarTallas = (prodId) => {
    setProductosCarrito(prev => prev.map(p => {
      if (p.id !== prodId) return p;
      if (!piezasValidas(p)) {
        toast.error('La suma de cantidades por talla debe igualar la cantidad total del producto en cada pieza.');
        return p;
      }
      return { ...p, fase: 'confirmado' };
    }));
  };

  // Volver a editar tallas
  const editarTallas = (prodId) => {
    setProductosCarrito(prev => prev.map(p =>
      p.id === prodId ? { ...p, fase: 'tallas' } : p
    ));
  };

  const quitarProducto = (prodId) => {
    setProductosCarrito(prev => prev.filter(p => p.id !== prodId));
  };

  const todosConfirmados = productosCarrito.length > 0 &&
    productosCarrito.every(p => p.fase === 'confirmado');


  // -- ESTADO PASO 4: PRECIO Y PAGO --
  // subtotal base = suma de (precio_unitario × cantidad_total) por cada producto confirmado (por 1 día)
  const subtotalBase = useMemo(() =>
    productosCarrito.reduce((acc, p) =>
      acc + (Number(p.precio_unitario) || 0) * (Number(p.cantidad_total) || 1), 0
    ), [productosCarrito]);
  // Si hay más de 1 día, el subtotal es el subtotal_alquiler; si no, es subtotalBase
  const subtotal = diasAlquiler > 1 ? (parseFloat(subtotalAlquiler) || subtotalBase) : subtotalBase;
  const [descuento, setDescuento] = useState(0);
  const [cupon, setCupon] = useState('');
  const total = subtotal - descuento;
  const anticipo = total * 0.5;

  // Detectar si el subtotal de alquiler fue modificado manualmente
  const subtotalAlquilerSugerido = useMemo(() => {
    const ppd = parseFloat(precioPorDia) || 0;
    return ppd * diasAlquiler;
  }, [precioPorDia, diasAlquiler]);
  const subtotalFueModificado = subtotalAlquilerManual && diasAlquiler > 1 && Math.abs((parseFloat(subtotalAlquiler) || 0) - subtotalAlquilerSugerido) > 0.01;

  const [metodoPago, setMetodoPago] = useState('');
  const [montoAnticipo, setMontoAnticipo] = useState('');
  // montoAnticipo: editable, pre-llenado con 50% al entrar al paso 4

  const aplicarCupon = () => {
    if(cupon === 'EXCELENCIA10') {
      setDescuento(subtotal * 0.10);
      toast.success('Cupón aplicado: 10% de descuento');
    } else {
      toast.error('Cupón inválido');
    }
  };

  // -- ESTADO PASO 5: GARANTIA --
  const [garantia, setGarantia] = useState({ tipo: 'Económica', descripcion: '' });

  // -- PASO 6: GUARDADO REAL EN SUPABASE --
  const [guardando, setGuardando] = useState(false);
  const [contratoId, setContratoId] = useState(null);
  const [contratoCodigo, setContratoCodigo] = useState(null);

  const handleGuardarContrato = async () => {
    if (guardando) return;

    // ── Validaciones previas al guardado ──────────────────────
    const nombreCliente = (clientType === 'natural' ? cliente.nombres : cliente.razon_social) || cliente.nombres || '';
    if (!cliente.identificacion?.trim()) {
      toast.error('La identificación del cliente es obligatoria.');
      setStep(1);
      return;
    }
    if (!nombreCliente.trim()) {
      toast.error('El nombre del cliente es obligatorio.');
      setStep(1);
      return;
    }
    if (!fechas.fecha_salida_date) {
      toast.error('La fecha de salida es obligatoria.');
      setStep(2);
      return;
    }
    if (!fechas.fecha_devolucion_date) {
      toast.error('La fecha de devolución es obligatoria.');
      setStep(2);
      return;
    }
    if (productosCarrito.length === 0) {
      toast.error('Debes agregar al menos un producto al contrato.');
      setStep(3);
      return;
    }
    if (!todosConfirmados) {
      toast.error('Confirma todos los productos y sus tallas antes de guardar.');
      setStep(3);
      return;
    }
    if (!metodoPago) {
      toast.error('El método de pago del anticipo es obligatorio.');
      setStep(4);
      return;
    }
    const anticipoValidado = parseFloat(montoAnticipo);
    if (!anticipoValidado || anticipoValidado <= 0) {
      toast.error('El monto del anticipo debe ser mayor a $0.');
      setStep(4);
      return;
    }

    setGuardando(true);
    try {
      const subTotalCalc = diasAlquiler > 1 ? (parseFloat(subtotalAlquiler) || subtotalBase) : subtotalBase;
      const totalCalc = Math.max(0, subTotalCalc - descuento);
      const anticipoCalc = totalCalc * 0.5;
      const montoAnticipoParsed = parseFloat(montoAnticipo) || anticipoCalc;

      // Determinar tipo_garantia: solo enviar si hay un tipo válido seleccionado
      const tipoGarantiaPayload = garantia.tipo === 'Física' ? 'fisica'
        : garantia.tipo === 'Económica' ? 'economica'
        : null;

      const payload = {
        tenant_id: profile.tenant_id,
        creado_por: profile.id,
        cliente: {
          tipo_entidad: clientType === 'empresa' ? 'empresa' : 'natural',
          nombre_completo: nombreCliente,
          identificacion: cliente.identificacion.trim(),
          email: cliente.email?.trim() || null,
          whatsapp: cliente.telefono?.trim() || null,
          direccion_domicilio: cliente.direccion?.trim() || null,
          ciudad: cliente.ciudad?.trim() || null,
          provincia: cliente.provincia?.trim() || null,
          pais: cliente.pais || 'Ecuador'
        },
        contrato: {
          tipo_envio: fechas.tipo_entrega === 'Envío' ? 'envio' : 'retiro',
          fecha_salida: fechaSalidaFull,
          fecha_evento: fechaEventoFull || null,
          fecha_devolucion: fechaDevolucionFull,
          dias_alquiler: diasAlquiler,
          precio_por_dia: diasAlquiler > 1 ? (parseFloat(precioPorDia) || subtotalBase) : null,
          subtotal_alquiler: diasAlquiler > 1 ? subTotalCalc : null,
          fecha_devolucion_modificada: devolucionModificada,
          subtotal: subTotalCalc,
          monto_descuento: descuento,
          total: totalCalc,
          tipo_garantia: tipoGarantiaPayload,
          descripcion_garantia: garantia.descripcion?.trim() || null,
          codigo_cupon: cupon?.trim() || null,
          descuento_cupon: descuento
        },
        productos: productosCarrito.map(prod => ({
          id: prod.id,
          nombre: prod.nombre,
          cantidad_total: prod.cantidad_total,
          precio_unitario: Number(prod.precio_unitario),
          piezas: prod.piezas.map(pz => ({
            id: pz.id,
            nombre: pz.nombre,
            tallasCantidades: pz.tallasCantidades || {}
          }))
        })),
        pago_anticipo: {
          monto: montoAnticipoParsed,
          metodo_pago: metodoPago,
          notas: `Anticipo al crear contrato — Método: ${metodoPago}`,
          nombre_registrador_snapshot: profile.nombre_completo || 'Empleado'
        }
      };

      const { data, error } = await supabase.rpc('crear_contrato_completo', { payload });

      if (error) {
        // Errores de red o de autenticación
        throw new Error(error.message || 'Error de conexión al guardar el contrato');
      }

      if (!data) {
        throw new Error('La operación no devolvió respuesta. Verifica la conexión.');
      }

      if (!data.success) {
        // Error controlado devuelto por la RPC (RAISE EXCEPTION capturado)
        const msg = data.error || 'Error desconocido al crear el contrato';
        throw new Error(msg);
      }

      setContratoId(data.contrato_id);
      setContratoGuardado(true);
      // Obtener el código legible generado por el trigger
      const { data: cData } = await supabase.from('contratos').select('codigo').eq('id', data.contrato_id).single();
      setContratoCodigo(cData?.codigo || null);
      toast.success(`¡Contrato creado! Estado: Reservado. Anticipo $${montoAnticipoParsed.toFixed(2)} registrado.`);
    } catch (e) {
      console.error('Error guardando contrato:', e);
      toast.error(e.message || 'Error inesperado al guardar el contrato');
    } finally {
      setGuardando(false);
    }
  };


  // ==== RENDER PRINCIPAL ====
  return (
    <div className="animate-in fade-in duration-500 pb-20">
       <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Navegación de Pasos (Wizard Vertical/Lateral) */}
          <div className="lg:w-64 shrink-0">
             <div className="glass-card p-6 sticky top-24">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-6 border-b border-[var(--border-soft)] pb-4">Progreso del Contrato</h3>
                <nav className="space-y-4">
                  {[
                    { n: 1, title: 'Datos del Cliente', icon: User },
                    { n: 2, title: 'Fechas y Tipo', icon: Calendar },
                    { n: 3, title: 'Productos y Tallas', icon: PackageSearch },
                    { n: 4, title: 'Resumen Financiero', icon: CreditCard },
                    { n: 5, title: 'Garantía', icon: ShieldCheck },
                    { n: 6, title: 'Acciones Finales', icon: CheckCircle2 }
                  ].map((s) => (
                    <button 
                      key={s.n}
                      onClick={() => !contratoGuardado && setStep(s.n)}
                      disabled={contratoGuardado && s.n !== 6}
                      className={`w-full flex items-center gap-4 text-left p-3 rounded-xl transition-all ${step === s.n ? 'bg-primary shadow-lg shadow-primary/20 text-white' : 'hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)]'}`}
                    >
                       <div className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-xs ${step === s.n ? 'bg-white/20' : 'bg-[var(--bg-surface)] border border-[var(--border-soft)]'}`}>{s.n}</div>
                       <div className="flex flex-col">
                          <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Paso {s.n}</span>
                          <span className="text-xs font-bold leading-tight">{s.title}</span>
                       </div>
                    </button>
                  ))}
                </nav>
             </div>
          </div>

          {/* Área de Contenido del Paso */}
          <div className="flex-1 max-w-4xl">
             <div className="glass-card p-8 md:p-12 relative overflow-hidden min-h-[600px] flex flex-col">
                 
                 {/* Estilizado de fondo */}
                 <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                    <ShieldCheck className="w-96 h-96 scale-150 rotate-12" />
                 </div>

                 {/* CONTENIDO PASO 1 */}
                 {step === 1 && (
                     <div className="animate-in slide-in-from-right-4 duration-300 flex-1 flex flex-col">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-[var(--text-primary)] mb-2">Búsqueda y Datos del Cliente</h2>
                        <p className="text-xs text-[var(--text-muted)] font-medium mb-8">Ingresa la cédula o RUC para auto-completar, o registra un cliente nuevo.</p>
                        
                        <div className="flex gap-4 mb-8">
                           <div className="relative flex-1 max-w-md group">
                               <input 
                                  type="text" 
                                  placeholder="Cédula o RUC del cliente..." 
                                  className="input-guambra h-14 text-lg font-mono font-bold tracking-widest"
                                  value={busquedaDoc}
                                  onChange={e => setBusquedaDoc(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && buscarCliente()}
                               />
                           </div>
                           <button onClick={buscarCliente} className="btn-guambra-secondary !px-8 h-14 flex items-center gap-2">
                             Buscar
                           </button>
                        </div>

                        {/* Tipo de Cliente Selector */}
                        <div className="flex gap-2 p-1 bg-[var(--bg-surface-2)] rounded-xl mb-6 w-fit border border-[var(--border-soft)]">
                            <button onClick={() => setClientType('natural')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${clientType === 'natural' ? 'bg-[var(--bg-surface-3)] text-[var(--text-primary)] border border-[var(--border-soft)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}><User className="w-4 h-4"/> Persona Natural</button>
                            <button onClick={() => setClientType('empresa')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${clientType === 'empresa' ? 'bg-[var(--bg-surface-3)] text-[var(--text-primary)] border border-[var(--border-soft)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}><Building2 className="w-4 h-4"/> Empresa</button>
                        </div>

                        {/* Formulario */}
                        <div className="space-y-6 flex-1">
                            {isClientReadOnly && (
                                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex justify-between items-center mb-6">
                                   <div className="flex items-center gap-3">
                                      <CheckCircle2 className="text-primary w-5 h-5"/>
                                      <span className="text-xs text-primary font-bold tracking-wide">Cliente encontrado y auto-completado.</span>
                                   </div>
                                   <button onClick={() => setIsClientReadOnly(false)} className="text-[10px] uppercase font-black tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-4 py-2 bg-[var(--bg-surface-3)] rounded-lg">Editar Datos</button>
                                </div>
                            )}

                            {clientType === 'natural' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                   <div>
                                     <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Cédula / Pasaporte <span className="text-red-400">*</span></label>
                                     <input type="text" className="input-guambra" readOnly={isClientReadOnly} value={cliente.identificacion} onChange={e => setCliente({...cliente, identificacion: e.target.value})} />
                                   </div>
                                   <div>
                                     <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Nombres Completos <span className="text-red-400">*</span></label>
                                     <input type="text" className="input-guambra" readOnly={isClientReadOnly} value={cliente.nombres} onChange={e => setCliente({...cliente, nombres: e.target.value})} placeholder="Ej: Juan Perez" />
                                   </div>
                                   <div>
                                     <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Email <span className="text-red-400">*</span></label>
                                     <input type="email" className="input-guambra" readOnly={isClientReadOnly} value={cliente.email} onChange={e => setCliente({...cliente, email: e.target.value})} />
                                   </div>
                                   <div>
                                     <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">WhatsApp <span className="text-red-400">*</span></label>
                                     <input type="tel" className="input-guambra" readOnly={isClientReadOnly} value={cliente.telefono} onChange={e => setCliente({...cliente, telefono: e.target.value})} />
                                   </div>
                                   
                                   <div className="md:col-span-2 grid grid-cols-3 gap-6 pt-4 border-t border-[var(--border-soft)]">
                                      <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">País <span className="text-red-400">*</span></label>
                                        <select className="input-guambra" readOnly={isClientReadOnly} value={cliente.pais} onChange={e => setCliente({...cliente, pais: e.target.value})}>
                                            <option>Ecuador</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Provincia <span className="text-red-400">*</span></label>
                                        <input type="text" className="input-guambra" readOnly={isClientReadOnly} value={cliente.provincia} onChange={e => setCliente({...cliente, provincia: e.target.value})} />
                                      </div>
                                      <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Ciudad <span className="text-red-400">*</span></label>
                                        <input type="text" className="input-guambra" readOnly={isClientReadOnly} value={cliente.ciudad} onChange={e => setCliente({...cliente, ciudad: e.target.value})} />
                                      </div>
                                   </div>

                                   <div className="md:col-span-2">
                                     <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Dirección de Domicilio <span className="text-red-400">*</span></label>
                                     <input type="text" className="input-guambra" readOnly={isClientReadOnly} value={cliente.direccion} onChange={e => setCliente({...cliente, direccion: e.target.value})} />
                                   </div>
                                   <div className="md:col-span-2">
                                     <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Dirección del Evento <span className="text-red-400">*</span></label>
                                     <input type="text" className="input-guambra" readOnly={isClientReadOnly} value={cliente.direccion_evento} onChange={e => setCliente({...cliente, direccion_evento: e.target.value})} />
                                   </div>

                                   <div className="pt-4 border-t border-[var(--border-soft)] md:col-span-2 grid grid-cols-2 gap-6">
                                      <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Ref. Nombre Alterno</label>
                                        <input type="text" className="input-guambra" readOnly={isClientReadOnly} value={cliente.referencia_nombre} onChange={e => setCliente({...cliente, referencia_nombre: e.target.value})} />
                                      </div>
                                      <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Ref. Celular Alterno</label>
                                        <input type="text" className="input-guambra" readOnly={isClientReadOnly} value={cliente.referencia_celular} onChange={e => setCliente({...cliente, referencia_celular: e.target.value})} />
                                      </div>
                                   </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                   <div>
                                     <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">RUC <span className="text-red-400">*</span></label>
                                     <input type="text" className="input-guambra" value={cliente.identificacion} onChange={e => setCliente({...cliente, identificacion: e.target.value})} />
                                   </div>
                                   <div>
                                     <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Nombre de la Empresa <span className="text-red-400">*</span></label>
                                     <input type="text" className="input-guambra" value={cliente.razon_social} onChange={e => setCliente({...cliente, razon_social: e.target.value})} />
                                   </div>
                                   <div className="md:col-span-2">
                                     <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Tipo de Empresa <span className="text-red-400">*</span></label>
                                     <input type="text" className="input-guambra" value={cliente.tipo_empresa} onChange={e => setCliente({...cliente, tipo_empresa: e.target.value})} />
                                   </div>
                                   <div className="md:col-span-2 grid grid-cols-3 gap-6 pt-4 border-t border-[var(--border-soft)]">
                                      <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">País <span className="text-red-400">*</span></label>
                                        <select className="input-guambra" value={cliente.pais} onChange={e => setCliente({...cliente, pais: e.target.value})}>
                                            <option>Ecuador</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Provincia <span className="text-red-400">*</span></label>
                                        <input type="text" className="input-guambra" value={cliente.provincia} onChange={e => setCliente({...cliente, provincia: e.target.value})} />
                                      </div>
                                      <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Ciudad <span className="text-red-400">*</span></label>
                                        <input type="text" className="input-guambra" value={cliente.ciudad} onChange={e => setCliente({...cliente, ciudad: e.target.value})} />
                                      </div>
                                   </div>
                                   <div className="md:col-span-2">
                                     <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Dirección de Domicilio <span className="text-red-400">*</span></label>
                                     <input type="text" className="input-guambra" value={cliente.direccion} onChange={e => setCliente({...cliente, direccion: e.target.value})} />
                                   </div>
                                   <div className="md:col-span-2 pt-4 border-t border-[var(--border-soft)] grid grid-cols-1 md:grid-cols-2 gap-6">
                                     <div className="md:col-span-2">
                                       <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Nombre del Responsable <span className="text-red-400">*</span></label>
                                       <input type="text" className="input-guambra" value={cliente.responsable_nombre} onChange={e => setCliente({...cliente, responsable_nombre: e.target.value})} />
                                     </div>
                                     <div>
                                       <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Celular del Responsable <span className="text-red-400">*</span></label>
                                       <input type="tel" className="input-guambra" value={cliente.responsable_celular} onChange={e => setCliente({...cliente, responsable_celular: e.target.value})} />
                                     </div>
                                     <div>
                                       <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Email del Responsable <span className="text-red-400">*</span></label>
                                       <input type="email" className="input-guambra" value={cliente.responsable_email} onChange={e => setCliente({...cliente, responsable_email: e.target.value})} />
                                     </div>
                                   </div>
                                </div>
                            )}
                        </div>
                     </div>
                 )}

                 {/* CONTENIDO PASO 2 */}
                 {step === 2 && (
                     <div className="animate-in slide-in-from-right-4 duration-300 flex-1 flex flex-col">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-[var(--text-primary)] mb-2">Fechas y Tipo de Contrato</h2>
                        <p className="text-xs text-[var(--text-muted)] font-medium mb-8">Establece la logística de entrega y las fechas para validación de stock automática.</p>
                        
                        <div className="space-y-8 flex-1">
                           <div>
                              <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-4 block">Tipo de Entrega <span className="text-red-400">*</span></label>
                              <div className="grid grid-cols-2 gap-4">
                                  <button onClick={() => setFechas({...fechas, tipo_entrega: 'Presencial'})} className={`h-24 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all group ${fechas.tipo_entrega === 'Presencial' ? 'bg-primary/10 border-primary text-primary shadow-[0_0_30px_-5px_var(--tw-shadow-color)] shadow-primary/30' : 'bg-[var(--bg-surface-2)] border-[var(--border-soft)] text-[var(--text-muted)] hover:bg-[var(--bg-surface-3)] hover:text-[var(--text-primary)]'}`}>
                                      <User className="w-6 h-6 group-hover:scale-110 transition-transform"/>
                                      <span className="text-[10px] font-black tracking-widest uppercase">Presencial</span>
                                  </button>
                                  <button onClick={() => setFechas({...fechas, tipo_entrega: 'Envío'})} className={`h-24 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all group ${fechas.tipo_entrega === 'Envío' ? 'bg-primary/10 border-primary text-primary shadow-[0_0_30px_-5px_var(--tw-shadow-color)] shadow-primary/30' : 'bg-[var(--bg-surface-2)] border-[var(--border-soft)] text-[var(--text-muted)] hover:bg-[var(--bg-surface-3)] hover:text-[var(--text-primary)]'}`}>
                                      <MapPin className="w-6 h-6 group-hover:scale-110 transition-transform"/>
                                      <span className="text-[10px] font-black tracking-widest uppercase text-center leading-tight">Envío Fuera<br/>de la Ciudad</span>
                                  </button>
                              </div>
                           </div>

                           {fechas.tipo_entrega === 'Envío' && (
                               <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start gap-4">
                                  <AlertTriangle className="text-amber-500 w-5 h-5 shrink-0 mt-0.5" />
                                  <p className="text-xs text-amber-500/90 font-medium leading-relaxed">
                                     <strong className="block mb-1 text-amber-500 uppercase tracking-widest text-[10px]">Aviso Importante</strong>
                                     La garantía será económica por transferencia bancaria (60% del total). El cliente deberá enviar contrato firmado escaneado y copia de cédula a color por ambos lados.
                                  </p>
                               </div>
                           )}

                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-[var(--bg-surface-2)] p-6 rounded-2xl border border-[var(--border-soft)]">
                                {/* SALIDA */}
                                <div>
                                   <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Fecha de Salida <span className="text-red-400">*</span></label>
                                   <input type="date" className="input-guambra dark-date" value={fechas.fecha_salida_date} onChange={e => handleSalidaChange('fecha_salida_date', e.target.value)} />
                                </div>
                                <div>
                                   <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Hora de Salida <span className="text-red-400">*</span></label>
                                   <select className="input-guambra" value={fechas.fecha_salida_time} onChange={e => handleSalidaChange('fecha_salida_time', e.target.value)}>
                                      {HORAS_DISPONIBLES.map(h => (
                                        <option key={`sal-${h}`} value={h}>{h}</option>
                                      ))}
                                   </select>
                                </div>

                                {/* EVENTO */}
                                <div>
                                   <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Fecha del Evento <span className="text-red-400">*</span></label>
                                   <input type="date" className="input-guambra dark-date" value={fechas.fecha_evento_date} onChange={e => setFechas({...fechas, fecha_evento_date: e.target.value})} />
                                </div>
                                <div>
                                   <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Hora del Evento <span className="text-red-400">*</span></label>
                                   <select className="input-guambra" value={fechas.fecha_evento_time} onChange={e => setFechas({...fechas, fecha_evento_time: e.target.value})}>
                                      {HORAS_DISPONIBLES.map(h => (
                                        <option key={`evt-${h}`} value={h}>{h}</option>
                                      ))}
                                   </select>
                                </div>

                                 {/* DEVOLUCIÓN — con botón lock/unlock */}
                                 <div className="pt-4 border-t border-[var(--border-soft)]">
                                    <div className="flex items-center gap-2 mb-2">
                                       <label className={`text-[10px] uppercase tracking-widest font-bold ${devolucionBloqueada ? 'text-primary' : 'text-amber-400'}`}>
                                          Fecha de Devolución {devolucionBloqueada ? <span className="text-[var(--text-muted)] normal-case">(+24h auto)</span> : <span className="text-amber-400/70 normal-case">(manual)</span>}
                                       </label>
                                       <button
                                          type="button"
                                          onClick={toggleDevolucionLock}
                                          title={devolucionBloqueada ? 'Desbloquear para editar manualmente' : 'Bloquear y usar +24h automático'}
                                          className={`p-1.5 rounded-lg transition-all ${devolucionBloqueada ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 ring-1 ring-amber-500/30'}`}
                                       >
                                          {devolucionBloqueada ? <Lock className="w-3.5 h-3.5"/> : <Unlock className="w-3.5 h-3.5"/>}
                                       </button>
                                    </div>
                                    <input
                                      type="date"
                                      className={`input-guambra dark-date ${devolucionBloqueada ? 'bg-[var(--bg-surface-2)] text-primary opacity-80' : 'bg-amber-500/5 border-amber-500/30 text-amber-400'}`}
                                      disabled={devolucionBloqueada}
                                      readOnly={devolucionBloqueada}
                                      value={fechas.fecha_devolucion_date}
                                      onChange={e => handleDevolucionChange('fecha_devolucion_date', e.target.value)}
                                    />
                                 </div>
                                 <div className="pt-4 border-t border-[var(--border-soft)]">
                                    <label className={`text-[10px] uppercase tracking-widest font-bold mb-2 block ${devolucionBloqueada ? 'text-primary' : 'text-amber-400'}`}>
                                       Hora de Devolución {devolucionBloqueada ? <span className="text-[var(--text-muted)] normal-case">(auto)</span> : <span className="text-amber-400/70 normal-case">(manual)</span>}
                                    </label>
                                    <select
                                      className={`input-guambra ${devolucionBloqueada ? 'bg-[var(--bg-surface-2)] text-primary opacity-80' : 'bg-amber-500/5 border-amber-500/30 text-amber-400'}`}
                                      disabled={devolucionBloqueada}
                                      value={fechas.fecha_devolucion_time}
                                      onChange={e => handleDevolucionChange('fecha_devolucion_time', e.target.value)}
                                    >
                                       {HORAS_DISPONIBLES.map(h => (
                                         <option key={`dev-${h}`} value={h}>{h}</option>
                                       ))}
                                       {/* Si la hora auto no está en la lista, agregarla */}
                                       {!HORAS_DISPONIBLES.includes(fechas.fecha_devolucion_time) && fechas.fecha_devolucion_time && (
                                         <option value={fechas.fecha_devolucion_time}>{fechas.fecha_devolucion_time}</option>
                                       )}
                                    </select>
                                    <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest mt-2">
                                       {devolucionBloqueada ? '+24 horas posteriores a la salida del traje.' : 'Ingresa la fecha y hora de devolución acordada con el cliente.'}
                                    </p>
                                 </div>

                                 {/* Indicador de Días de Alquiler */}
                                 {fechas.fecha_salida_date && fechas.fecha_devolucion_date && (
                                    <div className="md:col-span-2 mt-2">
                                       <div className={`p-4 rounded-xl flex items-center justify-between ${diasAlquiler > 1 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-primary/10 border border-primary/20'}`}>
                                          <div className="flex items-center gap-3">
                                             <Calendar className={`w-5 h-5 ${diasAlquiler > 1 ? 'text-amber-400' : 'text-primary'}`}/>
                                             <div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${diasAlquiler > 1 ? 'text-amber-400' : 'text-primary'}`}>Días de Alquiler</span>
                                                {diasAlquiler > 1 && devolucionModificada && (
                                                   <p className="text-[9px] text-amber-400/60 mt-0.5">Fecha de devolución modificada manualmente</p>
                                                )}
                                             </div>
                                          </div>
                                          <span className={`font-mono text-2xl font-black ${diasAlquiler > 1 ? 'text-amber-400' : 'text-primary'}`}>{diasAlquiler}</span>
                                       </div>
                                    </div>
                                 )}
                             </div>
                        </div>
                     </div>
                 )}

                 {/* CONTENIDO PASO 3 */}
                 {step === 3 && (
                     <div className="animate-in slide-in-from-right-4 duration-300 flex-1 flex flex-col">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-[var(--text-primary)] mb-2">Selección de Productos y Tallas</h2>
                        <p className="text-xs text-[var(--text-muted)] font-medium mb-6">Agrega los trajes, define la cantidad total y distribuye tallas por pieza.</p>
                        
                         <div className="relative z-20 mb-8">
                            <div className="relative">
                               <input 
                                  type="text" 
                                  className="input-guambra h-14" 
                                  placeholder="Buscar producto por nombre o modelo..."
                                  value={busquedaProd}
                                  onChange={(e) => realizarBusquedaProd(e.target.value)}
                               />
                               {buscandoProd && busquedaProd.length >= 2 && (
                                 <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                   <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
                                 </div>
                               )}
                            </div>
                            {/* Resultados del buscador */}
                            {!buscandoProd && resultadosProd.length > 0 && (
                                <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-2xl shadow-2xl p-2 max-h-72 overflow-y-auto z-30">
                                   {resultadosProd.map(prod => (
                                       <div key={prod.id} className="flex items-center justify-between p-3 hover:bg-[var(--bg-surface-2)] rounded-xl transition-all cursor-pointer group">
                                          <div className="flex items-center gap-4">
                                             <div className="w-10 h-10 rounded-lg bg-[var(--bg-input)] border border-[var(--border-soft)] flex items-center justify-center overflow-hidden">
                                                {prod.thumbnail
                                                  ? <img src={prod.thumbnail} alt="" className="w-full h-full object-cover" />
                                                  : <PackageSearch className="w-5 h-5 text-[var(--text-muted)]" />}
                                             </div>
                                             <div>
                                                <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-primary transition-colors">{prod.nombre}</h4>
                                                <span className="text-[10px] font-black tracking-widest uppercase text-[var(--text-muted)]">${prod.precio_unitario}</span>
                                             </div>
                                          </div>
                                          <button
                                            onClick={() => agregarProducto(prod)}
                                            disabled={cargandoPiezas === prod.id}
                                            className="btn-guambra-secondary !px-4 !py-2 text-[10px] flex gap-2 disabled:opacity-50"
                                          >
                                            {cargandoPiezas === prod.id
                                              ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"/>
                                              : <><Plus className="w-3 h-3"/> Agregar</>}
                                          </button>
                                       </div>
                                   ))}
                                </div>
                            )}
                            {/* Sin resultados */}
                            {!buscandoProd && busquedaProd.length >= 2 && resultadosProd.length === 0 && (
                              <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-2xl shadow-2xl p-4 text-center text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] z-30">
                                Sin productos para "{busquedaProd}" — verifica que estén activos en Inventario
                              </div>
                            )}
                         </div>

                        {/* Lista de productos en carrito */}
                        <div className="flex-1 space-y-4 overflow-y-auto pr-1 no-scrollbar pb-10">
                           {productosCarrito.length === 0 ? (
                               <div className="h-48 border-2 border-dashed border-[var(--border-soft)] rounded-2xl flex flex-col items-center justify-center text-[var(--text-muted)]">
                                  <PackageSearch className="w-10 h-10 mb-2"/>
                                  <span className="text-[10px] font-bold tracking-widest uppercase">Busca y agrega productos arriba</span>
                               </div>
                           ) : (
                               productosCarrito.map(prod => (
                                   <div key={prod.id} className={`rounded-2xl overflow-hidden shadow-lg border transition-all ${
                                     prod.fase === 'confirmado'
                                       ? 'bg-green-500/5 border-green-500/20'
                                       : 'bg-[var(--bg-surface-2)] border-[var(--border-soft)]'
                                   }`}>
                                     {/* Cabecera del producto */}
                                     <div className="p-4 bg-[var(--bg-surface-3)] flex justify-between items-center">
                                       <div>
                                         <h3 className="text-base font-black tracking-tight text-[var(--text-primary)]">{prod.nombre}</h3>
                                         <div className="flex items-center gap-3 mt-0.5">
                                           <span className="text-[10px] font-bold text-primary uppercase tracking-widest">${prod.precio_unitario} c/u</span>
                                           {prod.fase === 'confirmado' && (
                                             <span className="text-[10px] font-black text-green-400 uppercase tracking-widest flex items-center gap-1">
                                               <CheckCircle2 className="w-3 h-3"/> {prod.cantidad_total} unidades · ${(prod.precio_unitario * prod.cantidad_total).toFixed(2)}
                                             </span>
                                           )}
                                         </div>
                                       </div>
                                       <div className="flex items-center gap-2">
                                         {prod.fase === 'confirmado' && (
                                           <button onClick={() => editarTallas(prod.id)} className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-primary transition-colors px-3 py-1.5 bg-[var(--bg-surface-3)] rounded-lg">Editar tallas</button>
                                         )}
                                         <button onClick={() => quitarProducto(prod.id)} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                                           <Trash2 className="w-4 h-4" />
                                         </button>
                                       </div>
                                     </div>

                                     {/* FASE A: Cantidad total */}
                                     {prod.fase === 'cantidad' && (
                                       <div className="p-5 space-y-4">
                                         <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Paso A — ¿Cuántos trajes/unidades de este producto va a llevar el cliente?</p>
                                         <div className="flex items-center gap-4">
                                           <div className="relative">
                                             <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                             <input
                                               type="number" min="1"
                                               className="input-guambra pl-10 w-40 text-center text-xl font-black"
                                               value={prod.cantidad_total}
                                               onChange={e => setProductosCarrito(prev => prev.map(p =>
                                                 p.id === prod.id ? { ...p, cantidad_total: Math.max(1, parseInt(e.target.value, 10) || 1) } : p
                                               ))}
                                             />
                                           </div>
                                           <button
                                             onClick={() => confirmarCantidadTotal(prod.id)}
                                             className="btn-guambra-primary !px-6 h-12 flex items-center gap-2"
                                           >
                                             <CheckCircle2 className="w-4 h-4"/> Confirmar cantidad
                                           </button>
                                         </div>
                                       </div>
                                     )}

                                     {/* FASE B: Distribución de tallas */}
                                     {prod.fase === 'tallas' && (
                                       <div className="p-5 space-y-4">
                                         <div className="flex items-center justify-between">
                                           <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                             Paso B — Distribuye {prod.cantidad_total} unidad{prod.cantidad_total > 1 ? 'es' : ''} entre las tallas de cada pieza
                                           </p>
                                         </div>
                                         {prod.piezas.length === 0 ? (
                                           <div className="py-4 text-center text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">
                                             Este producto no tiene piezas vinculadas
                                           </div>
                                         ) : (
                                           <div className="space-y-4">
                                             {prod.piezas.map(pieza => {
                                               const asignado = totalAsignadoPieza(pieza);
                                               const ok = asignado === prod.cantidad_total;
                                               const excede = asignado > prod.cantidad_total;
                                               return (
                                                 <div key={pieza.id} className="bg-[var(--bg-surface-2)] rounded-xl p-4 border border-[var(--border-soft)]">
                                                   <div className="flex justify-between items-center mb-3">
                                                     <span className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wide">{pieza.nombre}</span>
                                                     <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1 ${
                                                       ok ? 'text-green-400 bg-green-500/10' :
                                                       excede ? 'text-red-400 bg-red-500/10' :
                                                       'text-amber-400 bg-amber-500/10'
                                                     }`}>
                                                       {ok ? <CheckCircle2 className="w-3 h-3"/> : excede ? <XCircle className="w-3 h-3"/> : <AlertTriangle className="w-3 h-3"/>}
                                                       {asignado} / {prod.cantidad_total}
                                                     </span>
                                                   </div>
                                                   {pieza.tallasDisponibles.length === 0 ? (
                                                     <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">Sin tallas registradas en stock</p>
                                                   ) : (
                                                     <div className="grid gap-2">
                                                       {pieza.tallasDisponibles.map(tallaInfo => {
                                                         const cantActual = pieza.tallasCantidades[tallaInfo.talla] ?? 0;
                                                         const stockOk = cantActual <= tallaInfo.stock;
                                                         return (
                                                           <div key={tallaInfo.talla} className="flex items-center gap-3">
                                                             <span className={`text-[10px] font-black w-12 text-center py-1 rounded-md ${
                                                               tallaInfo.stock === 0 ? 'text-[var(--text-muted)] bg-[var(--bg-surface-2)]' : 'text-[var(--text-primary)] bg-[var(--bg-surface-3)]'
                                                             }`}>{tallaInfo.talla}</span>
                                                             <span className="text-[10px] text-[var(--text-muted)] w-20">Stock: {tallaInfo.stock}</span>
                                                             <input
                                                               type="number" min="0" max={tallaInfo.stock}
                                                               disabled={tallaInfo.stock === 0}
                                                               className={`w-20 px-3 py-1.5 rounded-lg text-center text-xs font-black border transition-colors ${
                                                                 !stockOk
                                                                   ? 'bg-red-500/10 border-red-500/40 text-red-400'
                                                                   : cantActual > 0
                                                                   ? 'bg-primary/10 border-primary/40 text-[var(--text-primary)]'
                                                                   : 'bg-[var(--bg-input)] border-[var(--border-soft)] text-[var(--text-primary)]'
                                                               } disabled:opacity-30 disabled:cursor-not-allowed`}
                                                               value={cantActual}
                                                               onChange={e => updateTallaCantidad(prod.id, pieza.id, tallaInfo.talla, e.target.value)}
                                                             />
                                                             {!stockOk && cantActual > 0 && (
                                                               <span className="text-[9px] text-red-400 font-bold">Excede stock</span>
                                                             )}
                                                           </div>
                                                         );
                                                       })}
                                                     </div>
                                                   )}
                                                 </div>
                                               );
                                             })}
                                           </div>
                                         )}
                                         <button
                                           onClick={() => confirmarTallas(prod.id)}
                                           disabled={!piezasValidas(prod)}
                                           className={`w-full h-12 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                                             piezasValidas(prod)
                                               ? 'bg-green-500 text-white hover:bg-green-400 shadow-lg shadow-green-500/20'
                                               : 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] cursor-not-allowed'
                                           }`}
                                         >
                                           <CheckCircle2 className="w-4 h-4"/> Guardar distribución de tallas
                                         </button>
                                       </div>
                                     )}

                                     {/* FASE C: Confirmado — resumen */}
                                     {prod.fase === 'confirmado' && (
                                       <div className="px-5 pb-4">
                                         <div className="grid gap-1.5">
                                           {prod.piezas.map(pz => {
                                             const tallasUsadas = Object.entries(pz.tallasCantidades || {}).filter(([,c]) => c > 0);
                                             if (tallasUsadas.length === 0) return null;
                                             return (
                                               <div key={pz.id} className="flex items-center gap-2 text-[10px]">
                                                 <span className="text-[var(--text-muted)] font-bold uppercase tracking-wide w-24 truncate">{pz.nombre}:</span>
                                                 <div className="flex flex-wrap gap-1">
                                                   {tallasUsadas.map(([t, c]) => (
                                                     <span key={t} className="px-2 py-0.5 bg-primary/10 text-primary rounded-md font-black">
                                                       {t} × {c}
                                                     </span>
                                                   ))}
                                                 </div>
                                               </div>
                                             );
                                           })}
                                           {prod.piezas.length === 0 && (
                                             <span className="text-[10px] text-[var(--text-muted)]">Sin piezas vinculadas</span>
                                           )}
                                         </div>
                                       </div>
                                     )}
                                   </div>
                               ))
                           )}
                        </div>

                        {/* Aviso si hay productos sin confirmar */}
                        {productosCarrito.length > 0 && !todosConfirmados && (
                          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0"/>
                            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Confirma todos los productos y sus tallas para continuar al paso siguiente.</p>
                          </div>
                        )}
                     </div>
                 )}

                 {/* CONTENIDO PASO 4 */}
                 {step === 4 && (
                     <div className="animate-in slide-in-from-right-4 duration-300 flex-1 flex flex-col">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-[var(--text-primary)] mb-2">Detalle de Precio y Pagos</h2>
                        <p className="text-xs text-[var(--text-muted)] font-medium mb-8">Revisa los montos, aplica descuentos y define el método de pago del anticipo obligatorio.</p>

                        {/* Tabla de facturación con cantidad real */}
                        <div className="glass-card overflow-hidden mb-6 border border-[var(--border-soft)]">
                           <table className="w-full text-left">
                              <thead className="bg-[var(--bg-surface-2)] border-b border-[var(--border-soft)]">
                                 <tr>
                                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Producto</th>
                                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-center">Cant.</th>
                                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">P. Unitario</th>
                                    <th className="p-4 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Subtotal</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-[var(--border-soft)]">
                                 {productosCarrito.map(p => {
                                   const sub = (Number(p.precio_unitario) * Number(p.cantidad_total)).toFixed(2);
                                   return (
                                    <tr key={p.id}>
                                       <td className="p-4 text-sm font-bold text-[var(--text-primary)]">{p.nombre}</td>
                                       <td className="p-4 text-sm text-center font-mono font-black text-primary">{p.cantidad_total}</td>
                                       <td className="p-4 text-sm text-right text-[var(--text-secondary)]">${Number(p.precio_unitario).toFixed(2)}</td>
                                       <td className="p-4 text-sm font-black text-[var(--text-primary)] text-right font-mono">${sub}</td>
                                    </tr>
                                   );
                                 })}
                                 {productosCarrito.length === 0 && (
                                    <tr><td colSpan="4" className="p-6 text-center text-xs text-[var(--text-muted)] uppercase tracking-widest font-bold">No hay productos en el contrato.</td></tr>
                                 )}
                              </tbody>
                           </table>
                        </div>

                         {/* ZONA DE FACTURACIÓN MULTI-DÍA — visible cuando días > 1 */}
                         {diasAlquiler > 1 && (
                            <div className="mb-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 animate-in slide-in-from-top-4 duration-300">
                               <div className="flex items-center gap-3 mb-5">
                                  <Calendar className="w-5 h-5 text-amber-400"/>
                                  <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-400">Facturación por Días de Alquiler</h3>
                                  <span className="ml-auto px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-black">{diasAlquiler} días</span>
                               </div>

                               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  {/* Días de alquiler — solo lectura */}
                                  <div>
                                     <label className="text-[10px] uppercase tracking-widest font-bold text-amber-400/70 mb-2 block">Días de Alquiler</label>
                                     <div className="input-guambra bg-amber-500/10 border-amber-500/30 text-amber-400 font-mono text-xl font-black flex items-center justify-center cursor-not-allowed">
                                        {diasAlquiler}
                                     </div>
                                     <p className="text-[9px] text-[var(--text-muted)] mt-1 uppercase tracking-widest">Calculado automáticamente</p>
                                  </div>

                                  {/* Precio por día — editable */}
                                  <div>
                                     <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Precio por Día <span className="text-amber-400/60 normal-case">(editable)</span></label>
                                     <div className="relative">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-black text-sm pointer-events-none">$</span>
                                        <input
                                          type="number" step="0.01" min="0"
                                          style={{ paddingLeft: '3rem' }}
                                          className="input-guambra font-mono text-lg font-black text-[var(--text-primary)]"
                                          placeholder={`Sugerido: $${subtotalBase.toFixed(2)}`}
                                          value={precioPorDia}
                                          onChange={e => {
                                             setPrecioPorDia(e.target.value);
                                             setPrecioPorDiaManual(true);
                                             // Recalcular subtotal si no fue modificado manualmente
                                             if (!subtotalAlquilerManual) {
                                                const ppd = parseFloat(e.target.value) || 0;
                                                setSubtotalAlquiler((ppd * diasAlquiler).toFixed(2));
                                             }
                                          }}
                                          onBlur={() => {
                                             if (!precioPorDia || precioPorDia === '0') {
                                                setPrecioPorDia(subtotalBase.toFixed(2));
                                                setPrecioPorDiaManual(false);
                                             }
                                          }}
                                        />
                                     </div>
                                     <p className="text-[9px] text-[var(--text-muted)] mt-1 uppercase tracking-widest">
                                        Base del producto: <span className="text-primary">${subtotalBase.toFixed(2)}</span>
                                     </p>
                                  </div>

                                  {/* Subtotal de alquiler — editable */}
                                  <div>
                                     <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Subtotal Alquiler <span className="text-amber-400/60 normal-case">(editable)</span></label>
                                     <div className="relative">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-black text-sm pointer-events-none">$</span>
                                        <input
                                          type="number" step="0.01" min="0"
                                          style={{ paddingLeft: '3rem' }}
                                          className={`input-guambra font-mono text-lg font-black ${subtotalFueModificado ? 'border-amber-500/50 bg-amber-500/5' : ''}`}
                                          placeholder={`Auto: $${subtotalAlquilerSugerido.toFixed(2)}`}
                                          value={subtotalAlquiler}
                                          onChange={e => {
                                             setSubtotalAlquiler(e.target.value);
                                             setSubtotalAlquilerManual(true);
                                          }}
                                          onBlur={() => {
                                             if (!subtotalAlquiler || subtotalAlquiler === '0') {
                                                setSubtotalAlquiler(subtotalAlquilerSugerido.toFixed(2));
                                                setSubtotalAlquilerManual(false);
                                             }
                                          }}
                                        />
                                     </div>
                                     <p className="text-[9px] text-[var(--text-muted)] mt-1 uppercase tracking-widest">
                                        Sugerido: <span className="text-primary">${subtotalAlquilerSugerido.toFixed(2)}</span> ({diasAlquiler} × ${(parseFloat(precioPorDia) || 0).toFixed(2)})
                                     </p>
                                  </div>
                               </div>

                               {/* Advertencia si el subtotal fue modificado manualmente */}
                               {subtotalFueModificado && (
                                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 animate-in fade-in duration-300">
                                     <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0"/>
                                     <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                                        El subtotal fue modificado manualmente. Difiere del cálculo automático (${subtotalAlquilerSugerido.toFixed(2)}).
                                     </p>
                                  </div>
                               )}
                            </div>
                         )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                           {/* Izquierda: Descuentos y Metodo */}
                           <div className="space-y-6">
                              <div>
                                 <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Código de Descuento</label>
                                 <div className="flex gap-2">
                                    <input type="text" className="input-guambra uppercase font-mono" placeholder="EJ: DESC10" value={cupon} onChange={e => setCupon(e.target.value.toUpperCase())} />
                                    <button onClick={aplicarCupon} className="btn-guambra-secondary bg-[var(--bg-surface-2)] text-xs !px-6">Aplicar</button>
                                 </div>
                              </div>
                              <div className="pt-4 border-t border-[var(--border-soft)]">
                                 <label className="text-[10px] uppercase tracking-widest font-bold text-primary mb-2 block flex items-center gap-2"><CreditCard className="w-4 h-4"/> Método Pago Anticipo <span className="text-red-400">*</span></label>
                                 <select className="input-guambra py-4 text-sm" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                                    <option value="">Seleccione un método...</option>
                                    {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                                 </select>
                              </div>

                              <div className="pt-4 border-t border-[var(--border-soft)]">
                                 <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1 block">
                                    Monto del anticipo <span className="text-[var(--text-muted)]">(pre-llenado al 50%)</span>
                                 </label>
                                 <div className="relative">
                                     <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-black text-sm pointer-events-none">$</span>
                                     <input
                                       type="number" step="0.01" min="0"
                                       style={{ paddingLeft: '3rem' }}
                                       className="input-guambra font-mono text-xl"
                                      placeholder={`Min. recomendado: $${anticipo.toFixed(2)}`}
                                      value={montoAnticipo}
                                      onChange={e => setMontoAnticipo(e.target.value)}
                                      onFocus={() => { if (!montoAnticipo) setMontoAnticipo(anticipo.toFixed(2)); }}
                                    />
                                 </div>
                                 <p className="text-[9px] text-[var(--text-muted)] mt-1 font-bold uppercase tracking-widest">
                                    50% sugerido: <span className="text-primary">${anticipo.toFixed(2)}</span>
                                 </p>
                              </div>

                              <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-start gap-4">
                                <AlertTriangle className="text-primary w-5 h-5 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-primary/90 font-bold uppercase tracking-widest leading-relaxed">
                                   El contrato se guardará como <strong>Reservado</strong> directamente. Asegúrate de recibir el anticipo en mano antes de guardar.
                                </p>
                              </div>
                           </div>

                           {/* Derecha: Resumen Math */}
                           <div className="bg-[var(--bg-surface-2)] p-6 rounded-3xl border border-[var(--border-soft)] space-y-4 shadow-xl">
                              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border-soft)] pb-4 mb-4">Resumen Financiero</h3>
                              
                              {diasAlquiler > 1 && (
                                 <>
                                    <div className="flex justify-between items-center">
                                       <span className="text-xs font-bold text-[var(--text-muted)]">Precio base (1 día)</span>
                                       <span className="font-mono text-sm text-[var(--text-muted)]">${subtotalBase.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-amber-400">
                                       <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                          <Calendar className="w-3 h-3"/> {diasAlquiler} días × ${(parseFloat(precioPorDia) || 0).toFixed(2)}
                                       </span>
                                       <span className="font-mono text-sm font-black">${subtotal.toFixed(2)}</span>
                                    </div>
                                 </>
                              )}
                              
                              <div className="flex justify-between items-center">
                                 <span className="text-xs font-bold text-[var(--text-secondary)]">{diasAlquiler > 1 ? 'Subtotal Alquiler' : 'Subtotal Parcial'}</span>
                                 <span className="font-mono text-sm text-[var(--text-primary)]">$${subtotal.toFixed(2)}</span>
                              </div>
                              {descuento > 0 && (
                                  <div className="flex justify-between items-center text-green-400">
                                     <span className="text-xs font-bold uppercase tracking-widest">Descuento</span>
                                     <span className="font-mono text-sm">-${descuento.toFixed(2)}</span>
                                  </div>
                              )}
                              <div className="border-t border-[var(--border-soft)] my-4 pt-4 flex justify-between items-end">
                                 <span className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest">Total a Pagar</span>
                                 <span className="font-mono text-3xl font-black text-[var(--text-primary)]">${total.toFixed(2)}</span>
                              </div>
                              <div className="bg-primary border border-primary shadow-lg shadow-primary/20 rounded-xl p-4 flex justify-between items-center text-white mt-4">
                                 <span className="text-xs font-black uppercase tracking-widest flex items-center gap-2">Anticipo Req. (50%)</span>
                                 <span className="font-mono text-2xl font-black">${anticipo.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center pt-2">
                                 <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Saldo al retirar</span>
                                 <span className="font-mono text-sm text-[var(--text-muted)] font-bold">${(total - anticipo).toFixed(2)}</span>
                              </div>
                           </div>
                        </div>
                     </div>
                 )}

                 {/* CONTENIDO PASO 5 */}
                 {step === 5 && (
                     <div className="animate-in slide-in-from-right-4 duration-300 flex-1 flex flex-col">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-[var(--text-primary)] mb-2">Garantía del Contrato</h2>
                        <p className="text-xs text-[var(--text-muted)] font-medium mb-8">Información opcional al reservar. Se exige obligatoriamente al entregar las prendas.</p>

                        <div className="max-w-xl mx-auto w-full my-auto space-y-8 glass-card p-10">
                           <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-4 mb-8">
                                <AlertTriangle className="text-blue-400 w-5 h-5 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest leading-relaxed">
                                   La garantía se completa en el momento en que el cliente retira los trajes físicos, no al reservar. Puedes precargar la info ahora si lo deseas.
                                </p>
                            </div>

                           <div>
                              <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-4 block">Tipo de Garantía (Opcional)</label>
                              <div className="grid grid-cols-2 gap-4">
                                  <button disabled={fechas.tipo_entrega === 'Envío'} onClick={() => setGarantia({...garantia, tipo: 'Física'})} className={`h-16 rounded-2xl border flex items-center justify-center gap-3 transition-all ${garantia.tipo === 'Física' ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/20' : 'bg-[var(--bg-surface-2)] border-[var(--border-soft)] text-[var(--text-muted)] hover:bg-[var(--bg-surface-3)] hover:text-[var(--text-primary)]'} disabled:opacity-20 disabled:cursor-not-allowed`}>
                                      <span className="text-[10px] font-black tracking-widest uppercase">Física (Prenda/DNI)</span>
                                  </button>
                                  <button onClick={() => setGarantia({...garantia, tipo: 'Económica'})} className={`h-16 rounded-2xl border flex items-center justify-center gap-3 transition-all ${garantia.tipo === 'Económica' ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/20' : 'bg-[var(--bg-surface-2)] border-[var(--border-soft)] text-[var(--text-muted)] hover:bg-[var(--bg-surface-3)] hover:text-[var(--text-primary)]'}`}>
                                      <span className="text-[10px] font-black tracking-widest uppercase">Económica (60%)</span>
                                  </button>
                              </div>
                           </div>

                           <div>
                              <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Descripción Detallada</label>
                              <textarea className="input-guambra min-h-[120px]" placeholder="Ej: Laptop Dell gris con cargador original num serie: XXXXX. O datos de transferencia bancaria..." value={garantia.descripcion} onChange={e => setGarantia({...garantia, descripcion: e.target.value})}></textarea>
                           </div>
                        </div>
                     </div>
                 )}

                 {/* CONTENIDO PASO 6 */}
                 {step === 6 && (
                     <div className="animate-in slide-in-from-right-4 duration-300 flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full text-center">
                        <CheckCircle2 className="w-24 h-24 text-primary mb-6 drop-shadow-[0_0_30px_rgba(255,107,0,0.5)]" />
                        <h2 className="text-4xl font-black uppercase tracking-tighter text-[var(--text-primary)] mb-4">Todo Listo</h2>
                        <p className="text-sm text-[var(--text-secondary)] font-medium mb-12 max-w-md mx-auto">Revisa rápidamente los detalles. Al guardar, el contrato quedará como <strong className="text-amber-400">Reservado</strong> y el anticipo se registrará automáticamente.</p>
                     
                        {!contratoGuardado ? (
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <button onClick={() => setStep(1)} disabled={guardando} className="btn-guambra-secondary !py-4 h-16 w-full text-xs">Volver y Editar</button>
                                <button
                                  onClick={handleGuardarContrato}
                                  disabled={guardando}
                                  className="btn-guambra-primary !py-4 h-16 w-full text-sm flex items-center justify-center gap-2 group disabled:opacity-60"
                                >
                                  {guardando
                                    ? <><Loader2 className="w-5 h-5 animate-spin"/> Guardando...</>
                                    : <><CheckCircle2 className="w-5 h-5"/> Guardar Contrato</>}
                                </button>
                            </div>
                        ) : (
                            <div className="w-full space-y-6 animate-in slide-in-from-bottom-8 duration-500">
                                <div className="p-6 bg-[var(--bg-surface-2)] border border-[var(--border-soft)] rounded-2xl flex flex-col gap-4">
                                   <div className="flex flex-col sm:flex-row gap-4">
                                      <button
                                        onClick={() => contratoId && toast.info(`Contrato ${contratoCodigo || contratoId.substring(0, 8).toUpperCase()} — Impresión disponible próximamente.`)}
                                        className="btn-guambra-primary !py-4 h-16 flex-1 text-sm flex items-center justify-center gap-2 group bg-blue-600 hover:bg-blue-500 border-none shadow-blue-500/20 shadow-xl">
                                         <Printer className="w-5 h-5"/> Imprimir Contrato (PDF)
                                      </button>
                                      <button onClick={() => {toast.success('Pago confirmado y notificado por WhatsApp'); setTimeout(() => onVolver?.(), 1500)}} className="btn-guambra-primary !py-4 h-16 flex-1 text-sm flex items-center justify-center gap-2 group">
                                         <CreditCard className="w-5 h-5"/> Confirmar Anticipo
                                      </button>
                                   </div>
                                   <button className="btn-guambra-secondary bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/30 !py-4 w-full text-xs">Rechazar / Cancelar Pedido</button>
                                </div>
                            </div>
                        )}
                     </div>
                 )}


                 {/* Footer de Navegación de Pasos (Oculto en paso final guardado) */}
                 {!contratoGuardado && (
                   <div className="mt-auto pt-8 border-t border-[var(--border-soft)] flex justify-between items-center relative z-20">
                      <button onClick={() => step > 1 && setStep(step - 1)} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                          <ChevronLeft className="w-4 h-4"/> Volver Anterior
                      </button>
                      
                      {step < 6 && (
                          <button
                            onClick={() => setStep(step + 1)}
                            disabled={step === 3 && !todosConfirmados && productosCarrito.length > 0}
                            className="btn-guambra-primary !px-8 h-12 flex items-center gap-2 group disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                              Continuar <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
                          </button>
                      )}
                   </div>
                 )}
                 
             </div>
          </div>
       </div>

    </div>
  );
}
