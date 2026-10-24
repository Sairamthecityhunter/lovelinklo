import type {MetadataRoute} from 'next';
import {publicAppUrl} from '@/lib/app-url';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicAppUrl();
  return ['', '/login', '/register', '/privacy', '/terms'].map((path) => ({
    url: base + path,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.6,
  }));
}
