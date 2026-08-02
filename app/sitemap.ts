import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date()

    // Only indexable pages — app routes (/dashboard, /editor) are noindex
    // and should NOT be in the sitemap. llms.txt is a text file, not HTML.
    const routes = [
        '',
        '/ats-score',
        '/privacy',
        '/cookies',
    ].map((route) => ({
        url: `${SITE_URL}${route}`,
        lastModified,
        changeFrequency: 'monthly' as const,
        priority: route === '' ? 1 : 0.8,
    }))

    return routes
}
