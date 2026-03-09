import { useRegistroNegocioStore } from '../../stores/registroNegocioStore';
import { ECUADOR_DATA } from './ecuadorData';

const Paso1DatosNegocio = () => {
  const { businessData, updateBusinessData, nextStep } = useRegistroNegocioStore();

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Validaciones en tiempo real para Cédula, WhatsApp y RUC
    if (name === 'documentId' || name === 'whatsapp' || name === 'businessRuc') {
      const maxLength = name === 'businessRuc' ? 13 : 10;
      const numericValue = value.replace(/\D/g, '').slice(0, maxLength);
      updateBusinessData({ [name]: numericValue });
      return;
    }

    updateBusinessData({ [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validaciones finales antes de pasar al siguiente paso
    if (businessData.businessRuc.length < 10) {
      alert("El RUC del negocio debe tener al menos 10 dígitos (o 13).");
      return;
    }
    if (businessData.documentId.length !== 10) {
      alert("La cédula debe tener exactamente 10 dígitos.");
      return;
    }
    if (businessData.whatsapp.length !== 10) {
      alert("El WhatsApp debe tener exactamente 10 dígitos.");
      return;
    }
    if (businessData.rentalType === 'Otro' && !businessData.rentalTypeOther) {
      alert("Por favor especifique qué alquila su negocio.");
      return;
    }

    nextStep();
  };

  const getValidationClass = (val, length = 10) => {
    if (!val) return 'border-[var(--border-soft)]';
    return val.length === length ? 'border-green-500/50' : 'border-red-500/50';
  };

  const getValidationMessage = (val, length = 10) => {
    if (!val) return null;
    if (val.length < length) return `El número debe tener ${length} dígitos`;
    if (val.length > length) return `El número no puede tener más de ${length} dígitos`;
    return null;
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <form onSubmit={handleSubmit} className="space-y-10">
        
        {/* SECCIÓN: INFORMACIÓN DEL NEGOCIO */}
        <section className="space-y-8">
          <div className="border-b border-[var(--border-soft)] pb-4">
            <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight uppercase">Información del Negocio</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Nombre del negocio o razón social *</label>
              <input 
                type="text" 
                name="name"
                required
                value={businessData.name}
                onChange={handleChange}
                className="input-guambra"
                placeholder="Ej. Trajes Típicos La Llama"
              />
            </div>

            <div className="relative">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">RUC del negocio *</label>
              <input 
                type="text" 
                name="businessRuc"
                required
                value={businessData.businessRuc}
                onChange={handleChange}
                className={`input-guambra transition-colors duration-300 ${getValidationClass(businessData.businessRuc, 13)}`}
                placeholder="13 dígitos"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">País</label>
              <select 
                name="country"
                disabled
                className="input-guambra opacity-50 cursor-not-allowed"
                value="Ecuador"
              >
                <option value="Ecuador">Ecuador</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Provincia *</label>
              <select 
                name="province"
                required
                value={businessData.province}
                onChange={handleChange}
                className="input-guambra"
              >
                <option value="">Seleccione una provincia</option>
                {ECUADOR_DATA.provincias.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Ciudad *</label>
              <select 
                name="city"
                required
                disabled={!businessData.province}
                value={businessData.city}
                onChange={handleChange}
                className={`input-guambra ${!businessData.province ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                <option value="">{businessData.province ? 'Seleccione una ciudad' : 'Primero elija provincia'}</option>
                {businessData.province && ECUADOR_DATA.ciudades[businessData.province]?.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">¿Qué alquila su negocio? *</label>
              <select 
                name="rentalType"
                required
                value={businessData.rentalType}
                onChange={handleChange}
                className="input-guambra"
              >
                <option value="">Seleccione una opción</option>
                <option value="Alquiler de trajes típicos">Alquiler de trajes típicos</option>
                <option value="Alquiler de trajes de gala">Alquiler de trajes de gala</option>
                <option value="Alquiler de disfraces">Alquiler de disfraces</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            {businessData.rentalType === 'Otro' && (
              <div className="md:col-span-2 animate-in zoom-in-95 duration-300">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Especifique qué alquila *</label>
                <input 
                  type="text" 
                  name="rentalTypeOther"
                  required
                  value={businessData.rentalTypeOther}
                  onChange={handleChange}
                  className="input-guambra"
                  placeholder="Ej. Alquiler de herramientas, equipos, etc."
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Dirección del negocio o empresa *</label>
              <input 
                type="text" 
                name="address"
                required
                value={businessData.address}
                onChange={handleChange}
                className="input-guambra"
                placeholder="Calle principal, número y transversal"
              />
            </div>
          </div>
        </section>

        {/* SECCIÓN: DATOS DEL RESPONSABLE */}
        <section className="space-y-8 pt-6">
          <div className="border-b border-[var(--border-soft)] pb-4">
            <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight uppercase">Datos del Responsable</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Nombre completo del responsable *</label>
              <input 
                type="text" 
                name="contactName"
                required
                value={businessData.contactName}
                onChange={handleChange}
                className="input-guambra"
                placeholder="Ej. Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Cargo del responsable *</label>
              <select 
                name="responsibleRole"
                required
                value={businessData.responsibleRole}
                onChange={handleChange}
                className="input-guambra"
              >
                <option value="">Seleccione cargo</option>
                <option value="Propietario">Propietario</option>
                <option value="Empleado">Empleado</option>
              </select>
            </div>

            <div className="relative">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Cédula del responsable *</label>
              <input 
                type="text" 
                name="documentId"
                required
                value={businessData.documentId}
                onChange={handleChange}
                className={`input-guambra transition-colors duration-300 ${getValidationClass(businessData.documentId)}`}
                placeholder="10 dígitos"
              />
              {getValidationMessage(businessData.documentId) && (
                <p className="absolute -bottom-5 left-0 text-[9px] text-red-500 font-bold uppercase tracking-tighter">
                  {getValidationMessage(businessData.documentId)}
                </p>
              )}
            </div>

            <div className="relative">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">WhatsApp del responsable *</label>
              <div className="flex items-center">
                <span className="bg-[var(--bg-surface-2)] border border-r-0 border-[var(--border-soft)] px-3 py-3 rounded-l-xl text-[var(--text-muted)] font-bold text-sm">+593</span>
                <input 
                  type="text" 
                  name="whatsapp"
                  required
                  value={businessData.whatsapp}
                  onChange={handleChange}
                  className={`input-guambra !rounded-l-none transition-colors duration-300 ${getValidationClass(businessData.whatsapp)}`}
                  placeholder="09xxxxxxxx"
                />
              </div>
              {getValidationMessage(businessData.whatsapp) && (
                <p className="absolute -bottom-5 left-14 text-[9px] text-red-500 font-bold uppercase tracking-tighter">
                  {getValidationMessage(businessData.whatsapp)}
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="pt-12 flex justify-end">
          <button
            type="submit"
            className="btn-guambra-primary group"
          >
            Siguiente Paso
            <span className="ml-2 group-hover:translate-x-1 transition-transform inline-block">→</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default Paso1DatosNegocio;
