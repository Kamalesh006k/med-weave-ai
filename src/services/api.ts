import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

export const authService = {
  login: async (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    const response = await api.post('/login', formData);
    localStorage.setItem('token', response.data.access_token);
    return response.data;
  },
  signup: async (email, password, full_name) => {
    const response = await api.post('/signup', { email, password, full_name });
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
  }
};

export const patientService = {
  getPatients: async () => {
    const response = await api.get('/get_patients');
    return response.data;
  },
  addPatient: async (patient) => {
    const response = await api.post('/add_patient', patient);
    return response.data;
  }
};

export const consultationService = {
  analyze: async (patient_id, transcript) => {
    const response = await api.post('/analyze_consultation', { patient_id, transcript });
    return response.data;
  },
  getHistory: async (patient_id) => {
    const response = await api.get(`/get_history/${patient_id}`);
    return response.data;
  }
};
