// Resolves the mobile app's "accent color" — either the user's own personal
// preset (blue/green/purple/orange, chosen in Profile) or, when they've left
// it on 'company' (the default), the live color from the admin panel's
// Appearance settings (same /api/theme the admin app reads).
import { apiClient } from '../services/api.service';

const PRESETS: Record<string, string> = {
  blue: '#1a56db',
  green: '#10b981',
  purple: '#7c3aed',
  orange: '#f59e0b',
};

export function resolveAccentColor(
  themeColor: string,
  companyTheme: { primary: string } | null,
): string {
  if (themeColor === 'company') {
    return companyTheme?.primary || PRESETS['blue'];
  }
  return PRESETS[themeColor] || PRESETS['blue'];
}

/** Fetches /api/theme (public — no auth needed) for the app's live branding. */
export async function fetchCompanyTheme(): Promise<{ primary: string; logoUrl: string; appName: string } | null> {
  try {
    const res = await apiClient.get('/theme');
    const data = res.data?.data || {};
    return {
      primary: data.theme_primary || '#1a56db',
      logoUrl: data.theme_logo_url || '',
      appName: data.theme_app_name || 'United Ram Construction',
    };
  } catch (e) {
    return null;
  }
}
