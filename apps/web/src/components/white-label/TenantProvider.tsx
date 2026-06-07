'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/api';

interface TenantBranding {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  fontFamily?: string;
  borderRadius?: string;
  darkLogoUrl?: string;
  customCss?: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  customDomain?: string;
  branding: TenantBranding;
  features: Record<string, boolean>;
}

interface TenantContextValue {
  tenant: Tenant | null;
  isLoading: boolean;
  branding: TenantBranding;
}

const DEFAULT_BRANDING: TenantBranding = {
  primaryColor: '#6366f1',
  secondaryColor: '#8b5cf6',
  accentColor: '#06b6d4',
  fontFamily: 'Inter',
  borderRadius: '0.5rem',
};

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  isLoading: false,
  branding: DEFAULT_BRANDING,
});

export function TenantProvider({ children, tenantSlug }: { children: React.ReactNode; tenantSlug?: string }) {
  const [resolvedSlug, setResolvedSlug] = useState<string | null>(tenantSlug || null);

  useEffect(() => {
    if (!resolvedSlug && typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host !== 'localhost' && !host.includes('lms.platform')) {
        axios.get(`/tenants/resolve?domain=${host}`)
          .then(r => setResolvedSlug(r.data.data?.slug))
          .catch(() => {});
      }
    }
  }, [resolvedSlug]);

  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ['tenant', resolvedSlug],
    queryFn: () => axios.get(`/tenants/${resolvedSlug}`).then(r => r.data.data),
    enabled: !!resolvedSlug,
    staleTime: 5 * 60 * 1000,
  });

  const branding = tenant?.branding || DEFAULT_BRANDING;

  // Apply CSS variables
  useEffect(() => {
    if (!tenant) return;
    const root = document.documentElement;

    const hexToHsl = (hex: string): string => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    if (branding.primaryColor.startsWith('#')) {
      root.style.setProperty('--primary', hexToHsl(branding.primaryColor));
    }
    if (branding.borderRadius) {
      root.style.setProperty('--radius', branding.borderRadius);
    }
    if (branding.fontFamily) {
      root.style.setProperty('--font-sans', branding.fontFamily);
    }

    // Inject custom CSS
    if (branding.customCss) {
      let styleEl = document.getElementById('tenant-custom-css');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'tenant-custom-css';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = branding.customCss;
    }

    // Update favicon
    if (branding.faviconUrl) {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) favicon.href = branding.faviconUrl;
    }

    // Update page title
    if (tenant.name) {
      document.title = document.title.replace('LMS Platform', tenant.name);
    }
  }, [tenant, branding]);

  return (
    <TenantContext.Provider value={{ tenant: tenant || null, isLoading, branding }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
