/**
 * Helper to dynamically determine the base path for assets & API calls
 * Works seamlessly on localhost, Vercel, and GitHub Pages (e.g. /taichinhapp)
 */
export const getBasePath = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // When hosted on GitHub Pages: username.github.io/repo-name
    if (hostname.includes('github.io')) {
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        return `/${parts[0]}`;
      }
    }
  }
  return process.env.NEXT_PUBLIC_BASE_PATH || '';
};
