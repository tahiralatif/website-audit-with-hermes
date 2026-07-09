import tls from 'tls';

export default async function runSecurity(url) {
  const result = {
    tls: null,
    headers: {},
  };

  const parsedUrl = new URL(url);

  // TLS check
  try {
    const tlsResult = await new Promise((resolve, reject) => {
      const socket = tls.connect(
        {
          host: parsedUrl.hostname,
          port: parsedUrl.port || 443,
          servername: parsedUrl.hostname,
          rejectUnauthorized: false,
        },
        () => {
          const cert = socket.getPeerCertificate();
          socket.end();

          if (!cert || !cert.subject) {
            resolve(null);
            return;
          }

          const now = new Date();
          const validFrom = new Date(cert.valid_from);
          const validTo = new Date(cert.valid_to);
          const daysRemaining = Math.floor(
            (validTo - now) / (1000 * 60 * 60 * 24)
          );

          resolve({
            issuer: cert.issuer?.O || 'Unknown',
            subject: cert.subject?.CN || 'Unknown',
            validFrom: cert.valid_from,
            validTo: cert.valid_to,
            expired: now > validTo,
            daysRemaining,
            sans: cert.subjectaltname
              ? cert.subjectaltname.split(',').map((s) => s.trim())
              : [],
            hostnameMatch: cert.subjectaltname
              ? cert.subjectaltname.includes(`DNS:${parsedUrl.hostname}`)
              : false,
            protocol: socket.getProtocol(),
            selfSigned: cert.issuer?.O === cert.subject?.O,
          });
        }
      );

      socket.on('error', (err) => {
        reject(err);
      });

      setTimeout(() => {
        socket.destroy();
        reject(new Error('TLS connection timeout'));
      }, 10000);
    });

    result.tls = tlsResult;
  } catch (e) {
    result.tls = { error: e.message };
  }

  // Security headers
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'WebsiteAuditBot/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    const headers = response.headers;

    result.headers = {
      hsts: headers.get('strict-transport-security') || null,
      csp: headers.get('content-security-policy') || null,
      xFrameOptions: headers.get('x-frame-options') || null,
      xContentTypeOptions: headers.get('x-content-type-options') || null,
      referrerPolicy: headers.get('referrer-policy') || null,
      permissionsPolicy: headers.get('permissions-policy') || null,
    };
  } catch (e) {
    result.headers = { error: e.message };
  }

  return result;
}
