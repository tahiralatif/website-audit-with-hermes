import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getLogPath(type) {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(LOG_DIR, `${type}-${date}.log`);
}

function writeLog(type, level, message, meta = {}) {
  try {
    ensureLogDir();
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    };
    fs.appendFileSync(getLogPath(type), JSON.stringify(entry) + '\n');
  } catch (e) {
    console.error('Logging failed:', e.message);
  }
}

export function logAuditError(auditId, url, error, meta = {}) {
  writeLog('audit-errors', 'error', error, {
    auditId,
    url,
    ...meta,
  });
  console.error(`[AUDIT ERROR] audit=${auditId} url=${url} error=${error}`);
}

export function logAuditSuccess(auditId, url, durationMs) {
  writeLog('audit-success', 'info', 'Audit completed', {
    auditId,
    url,
    durationMs,
  });
}

export function logServerError(endpoint, error, meta = {}) {
  writeLog('server-errors', 'error', error, {
    endpoint,
    ...meta,
  });
  console.error(`[SERVER ERROR] endpoint=${endpoint} error=${error}`);
}

export function logRateLimit(key, ip) {
  writeLog('rate-limits', 'warn', 'Rate limit exceeded', {
    key,
    ip,
  });
}
