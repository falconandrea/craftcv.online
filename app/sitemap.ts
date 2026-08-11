import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// Real per-route dates. Using `new Date()` would tell crawlers that every page
// changed on every deploy, which is false and makes the signal worthless.
// Update the entry when you meaningfully change a page's content.
const ROUTES: { path: string; lastModified: string; priority: number }[] = [
    { path: '', lastModified: '2026-08-01', priority: 1 },
    { path: '/ats-score', lastModified: '2026-07-12', priority: 0.8 },
    { path: '/privacy', lastModified: '2026-08-11', priority: 0.5 },
    { path: '/cookies', lastModified: '2026-08-11', priority: 0.5 },
]

// Only indexable pages — app routes (/dashboard, /editor) are noindex
// and should NOT be in the sitemap. llms.txt is a text file, not HTML.
export default function sitemap(): MetadataRoute.Sitemap {
    return ROUTES.map(({ path, lastModified, priority }) => ({
        url: `${SITE_URL}${path}`,
        lastModified,
        changeFrequency: 'monthly' as const,
        priority,
    }))
}
