import { NextResponse } from 'next/server';

export async function GET() {
  const body = `User-agent: *
Allow: /

Sitemap: https://server.14.jugaar.ai/sitemap.xml

# Website Audit Portal
# Built with OpenClaw
`;

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
