import React from 'react';
import { Heart, ChevronDown } from 'lucide-react';
import { Link } from "react-router-dom";
import styles from '../css/header.module.css';

const Header = () => {
  return (
    <header className={styles.header}>
        <div className={styles['header-container']}>
          {/* Logo */}
          <div className={styles.logo}>
            <div className={styles['logo-icon']}>
              <Heart size={20} color="white" fill="white" />
            </div>
            <span className={styles['logo-text']}>LifeShare</span>
          </div>

          {/* Navigation */}
          <nav className={styles.nav}>
            <Link to="/">Home</Link>
            <Link to="/login">Find a Donor</Link>
            <Link to="/signup">Become a Donor</Link>
            <a href="#why-donate">Why Donate?</a>
            <Link to="/help">FAQs</Link>
          </nav>


          {/* Auth Buttons */}
          <div>
            <Link to="/login">
              <button className={styles['sign-up-btn']}>Log In</button>
            </Link>
            <Link to="/signup">
              <button
                className={styles['sign-up-btn']}
                onMouseOver={e => e.target.style.backgroundColor = '#0f766e'}
                onMouseOut={e => e.target.style.backgroundColor = '#14b8a6'}

              >
                Sign Up
              </button>
            </Link>
          </div>
        </div>
      </header>
  );
};

export default Header;
