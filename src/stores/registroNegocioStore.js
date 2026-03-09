import { create } from 'zustand';

// Store para manejar el estado del proceso de registro multi-paso
export const useRegistroNegocioStore = create((set) => ({
  currentStep: 1,
  
  // Step 1: Business Information
  businessData: {
    name: '',
    businessRuc: '', // RUC del negocio
    documentId: '', // Cédula del responsable
    contactName: '', // Nombre completo del responsable
    email: '', // Email de acceso
    whatsapp: '',
    country: 'Ecuador',
    province: '',
    city: '',
    address: '',
    rentalType: '',
    rentalTypeOther: '',
    responsibleRole: '',
    password: '',
    confirmPassword: '',
    howFound: '',
    termsAccepted: false,
    captchaAnswer: '',
    plan_id: '8a89648f-2106-481e-b8d9-440e37783728' // ID del plan 'Demo Gratuita'
  },
  
  // Step 2: Subdomain
  subdomain: '',
  isSubdomainAvailable: null,
  
  // Step 3: Plan Selection
  selectedPlan: null,

  // Actions to update the state
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  prevStep: () => set((state) => ({ currentStep: Math.max(1, state.currentStep - 1) })),
  
  updateBusinessData: (data) => set((state) => ({
    businessData: { ...state.businessData, ...data }
  })),
  
  setSubdomain: (subdomain, isAvailable) => set({ 
    subdomain, 
    isSubdomainAvailable: isAvailable 
  }),
  
  setPlan: (plan) => set({ selectedPlan: plan }),

  // Reset function after successful registration
  reset: () => set({
    currentStep: 1,
    businessData: {
      name: '', businessRuc: '', documentId: '', contactName: '', email: '', 
      whatsapp: '', country: 'Ecuador', province: '', city: '', address: '',
      rentalType: '', rentalTypeOther: '', responsibleRole: '',
      password: '', confirmPassword: '', howFound: '', termsAccepted: false,
      captchaAnswer: '', plan_id: '8a89648f-2106-481e-b8d9-440e37783728'
    },
    subdomain: '',
    isSubdomainAvailable: null,
    selectedPlan: null
  })
}));
