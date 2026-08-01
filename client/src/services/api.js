import axios from 'axios';

// In dev, Vite proxies /api -> backend (see vite.config.js).
// In production, set VITE_API_BASE_URL to your deployed backend URL.
const baseURL = 'https://resumepilot-1j1z.onrender.com/api';

const api = axios.create({
    baseURL,
    timeout: 60000,
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        const message =
            err.response ? .data ? .message || err.message || 'Something went wrong. Please try again.';
        return Promise.reject(new Error(message));
    }
);

export const extractResume = (file) => {
    const formData = new FormData();
    formData.append('resume', file);
    return api.post('/extract-resume', formData).then((r) => r.data);
};

export const buildResume = (payload) => api.post('/build-resume', payload).then((r) => r.data);

export const optimizeResume = ({ file, resumeText, jobDescription }) => {
    const formData = new FormData();
    if (file) formData.append('resume', file);
    if (resumeText) formData.append('resumeText', resumeText);
    formData.append('jobDescription', jobDescription);
    return api.post('/optimize-resume', formData).then((r) => r.data);
};

export const checkATS = ({ file, resumeText, jobDescription }) => {
    const formData = new FormData();
    if (file) formData.append('resume', file);
    if (resumeText) formData.append('resumeText', resumeText);
    if (jobDescription) formData.append('jobDescription', jobDescription);
    return api.post('/check-ats', formData).then((r) => r.data);
};

export const recruiterDashboard = ({ file, resumeText, jobDescription, candidateName, targetRole }) => {
    const formData = new FormData();
    if (file) formData.append('resume', file);
    if (resumeText) formData.append('resumeText', resumeText);
    if (jobDescription) formData.append('jobDescription', jobDescription);
    if (candidateName) formData.append('candidateName', candidateName);
    if (targetRole) formData.append('targetRole', targetRole);
    return api.post('/recruiter-dashboard', formData).then((r) => r.data);
};

export const generateCoverLetter = (payload) => api.post('/cover-letter', payload).then((r) => r.data);

export const generateInterviewPrep = (payload) => api.post('/interview', payload).then((r) => r.data);

export const exportResume = async({ resumeText, format }) => {
    const response = await api.post(
        '/export', { resumeText, format }, { responseType: 'blob' }
    );
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `resume.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export default api;