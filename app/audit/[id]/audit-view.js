'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './audit-view.module.css';

export default function AuditView({ audit: initialAudit }) {
  const [audit, setAudit] = useState(initialAudit);

  useEffect(() => {
    if (audit.status === 'pending' || audit.status === 'running') {
      const interval = setInterval(async () => {
        const res = await fetch(`/api/audit/${audit.id}`);
        const data = await res.json();
        setAudit(data);
        if (data.status === 'completed' || data.status === 'error') {
          clearInterval(interval);
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [audit.id, audit.status]);

  if (audit.status === 'error') {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <h2>Audit Failed</h2>
          <p>{audit.error}</p>
          <Link href="/" className={styles.backLink}>← Back to Home</Link>
        </div>
      </div>
    );
  }

  if (audit.status !== 'completed') {
    return (
      <div className={styles.container}>
        <div className={styles.loadingCard} role="status" aria-live="polite">
          <div className={styles.spinner}></div>
          <h2>Auditing {audit.url}</h2>
          <p>{audit.current_tool ? `Running ${audit.current_tool} analysis...` : 'Starting audit...'}</p>
        </div>
      </div>
    );
  }

  const results = audit.results || {};
  const report = results;
  const showUnreachableBanner = report.allFailed && report.failedTools?.length === 4;

  return (
    <div className={styles.container}>
      <div className={styles.heroOrb1}></div>
      <div className={styles.heroOrb2}></div>

      <Link href="/" className={styles.backLink}>← Back to Home</Link>
      <h1 className={styles.url}>{audit.url}</h1>

      {showUnreachableBanner && (
        <div className={styles.unreachableBanner}>
          <div className={styles.unreachableIcon}>⚠️</div>
          <h3>This website could not be reached</h3>
          <p>The audit tools were unable to connect to <strong>{audit.url}</strong>.</p>
          <p className={styles.unreachableHint}>Common causes: domain does not exist, DNS failure, server is down, or connection was refused.</p>
        </div>
      )}

      <div className={styles.scoreSection}>
        <ScoreRing score={report.overallScore || 0} grade={report.overallGrade || 'F'} />
        <div className={styles.categoryScores}>
          {report.categories && Object.entries(report.categories).map(([key, cat]) => (
            <ScoreBar key={key} label={key} score={cat.score} grade={cat.grade} />
          ))}
        </div>
      </div>

      {report.suggestions && report.suggestions.length > 0 && (
        <div className={styles.suggestionsSection} aria-label="Audit suggestions">
          <h2>Suggestions ({report.suggestions.length})</h2>
          <div className={styles.suggestionList}>
            {report.suggestions.map((s, i) => (
              <IssueCard key={i} suggestion={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreRing({ score, grade }) {
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const gradeColors = {
    A: '#22c55e',
    B: '#06b6d4',
    C: '#eab308',
    D: '#f97316',
    F: '#ef4444',
  };

  const ringColor = gradeColors[grade] || '#94a3b8';

  return (
    <div className={styles.scoreRing}>
      <svg width="200" height="200" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor={ringColor} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Background track */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="10"
        />
        {/* Score arc */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 100 100)"
          className={styles.scoreCircle}
          filter="url(#glow)"
        />
        {/* Score text */}
        <text x="100" y="93" textAnchor="middle" fill="#f1f5f9" fontSize="2.8rem" fontWeight="800" fontFamily="system-ui, sans-serif">
          {score}
        </text>
        <text x="100" y="125" textAnchor="middle" fill="#94a3b8" fontSize="1.1rem" fontWeight="600" fontFamily="system-ui, sans-serif">
          Grade {grade}
        </text>
      </svg>
    </div>
  );
}

function ScoreBar({ label, score, grade }) {
  const colors = {
    A: '#22c55e',
    B: '#06b6d4',
    C: '#eab308',
    D: '#f97316',
    F: '#ef4444',
  };

  const categoryIcons = {
    seo: '🔍',
    performance: '⚡',
    security: '🔒',
    accessibility: '♿',
  };

  return (
    <div className={styles.scoreBar}>
      <div className={styles.scoreBarHeader}>
        <span className={styles.scoreBarLabel}>
          {categoryIcons[label] || ''} {label}
        </span>
        <span className={styles.scoreBarGrade} style={{ color: colors[grade] }}>{score} ({grade})</span>
      </div>
      <div className={styles.scoreBarTrack}>
        <div
          className={styles.scoreBarFill}
          style={{ width: `${score}%`, background: `linear-gradient(90deg, ${colors[grade]}88, ${colors[grade]})`, color: colors[grade] }}
        ></div>
      </div>
    </div>
  );
}

function IssueCard({ suggestion }) {
  const impactColors = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#06b6d4',
    low: '#94a3b8',
  };

  const impactIcons = {
    critical: '🔴',
    high: '🟠',
    medium: '🔵',
    low: '⚪',
  };

  const categoryColors = {
    seo: '#14b8a6',
    performance: '#06b6d4',
    security: '#ef4444',
    accessibility: '#8b5cf6',
  };

  return (
    <div className={styles.issueCard}>
      <div className={styles.issueHeader}>
        <span
          className={styles.categoryBadge}
          style={{ background: `${categoryColors[suggestion.category]}15`, color: categoryColors[suggestion.category], border: `1px solid ${categoryColors[suggestion.category]}25` }}
        >
          {suggestion.category}
        </span>
        <span
          className={styles.impactPill}
          style={{ background: `${impactColors[suggestion.impact]}15`, color: impactColors[suggestion.impact], border: `1px solid ${impactColors[suggestion.impact]}25` }}
        >
          {impactIcons[suggestion.impact] || ''} {suggestion.impact}
        </span>
      </div>
      <p className={styles.issueMessage}>{suggestion.message}</p>
      <div className={styles.issueMeta}>
        Effort: {suggestion.effort}
      </div>
    </div>
  );
}
