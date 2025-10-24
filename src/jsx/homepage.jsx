import { useState } from 'react';
import { Heart, ChevronDown } from 'lucide-react';
import styles from '../css/homepage.module.css';
import LifeShareSignup from './signuppage.jsx';
import { Link } from "react-router-dom";
import Header from './header1.jsx';

export default function Homepage() {
  return (
    <div className={styles.container}>
      {/* Header */}
      <Header />
      {/* Hero Section */}
      <section className={styles.hero}>
        <h1>Donate Blood, Save Lives</h1>
        <p>Join our community of heroes. One donation can save up to 3 lives.</p>
        <div className={styles.heroButtons}>
          <Link to="/login">
            <button className={styles.ctaBtn}>Find a Donor</button>
            <button className={styles.ctaBtnSecondary}>Become a Donor</button>
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.stats}>
        <div className={styles.statCard}>
          <h2>5,200+</h2>
          <p>Donors Registered</p>
        </div>
        <div className={styles.statCard}>
          <h2>12,000+</h2>
          <p>Lives Saved</p>
        </div>
        <div className={styles.statCard}>
          <h2>50+</h2>
          <p>Cities Covered</p>
        </div>
      </section>

      {/* How It Works */}
      <section className={styles.howItWorks}>
        <h2>How It Works</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <h3>1</h3>
            <p>Sign Up as Donor or Recipient</p>
          </div>
          <div className={styles.step}>
            <h3>2</h3>
            <p>Search & Find a Matching Donor</p>
          </div>
          <div className={styles.step}>
            <h3>3</h3>
            <p>Connect via Phone/Email</p>
          </div>
          <div className={styles.step}>
            <h3>4</h3>
            <p>Donate & Save a Life</p>
          </div>
        </div>
      </section>

      {/* Why Donate */}
      <section id="why-donate" className={styles.whyDonate}>
        <h2 >Why Donate?</h2>
        <p >
          Every 2 seconds, someone needs blood. 1 unit of blood can save up to
          3 lives. Your donation makes a difference!
        </p>
      </section>

      {/* Testimonials */}
      <section className={styles.testimonials}>
        <h2>What People Say</h2>
        <div className={styles.testimonialCard}>
          <p>
            "I never thought a simple donation could make such a difference.
            LifeShare made it easy!"
          </p>
        </div>
      </section>

      {/* Call to Action */}
      <section className={styles.ctaBanner}>
        <h2>Be a Lifesaver Today</h2>
        <Link to="/signup">
          <button className={styles.signUpBtn}>Register Now</button>
        </Link>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>© 2025 LifeShare. All Rights Reserved.</p>
      </footer>
      
    </div>
  );
}