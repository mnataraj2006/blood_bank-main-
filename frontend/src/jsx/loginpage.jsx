import React, { useState } from 'react';
import styles from '../css/loginpage.module.css';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Droplet, Heart, Users, Activity } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [userAuthStatus, setUserAuthStatus] = useState(null);
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const navigate = useNavigate();

  const API = import.meta.env.VITE_API_URL || 'https://blood-bank-backend.onrender.com';

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${tokenResponse.access_token}`);
        const { email, id: googleId } = await res.json();
        const loginRes = await fetch(`${API}/auth/google-login`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, googleId }),
        });
        const data = await loginRes.json();
        if (loginRes.ok && data.user) {
          localStorage.setItem('user', JSON.stringify({ ...data.user, token: data.accessToken, refreshToken: data.refreshToken }));
          redirectByRole(data.user.role);
        } else { alert('Google login failed: ' + (data.message || 'Unknown error')); }
      } catch { alert('Google login failed'); }
    },
    onError: () => alert('Google login failed'),
  });

  const redirectByRole = (role) => {
    const r = role?.toLowerCase();
    if      (r === 'donor')         navigate('/dashboard');
    else if (r === 'recipient')     navigate('/recipient-dashboard');
    else if (r === 'hospital_staff')navigate('/hospital-staff-dashboard');
    else if (r === 'hospital')      navigate('/hospital-dashboard');
    else alert('Access denied: Invalid user role.');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const endpoint = isAdminLogin ? `${API}/admin/login` : `${API}/login`;
      const res = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });
      const data = await res.json();
      if (res.ok) {
        if (isAdminLogin && data.user) {
          localStorage.setItem('admin', JSON.stringify(data.user));
          navigate('/admin-dashboard');
        } else if (!isAdminLogin && data.user) {
          localStorage.setItem('user', JSON.stringify({ ...data.user, token: data.accessToken, refreshToken: data.refreshToken }));
          redirectByRole(data.user.role);
        } else { alert('Login failed: Invalid response from server.'); }
      } else {
        if (data.needsPasswordSetup) {
          setUserAuthStatus({ email: formData.email, needsPasswordSetup: true });
          setShowPasswordSetup(true);
        } else { alert(data.message || 'Invalid credentials.'); }
      }
    } catch { alert('Something went wrong. Please try again.'); }
    finally { setIsLoading(false); }
  };

  const handlePasswordSetup = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) { alert('Passwords do not match!'); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/auth/set-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userAuthStatus.email, password: formData.newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Password set! You can now sign in.');
        setShowPasswordSetup(false);
        setUserAuthStatus(null);
        setFormData(p => ({ ...p, newPassword: '', confirmPassword: '' }));
      } else { alert(data.message || 'Failed to set password'); }
    } catch { alert('Something went wrong.'); }
    finally { setIsLoading(false); }
  };

  const toggleAdmin = () => {
    setIsAdminLogin(p => {
      if (!p) setFormData({ email: 'admin@lifeshare.com', password: 'admin123', rememberMe: false });
      else    setFormData({ email: '', password: '', rememberMe: false });
      return !p;
    });
  };

  return (
    <div className={styles.loginWrapper}>
      {/* ── LEFT PANEL ── */}
      <div className={styles.leftPanel}>
        <div className={styles.leftContent}>
          <div className={styles.leftLogo}>
            <div className={styles.leftLogoIcon}><Droplet size={24} /></div>
            <span className={styles.leftLogoText}>LifeShare</span>
          </div>
          <div className={styles.bloodDrop}><Droplet size={40} /></div>
          <h2 className={styles.leftTitle}>Every Drop Counts</h2>
          <p className={styles.leftSubtitle}>
            Join our network of life-savers. Connect with recipients, donate blood, and be part of something bigger than yourself.
          </p>
          <div className={styles.statsRow}>
            {[
              { num: '5,200+', label: 'Donors' },
              { num: '12,400+', label: 'Lives Saved' },
              { num: '50+', label: 'Hospitals' },
            ].map(({ num, label }) => (
              <div key={label} className={styles.statPill}>
                <div className={styles.statPillNum}>{num}</div>
                <div className={styles.statPillLabel}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className={styles.rightPanel}>
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <h1 className={styles.formTitle}>
              {isAdminLogin ? 'Admin Portal' : 'Welcome back'}
            </h1>
            <p className={styles.formSubtitle}>
              {isAdminLogin ? 'System management access — authorized personnel only' : 'Sign in to continue saving lives'}
            </p>
          </div>

          {/* Mode Toggle */}
          <div className={styles.modeToggle}>
            <button className={`${styles.modeBtn} ${!isAdminLogin ? styles.active : ''}`} onClick={() => !isAdminLogin || toggleAdmin()}>
              User Login
            </button>
            <button className={`${styles.modeBtn} ${isAdminLogin ? styles.adminActive : ''}`} onClick={() => isAdminLogin || toggleAdmin()}>
              <Shield size={14} /> Admin
            </button>
          </div>

          {/* Admin hint */}
          {isAdminLogin && (
            <div className={styles.adminInfoBox}>
              <strong>Demo Credentials</strong><br />
              Email: admin@lifeshare.com<br />
              Password: admin123
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.inputLabel} htmlFor="email">
                {isAdminLogin ? 'Admin Email' : 'Email Address'}
              </label>
              <input
                id="email" type="email" name="email"
                value={formData.email} onChange={handleChange}
                placeholder={isAdminLogin ? 'admin@lifeshare.com' : 'you@example.com'}
                className={styles.inputField} required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.inputLabel} htmlFor="password">Password</label>
              <input
                id="password" type="password" name="password"
                value={formData.password} onChange={handleChange}
                placeholder="Enter your password"
                className={styles.inputField} required
              />
            </div>

            {!isAdminLogin && (
              <div className={styles.formRow}>
                <div className={styles.checkRow}>
                  <input type="checkbox" id="rememberMe" name="rememberMe" checked={formData.rememberMe} onChange={handleChange} />
                  <label htmlFor="rememberMe" className={styles.checkLabel}>Remember me</label>
                </div>
                <Link to="/forgot-password" className={styles.forgotLink}>Forgot password?</Link>
              </div>
            )}

            <button
              type="submit"
              className={`${styles.submitBtn} ${isAdminLogin ? styles.submitBtnAdmin : ''}`}
              disabled={isLoading}
            >
              {isLoading ? 'Signing in…' : isAdminLogin ? 'Access Admin Panel' : 'Sign In'}
            </button>

            {!isAdminLogin && (
              <>
                <div className={styles.orDivider}>or continue with</div>
                <button type="button" className={styles.googleBtn} onClick={() => googleLogin()}>
                  <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" />
                  Continue with Google
                </button>
              </>
            )}
          </form>

          {!isAdminLogin && (
            <div className={styles.signupLink}>
              Don't have an account? <Link to="/signup">Create one free</Link>
            </div>
          )}

          {isAdminLogin && (
            <div className={styles.adminWarning}>⚠️ Restricted Access — Authorized Personnel Only</div>
          )}
        </div>
      </div>

      {/* ── PASSWORD SETUP MODAL ── */}
      {showPasswordSetup && userAuthStatus && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Set Up Your Password</h3>
            <p>Your account was created with Google. Set a password to enable direct login.</p>
            <form onSubmit={handlePasswordSetup}>
              <div className={styles.formGroup}>
                <label className={styles.inputLabel}>New Password</label>
                <input type="password" name="newPassword" value={formData.newPassword || ''} onChange={handleChange} className={styles.inputField} placeholder="Enter new password" required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.inputLabel}>Confirm Password</label>
                <input type="password" name="confirmPassword" value={formData.confirmPassword || ''} onChange={handleChange} className={styles.inputField} placeholder="Confirm password" required />
              </div>
              <div className={styles.modalBtns}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowPasswordSetup(false)}>Cancel</button>
                <button type="submit" className={styles.setupBtn} disabled={isLoading}>{isLoading ? 'Setting up…' : 'Set Password'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
