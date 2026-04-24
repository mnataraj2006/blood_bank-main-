import { useState } from 'react';
import { Heart, Activity, Users, MapPin, ArrowRight, Droplet, Shield, Phone } from 'lucide-react';
import styles from '../css/homepage.module.css';
import { Link } from "react-router-dom";
import Header from './header1.jsx';

export default function Homepage() {
  return (
    <div className={styles.container}>
      <Header />
      
      {/* Premium Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <Activity size={16} />
            <span>Live Blood Request Network</span>
          </div>
          <h1 className={styles.heroTitle}>
            Give the Gift of <span className="text-gradient">Life</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Join a premium network of donors and hospitals. Your single donation can save up to 3 lives instantly through our smart matching system.
          </p>
          <div className={styles.heroActions}>
            <Link to="/signup">
              <button className={styles.primaryBtn}>
                Register as Donor <ArrowRight size={18} />
              </button>
            </Link>
            <Link to="/find-donor">
              <button className={styles.secondaryBtn}>
                Find Blood Urgently
              </button>
            </Link>
          </div>
          <div className={styles.trustIndicators}>
            <div className={styles.trustItem}>
              <Shield size={20} className={styles.trustIcon} />
              <span>Verified Hospitals</span>
            </div>
            <div className={styles.trustItem}>
              <Heart size={20} className={styles.trustIcon} />
              <span>Secure Data</span>
            </div>
          </div>
        </div>
        <div className={styles.heroImageWrapper}>
          {/* A glassmorphism abstract element acting as an image placeholder */}
          <div className={`${styles.glassCard} ${styles.floatingCard}`}>
            <Droplet size={64} className={styles.dropIcon} />
            <div className={styles.pulseRing}></div>
            <h3>Urgent Request</h3>
            <p>O- Blood needed in Apollo Hospital</p>
            <button className={styles.smallBtn}>Donate Now</button>
          </div>
        </div>
      </section>

      {/* Modern Stats Section */}
      <section className={styles.stats}>
        <div className={styles.statCard}>
          <Users size={32} className={styles.statIcon} />
          <h2>5,200+</h2>
          <p>Verified Donors</p>
        </div>
        <div className={styles.statCard}>
          <Heart size={32} className={styles.statIcon} />
          <h2>12,400+</h2>
          <p>Lives Saved</p>
        </div>
        <div className={styles.statCard}>
          <MapPin size={32} className={styles.statIcon} />
          <h2>50+</h2>
          <p>Partner Hospitals</p>
        </div>
      </section>

      {/* Dynamic Process Section */}
      <section className={styles.howItWorks}>
        <div className={styles.sectionHeader}>
          <h2>Seamless <span className="text-gradient">Process</span></h2>
          <p>We've made saving lives easier than ever before.</p>
        </div>
        <div className={styles.steps}>
          {[
            { step: '01', title: 'Register', desc: 'Sign up securely in 60 seconds.' },
            { step: '02', title: 'Get Matched', desc: 'Our AI finds the closest matches instantly.' },
            { step: '03', title: 'Connect', desc: 'Securely contact the donor or hospital.' },
            { step: '04', title: 'Save Lives', desc: 'Donate blood and track your impact.' }
          ].map((item, index) => (
            <div key={index} className={styles.stepCard}>
              <div className={styles.stepNumber}>{item.step}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className={styles.ctaBanner}>
        <div className={styles.ctaContent}>
          <h2>Ready to Make an Impact?</h2>
          <p>Join thousands of heroes already making a difference in their communities.</p>
          <Link to="/signup">
            <button className={`${styles.primaryBtn} ${styles.whiteBtn}`}>
              Become a Hero Today
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <Heart size={24} className={styles.footerIcon} />
            <span>LifeShare</span>
          </div>
          <p>© 2026 LifeShare Network. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
