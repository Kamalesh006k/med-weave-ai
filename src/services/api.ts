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

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

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
  },
  parseIntake: async (note) => {
    const response = await api.post('/parse_intake', { note });
    return response.data;
  },
  getDailyBriefing: async () => {
    const response = await api.get('/daily_briefing');
    return response.data.briefing;
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
  },
  chatCopilot: async (patient_id, message) => {
    const response = await api.post('/chat_copilot', { patient_id, message });
    return response.data.reply;
  }
};
