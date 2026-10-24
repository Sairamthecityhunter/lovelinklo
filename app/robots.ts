import type {MetadataRoute} from 'next';
import {publicAppUrl} from '@/lib/app-url';

export default function robots(): MetadataRoute.Robots {
  const base = publicAppUrl();
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login', '/register', '/privacy', '/terms', '/forgot'],
      disallow: ['/api/', '/settings', '/invite', '/us', '/pins', '/memories', '/letters', '/dashboard'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
