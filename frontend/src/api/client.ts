
import axios from 'axios'

// In production (served by FastAPI), use same-origin relative path.
// In dev (Vite dev server on :5173), proxy to the backend on :8000.
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '')

export const apiClient = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
})

export { API_BASE_URL }
