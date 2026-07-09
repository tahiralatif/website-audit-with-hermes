import { NextResponse } from 'next/server';
import { logServerError, logRateLimit } from '@/lib/logger';

export async function POST(request) {
  try {
    const { getUserByToken, createAudit } = await import('@/lib/db');
    const { validateUrl } = await import('@/lib/ssrf');
    const { checkRateLimit, getClientIp } = await import('@/lib/rate-limit');
    const { spawn } = await import('child_process');

    // 1. Auth check
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Rate limiting (per user, fallback to IP)
    const rateKey = `user:${user.id}`;
    const ip = getClientIp(request);
    const rateResult = checkRateLimit(rateKey);

    if (!rateResult.allowed) {
      logRateLimit(rateKey, ip);
      const retryAfterSec = Math.ceil(rateResult.retryAfterMs / 1000);
      return NextResponse.json(
        {
          error: `Rate limit exceeded. You can run a maximum of 5 audits per 10 minutes. Try again in ${retryAfterSec} seconds.`,
          retryAfterSec,
        },
        { status: 429 }
      );
    }

    // 3. Parse and validate URL
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let fullUrl = url;
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = 'https://' + fullUrl;
    }

    // 4. SSRF protection
    const validation = await validateUrl(fullUrl);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason }, { status: 400 });
    }

    // 5. Create audit and spawn worker
    const audit = createAudit(validation.url, user.id);

    const workerScript = `
      const { getAudit, updateAudit } = require('/root/website-audit-portal/lib/db.js');
      const runAudit = require('/root/website-audit-portal/lib/orchestrator.js').default;
      const { generateReport } = require('/root/website-audit-portal/lib/reporter.js');
      const { logAuditError, logAuditSuccess } = require('/root/website-audit-portal/lib/logger.js');
      const checkConnectivity = require('/root/website-audit-portal/lib/connectivity.js').default;

      const auditId = ${audit.id};
      const TIMEOUT = 5 * 60 * 1000;

      process.on('uncaughtException', (err) => {
        logAuditError(auditId, '${validation.url}', err.message, { phase: 'uncaughtException' });
        updateAudit(auditId, { status: 'error', error: err.message });
        process.exit(1);
      });

      process.on('unhandledRejection', (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        logAuditError(auditId, '${validation.url}', msg, { phase: 'unhandledRejection' });
        updateAudit(auditId, { status: 'error', error: msg });
        process.exit(1);
      });

      const timer = setTimeout(() => {
        logAuditError(auditId, '${validation.url}', 'Audit timed out after 5 minutes');
        updateAudit(auditId, { status: 'error', error: 'Audit timed out after 5 minutes. The target site may be too slow or unreachable.' });
        process.exit(1);
      }, TIMEOUT);

      async function main() {
        const startTime = Date.now();
        const audit = getAudit(auditId);
        if (!audit) {
          console.error('Audit not found:', auditId);
          process.exit(1);
        }

        updateAudit(auditId, { status: 'running' });

        // Pre-flight connectivity check — fail fast on unreachable sites
        const connectivity = await checkConnectivity(audit.url);
        if (!connectivity.reachable) {
          const userMessage = connectivity.error || 'The website could not be reached.';
          logAuditError(auditId, audit.url, userMessage, { phase: 'connectivity-check' });
          updateAudit(auditId, { status: 'error', error: userMessage });
          clearTimeout(timer);
          process.exit(0);
        }

        try {
          const results = await runAudit(audit.url, (tool) => {
            updateAudit(auditId, { current_tool: tool });
          });

          const report = generateReport(results);
          const durationMs = Date.now() - startTime;

          logAuditSuccess(auditId, audit.url, durationMs);
          updateAudit(auditId, {
            status: 'completed',
            current_tool: null,
            results: report,
          });
        } catch (err) {
          const errorMsg = err.message || 'Unknown error occurred during audit';

          let userMessage = errorMsg;
          if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('getaddrinfo')) {
            userMessage = 'DNS lookup failed: the domain could not be resolved. Check the URL and try again.';
          } else if (errorMsg.includes('ECONNREFUSED')) {
            userMessage = 'Connection refused: the target server is not accepting connections.';
          } else if (errorMsg.includes('ETIMEDOUT') || errorMsg.includes('ESOCKETTIMEDOUT')) {
            userMessage = 'Connection timed out: the target site took too long to respond.';
          } else if (errorMsg.includes('ECONNRESET')) {
            userMessage = 'Connection reset: the target server closed the connection unexpectedly.';
          } else if (errorMsg.includes('Certificate') || errorMsg.includes('CERT') || errorMsg.includes('SSL')) {
            userMessage = 'SSL/TLS error: the target site has a certificate issue.';
          } else if (errorMsg.includes('net::ERR_CERT')) {
            userMessage = 'Certificate error: the target site has an invalid or expired SSL certificate.';
          } else if (errorMsg.includes('net::ERR_NAME_NOT_RESOLVED')) {
            userMessage = 'Domain not found: could not resolve the hostname. Check the URL for typos.';
          }

          logAuditError(auditId, audit.url, errorMsg, { stack: err.stack });

          updateAudit(auditId, { status: 'error', error: userMessage });
        }

        clearTimeout(timer);
        process.exit(0);
      }

      main();
    `;

    const child = spawn('node', ['-e', workerScript], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    return NextResponse.json({
      auditId: audit.id,
      url: audit.url,
      remaining: rateResult.remaining,
    });
  } catch (err) {
    logServerError('POST /api/audit', err.message, { stack: err.stack });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
