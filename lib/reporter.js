const WEIGHTS = { seo: 0.25, performance: 0.3, security: 0.25, accessibility: 0.2 };

const GRADE_THRESHOLDS = [
  { min: 90, grade: 'A' },
  { min: 80, grade: 'B' },
  { min: 60, grade: 'C' },
  { min: 40, grade: 'D' },
  { min: 0, grade: 'F' },
];

const SUGGESTION_TEMPLATES = [
  { keywords: ['title'], message: 'Add or improve your page title for better SEO', impact: 'high', effort: 'low', category: 'seo' },
  { keywords: ['meta description', 'metadescription'], message: 'Add a compelling meta description (150-160 chars)', impact: 'high', effort: 'low', category: 'seo' },
  { keywords: ['viewport'], message: 'Add a viewport meta tag for mobile responsiveness', impact: 'high', effort: 'low', category: 'seo' },
  { keywords: ['canonical'], message: 'Add a canonical URL to prevent duplicate content issues', impact: 'medium', effort: 'low', category: 'seo' },
  { keywords: ['og:', 'open graph'], message: 'Add Open Graph tags for better social media sharing', impact: 'medium', effort: 'low', category: 'seo' },
  { keywords: ['twitter:'], message: 'Add Twitter Card tags for better Twitter sharing', impact: 'low', effort: 'low', category: 'seo' },
  { keywords: ['heading', 'h1'], message: 'Use proper heading hierarchy (H1-H6) for content structure', impact: 'high', effort: 'low', category: 'seo' },
  { keywords: ['alt', 'image'], message: 'Add alt text to all images for accessibility and SEO', impact: 'high', effort: 'low', category: 'seo' },
  { keywords: ['robots'], message: 'Add or fix robots.txt to guide search engine crawlers', impact: 'medium', effort: 'low', category: 'seo' },
  { keywords: ['sitemap'], message: 'Add a sitemap.xml to help search engines index your pages', impact: 'medium', effort: 'low', category: 'seo' },
  { keywords: ['hsts', 'strict-transport'], message: 'Enable HSTS (Strict-Transport-Security) header', impact: 'high', effort: 'low', category: 'security' },
  { keywords: ['csp', 'content-security-policy'], message: 'Implement Content Security Policy to prevent XSS attacks', impact: 'high', effort: 'medium', category: 'security' },
  { keywords: ['x-frame-options'], message: 'Add X-Frame-Options header to prevent clickjacking', impact: 'medium', effort: 'low', category: 'security' },
  { keywords: ['x-content-type-options'], message: 'Add X-Content-Type-Options: nosniff header', impact: 'medium', effort: 'low', category: 'security' },
  { keywords: ['referrer-policy'], message: 'Set a Referrer-Policy header to control information leakage', impact: 'medium', effort: 'low', category: 'security' },
  { keywords: ['permissions-policy'], message: 'Add Permissions-Policy header to restrict browser features', impact: 'low', effort: 'medium', category: 'security' },
  { keywords: ['expired', 'certificate', 'tls'], message: 'Fix expired or invalid TLS certificate immediately', impact: 'critical', effort: 'medium', category: 'security' },
  { keywords: ['self-signed'], message: 'Replace self-signed certificate with a trusted CA certificate', impact: 'high', effort: 'medium', category: 'security' },
  { keywords: ['fcp', 'first-contentful-paint'], message: 'Optimize First Contentful Paint — reduce render-blocking resources', impact: 'high', effort: 'high', category: 'performance' },
  { keywords: ['lcp', 'largest-contentful-paint'], message: 'Optimize Largest Contentful Paint — preload hero images and fonts', impact: 'high', effort: 'high', category: 'performance' },
  { keywords: ['cls', 'cumulative-layout-shift'], message: 'Fix layout shifts — set explicit dimensions on images and ads', impact: 'high', effort: 'medium', category: 'performance' },
  { keywords: ['tbt', 'total-blocking-time', 'blocking'], message: 'Reduce Total Blocking Time — break up long tasks and defer scripts', impact: 'high', effort: 'high', category: 'performance' },
  { keywords: ['speed-index'], message: 'Improve Speed Index — optimize above-the-fold content loading', impact: 'medium', effort: 'high', category: 'performance' },
  { keywords: ['load time', 'loadtime'], message: 'Reduce page load time — enable compression and caching', impact: 'medium', effort: 'high', category: 'performance' },
  { keywords: ['color-contrast', 'contrast'], message: 'Fix color contrast ratios to meet WCAG AA standards (4.5:1 minimum)', impact: 'high', effort: 'medium', category: 'accessibility' },
  { keywords: ['label', 'form'], message: 'Add associated labels to all form inputs for screen readers', impact: 'high', effort: 'low', category: 'accessibility' },
  { keywords: ['landmark', 'region'], message: 'Use ARIA landmarks to help screen reader navigation', impact: 'medium', effort: 'medium', category: 'accessibility' },
  { keywords: ['tab', 'focus'], message: 'Ensure all interactive elements are keyboard accessible', impact: 'high', effort: 'medium', category: 'accessibility' },
  { keywords: ['aria', 'role'], message: 'Add proper ARIA roles and attributes to custom components', impact: 'medium', effort: 'medium', category: 'accessibility' },
];

function getGrade(score) {
  for (const t of GRADE_THRESHOLDS) {
    if (score >= t.min) return t.grade;
  }
  return 'F';
}

function calculateCategoryScore(toolResults) {
  if (!toolResults) return 0;
  if (toolResults.error) return 0; // Tool failed — zero score for this category
  if (typeof toolResults === 'number') return toolResults;
  if (toolResults.score !== undefined && toolResults.score !== null) return toolResults.score;

  // Fallback scoring based on available data
  let score = 70; // base

  if (toolResults.title !== undefined) { if (toolResults.title) score += 5; }
  if (toolResults.metaDescription !== undefined) { if (toolResults.metaDescription) score += 5; }
  if (toolResults.viewport !== undefined) { if (toolResults.viewport) score += 5; }
  if (toolResults.canonical !== undefined) { if (toolResults.canonical) score += 5; }
  if (toolResults.tls) { if (toolResults.tls && !toolResults.tls.expired && !toolResults.tls.error) score += 5; }
  if (toolResults.headers) { if (toolResults.headers?.hsts) score += 5; }

  return Math.min(Math.max(score, 0), 100);
}

export function generateReport(results) {
  const seoScore = calculateCategoryScore(results.seo);
  const performanceScore = calculateCategoryScore(results.performance);
  const securityScore = calculateCategoryScore(results.security);
  const accessibilityScore = calculateCategoryScore(results.accessibility);

  // Check if all tools failed — site was likely unreachable
  const allFailed = ['seo', 'performance', 'security', 'accessibility'].every(
    (key) => results[key] && results[key].error
  );
  const failedTools = ['seo', 'performance', 'security', 'accessibility'].filter(
    (key) => results[key] && results[key].error
  );

  const scores = {
    seo: seoScore,
    performance: performanceScore,
    security: securityScore,
    accessibility: accessibilityScore,
  };

  const overallScore = Math.round(
    scores.seo * WEIGHTS.seo +
    scores.performance * WEIGHTS.performance +
    scores.security * WEIGHTS.security +
    scores.accessibility * WEIGHTS.accessibility
  );

  const overallGrade = getGrade(overallScore);

  const categories = {};
  for (const [key, score] of Object.entries(scores)) {
    categories[key] = { score, grade: getGrade(score) };
  }

  // Generate suggestions
  const suggestions = [];
  const resultStr = JSON.stringify(results).toLowerCase();

  for (const template of SUGGESTION_TEMPLATES) {
    for (const keyword of template.keywords) {
      if (resultStr.includes(keyword)) {
        suggestions.push({ ...template });
        break;
      }
    }
  }

  // Priority sort
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  suggestions.sort(
    (a, b) => (priorityOrder[a.impact] || 4) - (priorityOrder[b.impact] || 4)
  );

  return {
    overallScore,
    overallGrade,
    scores,
    categories,
    suggestions,
    rawResults: results,
    allFailed,
    failedTools,
  };
}
