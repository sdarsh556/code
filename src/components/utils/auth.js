export function logout() {
  window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/logout`;
}