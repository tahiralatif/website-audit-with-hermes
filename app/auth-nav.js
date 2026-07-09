'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './auth-nav.module.css';

export default function AuthNav({ user: initialUser }) {
  const [user, setUser] = useState(initialUser || null);
  const router = useRouter();

  useEffect(() => {
    if (!initialUser) {
      fetch('/api/auth/me')
        .then((r) => r.json())
        .then((data) => setUser(data.user));
    }
  }, [initialUser]);

  const handleSignOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' });
    setUser(null);
    router.push('/');
  };

  return (
    <nav className={styles.nav} role="navigation" aria-label="Main navigation">
      <Link href="/" className={styles.logo} aria-label="Audit Portal - Home">Audit Portal</Link>
      <div className={styles.links}>
        <a href="/history" className={styles.link} aria-label="View audit history">History</a>
        {user ? (
          <div className={styles.userSection}>
            <span className={styles.userName}>{user.name}</span>
            <button onClick={handleSignOut} className={styles.signOutBtn} aria-label="Sign out of your account">
              Sign Out
            </button>
          </div>
        ) : (
          <div className={styles.authLinks}>
            <a href="/signin" className={styles.link} aria-label="Sign in to your account">Sign In</a>
          </div>
        )}
      </div>
    </nav>
  );
}
