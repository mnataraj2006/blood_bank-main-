import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Droplet, Menu, X, Heart } from 'lucide-react';
import styles from '../css/header.module.css';

export default function Header() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ''}`}>
      <div className={styles.container}>
        {/* Brand */}
        <Link to="/" className={styles.brand}>
          <div className={styles.brandIcon}>
            <Droplet size={18} />
          </div>
          <span className={styles.brandText}>LifeShare</span>
        </Link>

        {/* Desktop Nav */}
        <nav className={styles.nav}>
          <Link to="/"           className={styles.navLink}>Home</Link>
          <Link to="/signup"     className={styles.navLink}>Become a Donor</Link>
        </nav>

        {/* Actions */}
        <div className={styles.actions}>
          <Link to="/login">
            <button className={styles.loginBtn}>Sign In</button>
          </Link>
          <Link to="/signup">
            <button className={styles.signupBtn}>Get Started</button>
          </Link>
          <button
            className={styles.mobileMenuBtn}
            onClick={() => setMobileOpen(p => !p)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'var(--card-bg)', borderBottom: '1px solid var(--border)',
          padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
          boxShadow: 'var(--shadow-lg)', zIndex: 99,
        }}>
          {[
            { label: 'Home',          to: '/' },
            { label: 'Become a Donor',to: '/signup' },
            { label: 'Sign In',       to: '/login' },
          ].map(({ label, to }) => (
            <Link
              key={to} to={to}
              style={{ color: 'var(--text-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', fontWeight: 500 }}
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
