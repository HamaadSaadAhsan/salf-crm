import Axios, { AxiosInstance } from 'axios'

const axios: AxiosInstance = Axios.create({
  baseURL: window.location.origin,
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// Add CSRF token to requests
axios.interceptors.request.use((config) => {
  const token = document.head.querySelector('meta[name="csrf-token"]')
  if (token) {
    config.headers['X-CSRF-TOKEN'] = token.getAttribute('content')
  }
  return config
})

export default axios
