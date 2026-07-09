import Link from 'next/link';
import AuditView from './audit-view';

export default async function AuditPage({ params }) {
  const { id } = await params;
  
  let audit = null;
  try {
    const { getAudit } = await import('@/lib/db');
    audit = getAudit(parseInt(id, 10));
  } catch (e) {
    // DB not available
  }

  if (!audit) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'rgba(6, 182, 212, 0.03)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(6, 182, 212, 0.1)',
          borderRadius: '1.5rem',
          padding: '3rem 2.5rem',
          maxWidth: '420px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h1 style={{
            color: '#f1f5f9',
            fontSize: '1.5rem',
            fontWeight: 800,
            marginBottom: '0.75rem'
          }}>Audit Not Found</h1>
          <p style={{
            color: '#94a3b8',
            fontSize: '0.95rem',
            lineHeight: 1.5,
            marginBottom: '1.5rem'
          }}>
            This audit does not exist or has been removed.
          </p>
          <Link href="/" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: '#06b6d4',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'color 0.25s'
          }}>← Back to Home</Link>
        </div>
      </div>
    );
  }

  return <AuditView audit={audit} />;
}
