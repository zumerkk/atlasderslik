import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/teacher/', '/student/'], // Protect private routes from crawling
        },
        sitemap: 'https://atlasderslik.com/sitemap.xml',
    };
}
