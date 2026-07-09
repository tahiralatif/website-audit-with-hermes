import { NextResponse } from 'next/server';

export async function GET() {
  const baseUrl = 'https://server.14.jugaar.ai';

  const urls = [
    { loc: baseUrl, priority: '1.0', changefreq: 'weekly' },
    { loc: `${baseUrl}/signin`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${baseUrl}/signup`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${baseUrl}/history`, priority: '0.6', changefreq: 'daily' },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
