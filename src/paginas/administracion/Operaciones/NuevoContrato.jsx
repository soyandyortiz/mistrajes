import React, { useState, useEffect, useMemo, useRef } from 'react';
import { validarCedula, validarRUC, validarIdentificacion } from '../../../utils/validacionEcuador';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../stores/authStore';
import { toast } from 'sonner';
import {
  User, Building2, Calendar, MapPin, Search, Plus, Minus, Trash2, Loader2,
  CreditCard, ShieldCheck, Printer, CheckCircle2, ChevronRight,
  ChevronLeft, AlertTriangle, PackageSearch, XCircle, Hash,
  Lock, Unlock, Pencil, SlidersHorizontal
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
    // Datos comunes
    identificacion: '', nombres: '', email: '', telefono: '',
    pais: 'Ecuador', provincia: '', ciudad: '', direccion: '',
    // Referencias (natural y empresa)
    referencia_nombre: '', referencia_celular: '',
    referencia_nombre_2: '', referencia_celular_2: '',
    // Datos exclusivos empresa
    razon_social: '', ruc_empresa: '', tipo_empresa: '',
    responsable_nombre: '', responsable_celular: '', responsable_email: '',
  });
  // Dirección del evento: pertenece al contrato, no al cliente
  const [direccionEvento, setDireccionEvento] = useState('');

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
        const isEmpr = data.tipo_entidad === 'empresa';
        setClientType(isEmpr ? 'empresa' : 'natural');
        setCliente(prev => ({
          ...prev,
          // Datos comunes
          identificacion:      data.identificacion || '',
          nombres:             data.nombre_completo || '',
          email:               data.email || '',
          telefono:            data.whatsapp || '',
          direccion:           data.direccion_domicilio || '',
          ciudad:              data.ciudad || '',
          provincia:           data.provincia || '',
          pais:                data.pais || 'Ecuador',
          // Referencias
          referencia_nombre:   data.nombre_referencia || '',
          referencia_celular:  data.telefono_referencia || '',
          referencia_nombre_2: data.nombre_referencia_2 || '',
          referencia_celular_2:data.telefono_referencia_2 || '',
          // Empresa
          razon_social:        data.nombre_empresa || data.nombre_completo || '',
          ruc_empresa:         data.ruc_empresa || '',
          tipo_empresa:        data.tipo_empresa || '',
          responsable_nombre:  data.nombre_responsable_empresa || '',
          responsable_celular: data.telefono_responsable_empresa || '',
          responsable_email:   data.email_responsable_empresa || '',
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
  const searchRef = useRef(null);

  // Cerrar resultados al hacer clic fuera del cuadro de búsqueda
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setResultadosProd([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
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

  // Verificar stock disponible contra la BD (considerando contratos activos en el rango de fechas)
  const verificarStockDisponible = async (prodId) => {
    if (!fechaSalidaFull || !fechaDevolucionFull) return;
    const prod = productosCarrito.find(p => p.id === prodId);
    if (!prod) return;
    const piezaIds = prod.piezas.map(pz => pz.id).filter(Boolean);
    if (piezaIds.length === 0) return;

    setProductosCarrito(prev => prev.map(p =>
      p.id === prodId ? { ...p, _stockVerificando: true } : p
    ));

    try {
      const { data, error } = await supabase.rpc('obtener_stock_disponible_batch', {
        p_tenant_id:    profile.tenant_id,
        p_pieza_ids:    piezaIds,
        p_fecha_salida: fechaSalidaFull,
        p_fecha_dev:    fechaDevolucionFull,
      });
      if (error) throw error;

      // Mapa: { [pieza_id]: { [talla]: disponible } }
      const dispMap = {};
      (data || []).forEach(row => {
        if (!dispMap[row.pieza_id]) dispMap[row.pieza_id] = {};
        dispMap[row.pieza_id][row.etiqueta_talla] = row.disponible;
      });

      setProductosCarrito(prev => prev.map(p => {
        if (p.id !== prodId) return p;
        return {
          ...p,
          _stockVerificando: false,
          piezas: p.piezas.map(pz => ({
            ...pz,
            tallasDisponibles: pz.tallasDisponibles.map(t => ({
              ...t,
              stockDisponible: dispMap[pz.id]?.[t.talla] ?? t.stock,
            })),
          })),
        };
      }));
    } catch (e) {
      console.error('Error verificando stock disponible:', e);
      setProductosCarrito(prev => prev.map(p =>
        p.id === prodId ? { ...p, _stockVerificando: false } : p
      ));
    }
  };

  // Confirmar cantidad total → pasar a fase tallas y verificar stock
  const confirmarCantidadTotal = (prodId) => {
    const prod = productosCarrito.find(p => p.id === prodId);
    if (!prod) return;
    if (!prod.cantidad_total || prod.cantidad_total < 1)
      return toast.error('La cantidad debe ser al menos 1');
    setProductosCarrito(prev => prev.map(p => {
      if (p.id !== prodId) return p;
      // si no tiene piezas, confirmar directamente
      if (p.piezas.length === 0) return { ...p, fase: 'confirmado', _yaConfirmado: true };
      return { ...p, fase: 'tallas', _yaConfirmado: true };
    }));
    if (prod.piezas.length > 0) verificarStockDisponible(prodId);
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

  // Verifica si alguna talla supera el stock disponible (considerando reservas)
  const hayExcesoStock = (prod) =>
    prod.piezas.some(pz =>
      pz.tallasDisponibles.some(t => {
        const cant = pz.tallasCantidades[t.talla] ?? 0;
        const disp = t.stockDisponible ?? t.stock;
        return cant > disp && cant > 0;
      })
    );

  // Confirmar distribución de tallas → fase 'confirmado'
  const confirmarTallas = (prodId) => {
    setProductosCarrito(prev => prev.map(p => {
      if (p.id !== prodId) return p;
      if (!piezasValidas(p)) {
        toast.error('La suma de cantidades por talla debe igualar la cantidad total del producto en cada pieza.');
        return p;
      }
      if (hayExcesoStock(p)) {
        toast.error('Hay tallas con cantidad mayor al stock disponible. Reduce las cantidades indicadas en rojo.');
        return p;
      }
      return { ...p, fase: 'confirmado' };
    }));
  };

  // Volver a editar tallas (preserva tallasCantidades existentes)
  const editarTallas = (prodId) => {
    setProductosCarrito(prev => prev.map(p =>
      p.id === prodId ? { ...p, fase: 'tallas' } : p
    ));
    verificarStockDisponible(prodId);
  };

  // Volver a editar cantidad total (preserva tallasCantidades — el usuario ajusta en fase B)
  const editarCantidad = (prodId) => {
    setProductosCarrito(prev => prev.map(p =>
      p.id === prodId
        ? { ...p, fase: 'cantidad', _yaConfirmado: true, _cantidadAnterior: p.cantidad_total }
        : p
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

  const aplicarCupon = async () => {
    const codigo = cupon?.trim().toUpperCase();
    if (!codigo) return toast.error('Ingresa un código de descuento');
    try {
      const { data, error } = await supabase
        .from('cupones_descuento')
        .select('id, codigo, valor_descuento, es_activo')
        .eq('tenant_id', profile.tenant_id)
        .eq('codigo', codigo)
        .maybeSingle();
      if (error) throw error;
      if (!data) return toast.error('Código de descuento no encontrado');
      if (!data.es_activo) return toast.error('Este código está desactivado');
      const montoDesc = subtotal * (data.valor_descuento / 100);
      setDescuento(montoDesc);
      toast.success(`Cupón "${codigo}" aplicado: ${data.valor_descuento}% de descuento (-$${montoDesc.toFixed(2)})`);
    } catch (e) {
      console.error('Error verificando cupón:', e);
      toast.error('Error al verificar el código');
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
          pais: cliente.pais || 'Ecuador',
          // Contactos de referencia (comunes a natural y empresa)
          nombre_referencia:    cliente.referencia_nombre?.trim() || null,
          telefono_referencia:  cliente.referencia_celular?.trim() || null,
          nombre_referencia_2:  cliente.referencia_nombre_2?.trim() || null,
          telefono_referencia_2:cliente.referencia_celular_2?.trim() || null,
          // Datos exclusivos empresa
          nombre_empresa:               clientType === 'empresa' ? (cliente.razon_social?.trim() || null) : null,
          ruc_empresa:                  clientType === 'empresa' ? (cliente.ruc_empresa?.trim() || null) : null,
          tipo_empresa:                 clientType === 'empresa' ? (cliente.tipo_empresa?.trim() || null) : null,
          nombre_responsable_empresa:   clientType === 'empresa' ? (cliente.responsable_nombre?.trim() || null) : null,
          telefono_responsable_empresa: clientType === 'empresa' ? (cliente.responsable_celular?.trim() || null) : null,
          email_responsable_empresa:    clientType === 'empresa' ? (cliente.responsable_email?.trim() || null) : null,
        },
        contrato: {
          tipo_envio: fechas.tipo_entrega === 'Envío' ? 'envio' : 'retiro',
          direccion_evento: direccionEvento?.trim() || null,
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
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-[var(--text-primary)] mb-2">Datos del Cliente</h2>
                        <p className="text-xs text-[var(--text-muted)] font-medium mb-6">Ingresa la cédula o RUC para auto-completar datos del cliente, o registra uno nuevo.</p>

                        {/* Buscador de cliente */}
                        <div className="flex gap-3 mb-6">
                           <input
                              type="text"
                              placeholder="Cédula o RUC del cliente..."
                              className="input-guambra flex-1 h-14 text-lg font-mono font-bold tracking-widest"
                              value={busquedaDoc}
                              onChange={e => setBusquedaDoc(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && buscarCliente()}
                           />
                           <button onClick={buscarCliente} className="btn-guambra-secondary !px-8 h-14 flex items-center gap-2 shrink-0">
                             <Search className="w-4 h-4"/> Buscar
                           </button>
                        </div>

                        {/* Banner: cliente encontrado */}
                        {isClientReadOnly && (
                           <div className="flex items-center gap-3 p-3 rounded-2xl mb-5 border" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, var(--bg-surface))', borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)' }}>
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)' }}>
                                 <CheckCircle2 className="w-4 h-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-[10px] font-black uppercase tracking-widest text-primary">Cliente encontrado en el sistema</p>
                                 <p className="text-xs text-[var(--text-secondary)] font-medium truncate">{cliente.nombres || cliente.razon_social} · <span className="font-mono">{cliente.identificacion}</span></p>
                              </div>
                              <button
                                 onClick={() => setIsClientReadOnly(false)}
                                 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border transition-all shrink-0"
                                 style={{ color: 'var(--color-warning)', backgroundColor: 'var(--color-warning-subtle)', borderColor: 'var(--color-warning-border)' }}
                                 title="Desbloquear campos para editar manualmente"
                              >
                                 <Pencil className="w-3 h-3"/> Editar datos
                              </button>
                           </div>
                        )}

                        {/* Selector tipo de cliente */}
                        <div className="flex gap-2 p-1 bg-[var(--bg-surface-2)] rounded-xl mb-5 w-fit border border-[var(--border-soft)]">
                            <button disabled={isClientReadOnly} onClick={() => setClientType('natural')} className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 disabled:pointer-events-none ${clientType === 'natural' ? 'bg-[var(--bg-surface-3)] text-[var(--text-primary)] border border-[var(--border-soft)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}><User className="w-4 h-4"/> Persona Natural</button>
                            <button disabled={isClientReadOnly} onClick={() => setClientType('empresa')} className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 disabled:pointer-events-none ${clientType === 'empresa' ? 'bg-[var(--bg-surface-3)] text-[var(--text-primary)] border border-[var(--border-soft)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}><Building2 className="w-4 h-4"/> Empresa</button>
                        </div>

                        {/* ── SECCIÓN: DATOS DEL CLIENTE (bloqueables) ── */}
                        <fieldset disabled={isClientReadOnly} className="contents">
                           {clientType === 'natural' ? (
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                  <div>
                                    <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Cédula / Pasaporte <span className="text-red-400">*</span></label>
                                    <input type="text" className="input-guambra" value={cliente.identificacion} onChange={e => setCliente({...cliente, identificacion: e.target.value})} />
                                    {(() => { const r = validarIdentificacion(cliente.identificacion); return r.valido !== null ? <p className={`text-[9px] font-bold mt-1 ${r.valido ? 'text-green-400' : 'text-red-400'}`}>{r.valido ? '✓' : '✗'} {r.mensaje}</p> : null; })()}
                                  </div>
                                  <div>
                                    <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Nombres Completos <span className="text-red-400">*</span></label>
                                    <input type="text" className="input-guambra" value={cliente.nombres} onChange={e => setCliente({...cliente, nombres: e.target.value})} placeholder="Ej: Juan Pérez" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Email</label>
                                    <input type="email" className="input-guambra" value={cliente.email} onChange={e => setCliente({...cliente, email: e.target.value})} />
                                  </div>
                                  <div>
                                    <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">WhatsApp <span className="text-red-400">*</span></label>
                                    <input type="tel" className="input-guambra" value={cliente.telefono} onChange={e => setCliente({...cliente, telefono: e.target.value})} />
                                  </div>

                                  <div className="md:col-span-2 grid grid-cols-3 gap-5 pt-4 border-t border-[var(--border-soft)]">
                                     <div>
                                       <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">País</label>
                                       <select className="input-guambra" value={cliente.pais} onChange={e => setCliente({...cliente, pais: e.target.value})}>
                                           <option>Ecuador</option>
                                       </select>
                                     </div>
                                     <div>
                                       <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Provincia</label>
                                       <input type="text" className="input-guambra" value={cliente.provincia} onChange={e => setCliente({...cliente, provincia: e.target.value})} />
                                     </div>
                                     <div>
                                       <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Ciudad</label>
                                       <input type="text" className="input-guambra" value={cliente.ciudad} onChange={e => setCliente({...cliente, ciudad: e.target.value})} />
                                     </div>
                                  </div>

                                  <div className="md:col-span-2">
                                    <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Dirección de Domicilio</label>
                                    <input type="text" className="input-guambra" value={cliente.direccion} onChange={e => setCliente({...cliente, direccion: e.target.value})} />
                                  </div>

                                  <div className="pt-4 border-t border-[var(--border-soft)] md:col-span-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">Contactos de Referencia</p>
                                    <div className="grid grid-cols-2 gap-5">
                                      <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Referencia 1 — Nombre</label>
                                        <input type="text" className="input-guambra" value={cliente.referencia_nombre} onChange={e => setCliente({...cliente, referencia_nombre: e.target.value})} />
                                      </div>
                                      <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Referencia 1 — Celular</label>
                                        <input type="tel" className="input-guambra" value={cliente.referencia_celular} onChange={e => setCliente({...cliente, referencia_celular: e.target.value})} />
                                      </div>
                                      <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Referencia 2 — Nombre</label>
                                        <input type="text" className="input-guambra" value={cliente.referencia_nombre_2} onChange={e => setCliente({...cliente, referencia_nombre_2: e.target.value})} />
                                      </div>
                                      <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Referencia 2 — Celular</label>
                                        <input type="tel" className="input-guambra" value={cliente.referencia_celular_2} onChange={e => setCliente({...cliente, referencia_celular_2: e.target.value})} />
                                      </div>
                                    </div>
                                  </div>
                               </div>
                           ) : (
                               <div className="space-y-5 mb-5">

                                  {/* ── Identificación y nombre ── */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                      <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Nombre de la Empresa <span className="text-red-400">*</span></label>
                                      <input type="text" className="input-guambra" value={cliente.razon_social} onChange={e => setCliente({...cliente, razon_social: e.target.value})} placeholder="Ej: Corporación XYZ S.A." />
                                    </div>
                                    <div>
                                      <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">RUC de la Empresa</label>
                                      <input type="text" className="input-guambra font-mono" maxLength={13} value={cliente.ruc_empresa} onChange={e => setCliente({...cliente, ruc_empresa: e.target.value})} placeholder="Ej: 0690012345001" />
                                      {(() => { const r = validarRUC(cliente.ruc_empresa); return r.valido !== null ? <p className={`text-[9px] font-bold mt-1 ${r.valido ? 'text-green-400' : 'text-red-400'}`}>{r.valido ? '✓' : '✗'} {r.mensaje}</p> : <p className="text-[9px] text-[var(--text-muted)] mt-1">13 dígitos — número tributario de la empresa</p>; })()}
                                    </div>
                                    <div>
                                      <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Tipo / Actividad Económica</label>
                                      <input type="text" className="input-guambra" value={cliente.tipo_empresa} onChange={e => setCliente({...cliente, tipo_empresa: e.target.value})} placeholder="Ej: Comercial, Servicios, ONG..." />
                                    </div>
                                  </div>

                                  {/* ── Contacto de la empresa ── */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-[var(--border-soft)]">
                                    <p className="md:col-span-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1.5">
                                      <Hash className="w-3 h-3"/>Contacto de la Empresa
                                    </p>
                                    <div>
                                      <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Email</label>
                                      <input type="email" className="input-guambra" value={cliente.email} onChange={e => setCliente({...cliente, email: e.target.value})} placeholder="empresa@correo.com" />
                                    </div>
                                    <div>
                                      <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">WhatsApp / Teléfono</label>
                                      <input type="tel" className="input-guambra" value={cliente.telefono} onChange={e => setCliente({...cliente, telefono: e.target.value})} placeholder="+593 99 999 9999" />
                                    </div>
                                  </div>

                                  {/* ── Ubicación ── */}
                                  <div className="pt-4 border-t border-[var(--border-soft)]">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
                                      <MapPin className="w-3 h-3"/>Ubicación
                                    </p>
                                    <div className="grid grid-cols-3 gap-5 mb-5">
                                      <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">País</label>
                                        <select className="input-guambra" value={cliente.pais} onChange={e => setCliente({...cliente, pais: e.target.value})}>
                                          <option>Ecuador</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Provincia</label>
                                        <input type="text" className="input-guambra" value={cliente.provincia} onChange={e => setCliente({...cliente, provincia: e.target.value})} />
                                      </div>
                                      <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Ciudad</label>
                                        <input type="text" className="input-guambra" value={cliente.ciudad} onChange={e => setCliente({...cliente, ciudad: e.target.value})} />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Dirección</label>
                                      <input type="text" className="input-guambra" value={cliente.direccion} onChange={e => setCliente({...cliente, direccion: e.target.value})} placeholder="Av. Principal y calle secundaria, local/oficina" />
                                    </div>
                                  </div>

                                  {/* ── Responsable de contacto ── */}
                                  <div className="pt-4 border-t border-[var(--border-soft)]">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
                                      <User className="w-3 h-3"/>Responsable de Contacto <span className="text-red-400">*</span>
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                      <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                                          Cédula del Responsable <span className="text-red-400">*</span>
                                        </label>
                                        <input type="text" className="input-guambra font-mono" maxLength={10} value={cliente.identificacion} onChange={e => setCliente({...cliente, identificacion: e.target.value})} placeholder="Ej: 0601234567" />
                                        {(() => { const r = validarCedula(cliente.identificacion); return r.valido !== null ? <p className={`text-[9px] font-bold mt-1 ${r.valido ? 'text-green-400' : 'text-red-400'}`}>{r.valido ? '✓' : '✗'} {r.mensaje}</p> : <p className="text-[9px] text-[var(--text-muted)] mt-1">Cédula de quien firma el contrato</p>; })()}
                                      </div>
                                      <div className="md:col-span-2">
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Nombre completo del responsable <span className="text-red-400">*</span></label>
                                        <input type="text" className="input-guambra" value={cliente.responsable_nombre} onChange={e => setCliente({...cliente, responsable_nombre: e.target.value})} placeholder="Ej: Ana Martínez" />
                                      </div>
                                      <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Celular del responsable</label>
                                        <input type="tel" className="input-guambra" value={cliente.responsable_celular} onChange={e => setCliente({...cliente, responsable_celular: e.target.value})} placeholder="+593 99 000 0000" />
                                      </div>
                                      <div className="md:col-span-2">
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Email del responsable</label>
                                        <input type="email" className="input-guambra" value={cliente.responsable_email} onChange={e => setCliente({...cliente, responsable_email: e.target.value})} placeholder="responsable@empresa.com" />
                                      </div>
                                    </div>
                                  </div>

                                  {/* ── Contactos de referencia ── */}
                                  <div className="pt-4 border-t border-[var(--border-soft)]">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">Contactos de Referencia</p>
                                    <div className="grid grid-cols-2 gap-5">
                                      <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Referencia 1 — Nombre</label>
                                        <input type="text" className="input-guambra" value={cliente.referencia_nombre} onChange={e => setCliente({...cliente, referencia_nombre: e.target.value})} />
                                      </div>
                                      <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Referencia 1 — Celular</label>
                                        <input type="tel" className="input-guambra" value={cliente.referencia_celular} onChange={e => setCliente({...cliente, referencia_celular: e.target.value})} />
                                      </div>
                                      <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Referencia 2 — Nombre</label>
                                        <input type="text" className="input-guambra" value={cliente.referencia_nombre_2} onChange={e => setCliente({...cliente, referencia_nombre_2: e.target.value})} />
                                      </div>
                                      <div>
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Referencia 2 — Celular</label>
                                        <input type="tel" className="input-guambra" value={cliente.referencia_celular_2} onChange={e => setCliente({...cliente, referencia_celular_2: e.target.value})} />
                                      </div>
                                    </div>
                                  </div>

                               </div>
                           )}
                        </fieldset>

                        {/* ── SECCIÓN: DATOS DEL CONTRATO — siempre editable ── */}
                        <div className="pt-5 border-t-2 border-dashed border-[var(--border-soft)]">
                           <div className="flex items-center gap-2 mb-4">
                              <MapPin className="w-4 h-4 text-primary shrink-0"/>
                              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Datos del Evento (exclusivos de este contrato)</p>
                           </div>
                           <div>
                              <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">
                                 Dirección del Evento
                                 <span className="ml-2 normal-case font-normal text-[var(--text-muted)]">— dónde se realizará el evento</span>
                              </label>
                              <input
                                 type="text"
                                 className="input-guambra"
                                 placeholder="Ej: Salón El Rosal, Av. 10 de Agosto N35-76, Quito"
                                 value={direccionEvento}
                                 onChange={e => setDireccionEvento(e.target.value)}
                              />
                           </div>
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
                        
                         <div ref={searchRef} className="relative z-20 mb-8">
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
                                     <div className="p-4 bg-[var(--bg-surface-3)] flex justify-between items-start gap-3">
                                       <div className="flex-1 min-w-0">
                                         <h3 className="text-base font-black tracking-tight text-[var(--text-primary)] truncate">{prod.nombre}</h3>
                                         <div className="flex items-center flex-wrap gap-2 mt-0.5">
                                           <span className="text-[10px] font-bold text-primary uppercase tracking-widest">${prod.precio_unitario} c/u</span>
                                           {prod.fase === 'confirmado' && (
                                             <span className="text-[10px] font-black text-green-400 uppercase tracking-widest flex items-center gap-1">
                                               <CheckCircle2 className="w-3 h-3"/> {prod.cantidad_total} unid. · ${(prod.precio_unitario * prod.cantidad_total).toFixed(2)}
                                             </span>
                                           )}
                                           {prod.fase === 'cantidad' && prod._yaConfirmado && (
                                             <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md" style={{ color: 'var(--color-warning)', backgroundColor: 'var(--color-warning-subtle)', border: '1px solid var(--color-warning-border)' }}>Editando</span>
                                           )}
                                         </div>
                                       </div>
                                       <div className="flex items-center gap-1.5 shrink-0">
                                         {prod.fase === 'confirmado' && (
                                           <>
                                             <button
                                               onClick={() => editarCantidad(prod.id)}
                                               title="Cambiar cantidad total"
                                               className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-amber-400 hover:bg-amber-500/10 transition-colors px-2.5 py-1.5 bg-[var(--bg-surface-2)] rounded-lg border border-[var(--border-soft)]"
                                             >
                                               <Hash className="w-3 h-3"/> Cantidad
                                             </button>
                                             {prod.piezas.length > 0 && (
                                               <button
                                                 onClick={() => editarTallas(prod.id)}
                                                 title="Ajustar distribución de tallas"
                                                 className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-primary hover:bg-primary/10 transition-colors px-2.5 py-1.5 bg-[var(--bg-surface-2)] rounded-lg border border-[var(--border-soft)]"
                                               >
                                                 <SlidersHorizontal className="w-3 h-3"/> Tallas
                                               </button>
                                             )}
                                           </>
                                         )}
                                         <button
                                           onClick={() => quitarProducto(prod.id)}
                                           title="Quitar producto"
                                           className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all border border-red-500/20"
                                         >
                                           <Trash2 className="w-3.5 h-3.5" />
                                         </button>
                                       </div>
                                     </div>

                                     {/* FASE A: Cantidad total */}
                                     {prod.fase === 'cantidad' && (() => {
                                       const esEdicion = prod._yaConfirmado;
                                       const cantPrev = prod._cantidadAnterior;
                                       return (
                                         <div className="p-5 space-y-4">
                                           {/* Instrucción contextual */}
                                           {esEdicion ? (
                                             <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--color-warning-subtle)', border: '1px solid var(--color-warning-border)' }}>
                                               <Pencil className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }}/>
                                               <div>
                                                 <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-warning)' }}>Editando cantidad</p>
                                                 <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Cantidad anterior: <strong style={{ color: 'var(--color-warning)' }}>{cantPrev}</strong> unidad{cantPrev !== 1 ? 'es' : ''}. Al confirmar, podrás ajustar las tallas con los valores ya ingresados.</p>
                                               </div>
                                             </div>
                                           ) : (
                                             <div className="flex items-start gap-3 p-3 bg-[var(--bg-surface-3)] border border-[var(--border-soft)] rounded-xl">
                                               <Hash className="w-4 h-4 text-primary shrink-0 mt-0.5"/>
                                               <p className="text-[10px] font-bold text-[var(--text-secondary)]">¿Cuántas unidades de <strong className="text-[var(--text-primary)]">{prod.nombre}</strong> va a llevar el cliente? Luego distribuirás las tallas por pieza.</p>
                                             </div>
                                           )}

                                           {/* Control de cantidad con +/- */}
                                           <div className="flex items-center gap-3">
                                             <button
                                               onClick={() => setProductosCarrito(prev => prev.map(p =>
                                                 p.id === prod.id ? { ...p, cantidad_total: Math.max(1, (p.cantidad_total || 1) - 1) } : p
                                               ))}
                                               className="w-12 h-12 rounded-xl bg-[var(--bg-surface-3)] border border-[var(--border-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all flex items-center justify-center font-black text-lg"
                                             >
                                               <Minus className="w-4 h-4"/>
                                             </button>
                                             <input
                                               type="number" min="1"
                                               className="input-guambra w-24 text-center text-2xl font-black"
                                               value={prod.cantidad_total}
                                               onChange={e => setProductosCarrito(prev => prev.map(p =>
                                                 p.id === prod.id ? { ...p, cantidad_total: Math.max(1, parseInt(e.target.value, 10) || 1) } : p
                                               ))}
                                             />
                                             <button
                                               onClick={() => setProductosCarrito(prev => prev.map(p =>
                                                 p.id === prod.id ? { ...p, cantidad_total: (p.cantidad_total || 1) + 1 } : p
                                               ))}
                                               className="w-12 h-12 rounded-xl bg-[var(--bg-surface-3)] border border-[var(--border-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-all flex items-center justify-center"
                                             >
                                               <Plus className="w-4 h-4"/>
                                             </button>
                                             <div className="h-px flex-1 bg-[var(--border-soft)]"/>
                                             <button
                                               onClick={() => confirmarCantidadTotal(prod.id)}
                                               className="btn-guambra-primary h-12 !px-6 flex items-center gap-2"
                                             >
                                               <CheckCircle2 className="w-4 h-4"/>
                                               {esEdicion ? 'Actualizar' : 'Confirmar'}
                                             </button>
                                           </div>

                                           {/* Subtotal en tiempo real */}
                                           <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">
                                             Subtotal estimado: <span className="text-primary">${(prod.precio_unitario * (prod.cantidad_total || 1)).toFixed(2)}</span>
                                           </p>
                                         </div>
                                       );
                                     })()}

                                     {/* FASE B: Distribución de tallas */}
                                     {prod.fase === 'tallas' && (() => {
                                       const todasOk = piezasValidas(prod);
                                       const hayExceso = hayExcesoStock(prod);
                                       const puedeConfirmar = todasOk && !hayExceso && !prod._stockVerificando;
                                       return (
                                         <div className="p-5 space-y-4">
                                           {/* Encabezado instructivo + estado de verificación */}
                                           <div className="flex items-start gap-3 p-3 bg-[var(--bg-surface-3)] border border-[var(--border-soft)] rounded-xl">
                                             <SlidersHorizontal className="w-4 h-4 text-primary shrink-0 mt-0.5"/>
                                             <div className="flex-1">
                                               <div className="flex items-center justify-between">
                                                 <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">
                                                   Distribución de tallas — {prod.cantidad_total} unidad{prod.cantidad_total > 1 ? 'es' : ''}
                                                 </p>
                                                 {prod._stockVerificando && (
                                                   <span className="text-[9px] text-[var(--text-muted)] flex items-center gap-1">
                                                     <Loader2 className="w-3 h-3 animate-spin"/> Verificando disponibilidad...
                                                   </span>
                                                 )}
                                                 {!prod._stockVerificando && !fechaSalidaFull && (
                                                   <span className="text-[9px] text-amber-400 font-bold flex items-center gap-1">
                                                     <AlertTriangle className="w-3 h-3"/> Sin fechas — mostrando stock total
                                                   </span>
                                                 )}
                                               </div>
                                               <p className="text-[9px] text-[var(--text-muted)] mt-0.5">
                                                 Indica cuántas unidades van en cada talla por pieza. La suma debe ser exactamente <strong className="text-primary">{prod.cantidad_total}</strong> en cada pieza.
                                               </p>
                                             </div>
                                           </div>

                                           {/* Alerta si vienen de editar y los valores no cuadran */}
                                           {prod._yaConfirmado && !todasOk && (
                                             <div className="flex items-start gap-3 p-3 rounded-xl animate-in fade-in duration-200" style={{ backgroundColor: 'var(--color-warning-subtle)', border: '1px solid var(--color-warning-border)' }}>
                                               <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }}/>
                                               <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-warning)' }}>
                                                 La cantidad cambió. Ajusta las tallas para que sumen <strong>{prod.cantidad_total}</strong> en cada pieza.
                                               </p>
                                             </div>
                                           )}

                                           {/* Alerta de exceso de stock disponible */}
                                           {hayExceso && !prod._stockVerificando && (
                                             <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/25">
                                               <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5"/>
                                               <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest">
                                                 Hay tallas que superan el stock disponible para las fechas seleccionadas. Reduce las cantidades indicadas en rojo.
                                               </p>
                                             </div>
                                           )}

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
                                                 const falta = prod.cantidad_total - asignado;
                                                 return (
                                                   <div key={pieza.id} className={`rounded-xl p-4 border transition-colors ${
                                                     ok && !pieza.tallasDisponibles.some(t => { const c = pieza.tallasCantidades[t.talla] ?? 0; return c > (t.stockDisponible ?? t.stock) && c > 0; })
                                                       ? 'bg-green-500/5 border-green-500/20' :
                                                     excede ? 'bg-red-500/5 border-red-500/20' :
                                                     'bg-[var(--bg-surface-2)] border-[var(--border-soft)]'
                                                   }`}>
                                                     {/* Encabezado pieza + contador */}
                                                     <div className="flex justify-between items-center mb-3">
                                                       <span className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wide">{pieza.nombre}</span>
                                                       <div className="flex items-center gap-2">
                                                         {!ok && !excede && (
                                                           <span className="text-[9px] font-bold" style={{ color: 'var(--color-warning)' }}>Faltan {falta}</span>
                                                         )}
                                                         <span
                                                           className="text-[10px] font-black px-2 py-1 rounded-md flex items-center gap-1"
                                                           style={ok
                                                             ? { color: '#4ade80', backgroundColor: 'rgba(74,222,128,0.12)' }
                                                             : excede
                                                             ? { color: '#f87171', backgroundColor: 'rgba(248,113,113,0.12)' }
                                                             : { color: 'var(--color-warning)', backgroundColor: 'var(--color-warning-subtle)' }
                                                           }
                                                         >
                                                           {ok ? <CheckCircle2 className="w-3 h-3"/> : excede ? <XCircle className="w-3 h-3"/> : <AlertTriangle className="w-3 h-3"/>}
                                                           {asignado} / {prod.cantidad_total}
                                                         </span>
                                                       </div>
                                                     </div>

                                                     {/* Barra de progreso */}
                                                     <div className="h-1.5 bg-[var(--bg-surface-3)] rounded-full mb-3 overflow-hidden">
                                                       <div
                                                         className="h-full rounded-full transition-all"
                                                         style={{
                                                           width: `${Math.min(100, (asignado / prod.cantidad_total) * 100)}%`,
                                                           backgroundColor: ok ? '#4ade80' : excede ? '#f87171' : 'var(--color-warning)'
                                                         }}
                                                       />
                                                     </div>

                                                     {pieza.tallasDisponibles.length === 0 ? (
                                                       <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">Sin tallas registradas en stock</p>
                                                     ) : (
                                                       <div className="grid gap-2">
                                                         {pieza.tallasDisponibles.map(tallaInfo => {
                                                           const cantActual = pieza.tallasCantidades[tallaInfo.talla] ?? 0;
                                                           // Usar stock disponible real (considera reservas por fecha) o total como fallback
                                                           const stockDisp = tallaInfo.stockDisponible ?? tallaInfo.stock;
                                                           const sinStock = stockDisp === 0;
                                                           const stockOk = cantActual <= stockDisp;
                                                           const verificado = tallaInfo.stockDisponible !== undefined && tallaInfo.stockDisponible !== null;
                                                           return (
                                                             <div key={tallaInfo.talla} className={`flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors ${cantActual > 0 && !sinStock ? 'bg-[var(--bg-surface-3)]' : ''}`}>
                                                               {/* Badge talla */}
                                                               <span className={`text-[10px] font-black w-14 text-center py-1 rounded-md border ${
                                                                 sinStock
                                                                   ? 'text-[var(--text-muted)] bg-[var(--bg-surface-2)] border-[var(--border-soft)] opacity-50'
                                                                   : 'text-[var(--text-primary)] bg-[var(--bg-surface-2)] border-[var(--border-soft)]'
                                                               }`}>{tallaInfo.talla}</span>

                                                               {/* Indicador de stock disponible */}
                                                               <div className="flex flex-col w-20 shrink-0">
                                                                 <span className={`text-[9px] font-black leading-tight ${
                                                                   sinStock ? 'text-red-400' :
                                                                   stockDisp <= prod.cantidad_total / 2 ? 'text-amber-400' :
                                                                   'text-[var(--text-muted)]'
                                                                 }`}>
                                                                   {sinStock ? 'No disponible' : `Disp: ${stockDisp}`}
                                                                 </span>
                                                                 {verificado && tallaInfo.stockDisponible !== tallaInfo.stock && (
                                                                   <span className="text-[8px] text-[var(--text-muted)] opacity-60 leading-tight">total: {tallaInfo.stock}</span>
                                                                 )}
                                                               </div>

                                                               {/* Controles cantidad */}
                                                               <div className="flex items-center gap-1">
                                                                 <button
                                                                   disabled={sinStock || cantActual === 0}
                                                                   onClick={() => updateTallaCantidad(prod.id, pieza.id, tallaInfo.talla, cantActual - 1)}
                                                                   className="w-7 h-7 rounded-md bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                                                                 >
                                                                   <Minus className="w-3 h-3"/>
                                                                 </button>
                                                                 <input
                                                                   type="number" min="0" max={stockDisp}
                                                                   disabled={sinStock}
                                                                   className={`w-14 px-2 py-1 rounded-lg text-center text-xs font-black border transition-colors ${
                                                                     !stockOk && cantActual > 0
                                                                       ? 'bg-red-500/10 border-red-500/40 text-red-400'
                                                                       : cantActual > 0
                                                                       ? 'bg-primary/10 border-primary/40 text-[var(--text-primary)]'
                                                                       : 'bg-[var(--bg-input)] border-[var(--border-soft)] text-[var(--text-primary)]'
                                                                   } disabled:opacity-30 disabled:cursor-not-allowed`}
                                                                   value={cantActual}
                                                                   onChange={e => updateTallaCantidad(prod.id, pieza.id, tallaInfo.talla, e.target.value)}
                                                                 />
                                                                 <button
                                                                   disabled={sinStock || cantActual >= stockDisp}
                                                                   onClick={() => updateTallaCantidad(prod.id, pieza.id, tallaInfo.talla, cantActual + 1)}
                                                                   className="w-7 h-7 rounded-md bg-[var(--bg-surface-2)] border border-[var(--border-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                                                                 >
                                                                   <Plus className="w-3 h-3"/>
                                                                 </button>
                                                               </div>

                                                               {/* Aviso inline de exceso */}
                                                               {!stockOk && cantActual > 0 && (
                                                                 <span className="text-[9px] text-red-400 font-black leading-tight">
                                                                   Stock insuficiente — disponible: {stockDisp}, solicitado: {cantActual}
                                                                 </span>
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

                                           {/* Botón confirmar tallas */}
                                           <button
                                             onClick={() => confirmarTallas(prod.id)}
                                             disabled={!puedeConfirmar}
                                             className={`w-full h-12 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                                               puedeConfirmar
                                                 ? 'bg-green-500 text-white hover:bg-green-400 shadow-lg shadow-green-500/20'
                                                 : 'bg-[var(--bg-surface-2)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border-soft)]'
                                             }`}
                                           >
                                             {prod._stockVerificando
                                               ? <><Loader2 className="w-4 h-4 animate-spin"/> Verificando stock...</>
                                               : <><CheckCircle2 className="w-4 h-4"/>
                                                   {puedeConfirmar
                                                     ? 'Guardar distribución'
                                                     : hayExceso
                                                     ? 'Stock insuficiente — ajusta las tallas'
                                                     : `Distribuye ${prod.cantidad_total} unidad${prod.cantidad_total > 1 ? 'es' : ''} en cada pieza`
                                                   }
                                                 </>
                                             }
                                           </button>
                                         </div>
                                       );
                                     })()}

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
                          <div className="mt-4 p-3 rounded-xl flex items-center gap-3" style={{ backgroundColor: 'var(--color-warning-subtle)', border: '1px solid var(--color-warning-border)' }}>
                            <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--color-warning)' }}/>
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-warning)' }}>Confirma todos los productos y sus tallas para continuar al paso siguiente.</p>
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
                            <div className="mb-6 rounded-2xl p-6 animate-in slide-in-from-top-4 duration-300" style={{ backgroundColor: 'var(--color-warning-subtle)', border: '1px solid var(--color-warning-border)' }}>
                               <div className="flex items-center gap-3 mb-5">
                                  <Calendar className="w-5 h-5" style={{ color: 'var(--color-warning)' }}/>
                                  <h3 className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-warning)' }}>Facturación por Días de Alquiler</h3>
                                  <span className="ml-auto px-3 py-1 rounded-lg text-xs font-black" style={{ color: 'var(--color-warning)', backgroundColor: 'var(--color-warning-subtle)', border: '1px solid var(--color-warning-border)' }}>{diasAlquiler} días</span>
                               </div>

                               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  {/* Días de alquiler — solo lectura */}
                                  <div>
                                     <label className="text-[10px] uppercase tracking-widest font-bold mb-2 block" style={{ color: 'var(--color-warning)' }}>Días de Alquiler</label>
                                     <div className="input-guambra font-mono text-xl font-black flex items-center justify-center cursor-not-allowed" style={{ color: 'var(--color-warning)', backgroundColor: 'var(--color-warning-subtle)', borderColor: 'var(--color-warning-border)' }}>
                                        {diasAlquiler}
                                     </div>
                                     <p className="text-[9px] text-[var(--text-muted)] mt-1 uppercase tracking-widest">Calculado automáticamente</p>
                                  </div>

                                  {/* Precio por día — editable */}
                                  <div>
                                     <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Precio por Día <span className="normal-case" style={{ color: 'var(--color-warning)', opacity: 0.7 }}>(editable)</span></label>
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
                                     <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-2 block">Subtotal Alquiler <span className="normal-case" style={{ color: 'var(--color-warning)', opacity: 0.7 }}>(editable)</span></label>
                                     <div className="relative">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-black text-sm pointer-events-none">$</span>
                                        <input
                                          type="number" step="0.01" min="0"
                                          style={{ paddingLeft: '3rem', ...(subtotalFueModificado ? { borderColor: 'var(--color-warning-border)', backgroundColor: 'var(--color-warning-subtle)' } : {}) }}
                                          className="input-guambra font-mono text-lg font-black"
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
                                  <div className="mt-4 p-3 rounded-xl flex items-center gap-3 animate-in fade-in duration-300" style={{ backgroundColor: 'var(--color-warning-subtle)', border: '1px solid var(--color-warning-border)' }}>
                                     <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--color-warning)' }}/>
                                     <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-warning)' }}>
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
                                 <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-muted)] mb-1 block flex items-center gap-2">
                                    Monto del Anticipo <span className="text-red-400">*</span>
                                 </label>
                                 <div className="relative">
                                     <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-black text-sm pointer-events-none">$</span>
                                     <input
                                       type="number" step="0.01" min="0"
                                       style={{ paddingLeft: '3rem' }}
                                       className="input-guambra font-mono text-xl"
                                       placeholder={`Sugerido: $${anticipo.toFixed(2)}`}
                                       value={montoAnticipo}
                                       onChange={e => setMontoAnticipo(e.target.value)}
                                       onFocus={() => { if (!montoAnticipo) setMontoAnticipo(anticipo.toFixed(2)); }}
                                     />
                                 </div>
                                 <p className="text-[9px] text-[var(--text-muted)] mt-1 font-bold uppercase tracking-widest">
                                    50% del total: <span className="text-primary">${anticipo.toFixed(2)}</span>
                                    {parseFloat(montoAnticipo) > 0 && Math.abs(parseFloat(montoAnticipo) - anticipo) > 0.01 && (
                                       <span className="text-amber-400 ml-2">· Monto personalizado</span>
                                    )}
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

                              {/* Separador anticipo */}
                              <div className="border-t border-[var(--border-soft)] pt-4 space-y-3">
                                 {/* Referencia 50% — discreta */}
                                 <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Anticipo ref. (50%)</span>
                                    <span className="font-mono text-xs text-[var(--text-muted)] font-bold">${anticipo.toFixed(2)}</span>
                                 </div>
                                 {/* Anticipo ingresado */}
                                 <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Anticipo ingresado</span>
                                    <span className="font-mono text-sm font-black text-[var(--text-primary)]">
                                       ${(parseFloat(montoAnticipo) || 0).toFixed(2)}
                                    </span>
                                 </div>
                              </div>

                              {/* SALDO PENDIENTE — card destacada */}
                              <div className="rounded-2xl p-4 flex justify-between items-center mt-2" style={{ background: 'color-mix(in srgb, var(--color-primary) 12%, var(--bg-surface))', border: '1px solid color-mix(in srgb, var(--color-primary) 35%, transparent)' }}>
                                 <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--color-primary)' }}>Saldo Pendiente</p>
                                    <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Al momento de retirar</p>
                                 </div>
                                 <span className="font-mono text-2xl font-black" style={{ color: 'var(--color-primary)' }}>
                                    ${Math.max(0, total - (parseFloat(montoAnticipo) || 0)).toFixed(2)}
                                 </span>
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
                            <div className="w-full space-y-4 animate-in slide-in-from-bottom-8 duration-500">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button
                                        onClick={() => contratoId && toast.info(`Impresión disponible próximamente.`)}
                                        className="btn-guambra-primary !py-4 h-16 flex-1 text-sm flex items-center justify-center gap-2 group bg-blue-600 hover:bg-blue-500 border-none shadow-blue-500/20 shadow-xl">
                                        <Printer className="w-5 h-5"/> Imprimir Contrato (PDF)
                                    </button>
                                    <button
                                        onClick={() => onVolver?.()}
                                        className="btn-guambra-primary !py-4 h-16 flex-1 text-sm flex items-center justify-center gap-2 group">
                                        <CheckCircle2 className="w-5 h-5"/> Volver a Contratos
                                    </button>
                                </div>
                                <button
                                    onClick={() => { setStep(1); setContratoGuardado(false); }}
                                    className="btn-guambra-secondary !py-4 w-full text-xs">
                                    Crear Otro Contrato
                                </button>
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
