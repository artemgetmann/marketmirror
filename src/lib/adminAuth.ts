/**
 * Admin authentication utility for MarketMirror
 * Provides functions for admin login and retrieving auth headers
 */

/**
 * Attempts to login as an admin and retrieve a JWT token
 */
export async function getAdminToken(password: string): Promise<string | null> {
  try {
    const response = await fetch('https://marketmirror-api.onrender.com/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password
      })
    });
    
    const data = await response.json();
    if (data.success) {
      localStorage.setItem('marketmirror_admin_token', data.token);
      return data.token;
    }
    return null;
  } catch (err) {
    console.error('Admin login failed:', err);
    return null;
  }
}

/**
 * Checks if the user is currently authenticated as an admin
 */
export function isAdminAuthenticated(): boolean {
  return !!localStorage.getItem('marketmirror_admin_token');
}

/**
 * Logs out the admin user by removing the token
 */
export function adminLogout(): void {
  localStorage.removeItem('marketmirror_admin_token');
}

/**
 * Returns authorization headers if admin token exists
 */
export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('marketmirror_admin_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}
