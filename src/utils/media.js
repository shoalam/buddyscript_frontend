const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

/**
 * Normalizes and prefixes a media URL with the backend API URL if needed.
 * @param {string} url - The relative or absolute media URL.
 * @returns {string|null} - The full, normalized URL or null if no url is provided.
 */
export const getImageUrl = (url) => {
  if (!url) return null;
  if (url.toString().startsWith('http')) return url;
  
  // Replace backslashes with forward slashes
  const normalizedPath = url.toString().replace(/\\/g, '/');
  
  // Ensure we don't have double slashes if prefix or path has one
  const cleanBase = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const cleanPath = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath;
  
  return `${cleanBase}/${cleanPath}`;
};
