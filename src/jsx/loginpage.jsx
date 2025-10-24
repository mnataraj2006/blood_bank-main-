import React, { useState } from 'react';
import styles from '../css/loginpage.module.css'; // Import the CSS file
import Header from '../jsx/header1.jsx';
import { Link, useNavigate } from "react-router-dom";
import { Shield } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';

const LoginPage = () => {
  // Add these debug lines
  console.log('=== ENVIRONMENT DEBUG ===');
  console.log('Client ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
  console.log('Is undefined?:', import.meta.env.VITE_GOOGLE_CLIENT_ID === undefined);
  console.log('All env vars:', import.meta.env);
  console.log('========================');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [userAuthStatus, setUserAuthStatus] = useState(null);
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const navigate = useNavigate();

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const response = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${tokenResponse.access_token}`);
        const userInfo = await response.json();

        const { email, name, id: googleId } = userInfo;

        // Send Google login data to backend
        const loginResponse = await fetch("http://localhost:5000/auth/google-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            googleId,
          }),
        });

        const data = await loginResponse.json();

        if (loginResponse.ok && data.user) {
          localStorage.setItem("user", JSON.stringify({
            ...data.user,
            token: data.accessToken,
            refreshToken: data.refreshToken
          }));

          if (data.user.role.toLowerCase() === 'donor') {
            navigate('/dashboard');
          } else if (data.user.role.toLowerCase() === 'recipient') {
            navigate('/recipient-dashboard');
          } else if (data.user.role.toLowerCase() === 'hospital_staff') {
            navigate('/hospital-staff-dashboard');
          } else if (data.user.role.toLowerCase() === 'hospital') {
            navigate('/hospital-dashboard');
          }
        } else {
          alert("Google login failed: " + (data.message || "Unknown error"));
        }
      } catch (err) {
        console.error("Google login error:", err);
        alert("Google login failed");
      }
    },
    onError: (error) => {
      console.error("Google login error details:", error);
      alert("Google login failed: " + (error?.message || "Unknown error"));
    }
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Determine which endpoint to use
      const endpoint = isAdminLogin ?
        "http://localhost:5000/admin/login" :
        "http://localhost:5000/login";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();
      console.log("Login API Response:", data);

      if (response.ok) {
        if (isAdminLogin && data.user) {
          // Admin login successful
          localStorage.setItem("admin", JSON.stringify(data.user));
          navigate('/admin-dashboard');
        } else if (!isAdminLogin && data.user) {
          // Regular user login successful
          localStorage.setItem("user", JSON.stringify({
            ...data.user,
            token: data.accessToken,
            refreshToken: data.refreshToken
          }));
          console.log("Login response:", data);

          if (data.user.role.toLowerCase() === 'donor') {
            navigate('/dashboard');
          } else if (data.user.role.toLowerCase() === 'recipient') {
            navigate('/recipient-dashboard');
          } else if (data.user.role.toLowerCase() === 'hospital_staff') {
            navigate('/hospital-staff-dashboard');
          } else if (data.user.role.toLowerCase() === 'hospital') {
            navigate('/hospital-dashboard');
          } else {
            alert("Access denied: Invalid user role.");
          }
        } else {
          alert("Login failed: Invalid response from server.");
        }
      } else {
        // Handle password setup for OAuth users
        if (data.needsPasswordSetup) {
          setUserAuthStatus({ email: formData.email, needsPasswordSetup: true });
          setShowPasswordSetup(true);
          alert("This account was created with Google. Please set a password to continue.");
        } else {
          alert(data.message || "Invalid credentials. Please try again.");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Something went wrong! Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password setup for OAuth users
  const handlePasswordSetup = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (formData.newPassword !== formData.confirmPassword) {
      alert("Passwords do not match!");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userAuthStatus.email,
          password: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Password set successfully! You can now log in with your password.");
        setShowPasswordSetup(false);
        setUserAuthStatus(null);
        // Clear password setup fields
        setFormData(prev => ({
          ...prev,
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        alert(data.message || "Failed to set password");
      }
    } catch (err) {
      console.error("Password setup error:", err);
      alert("Something went wrong! Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fill admin credentials when switching to admin mode
  const toggleAdminLogin = () => {
    setIsAdminLogin(!isAdminLogin);
    if (!isAdminLogin) {
      // Switching to admin mode - auto-fill credentials
      setFormData({
        email: 'admin@lifeshare.com',
        password: 'admin123',
        rememberMe: false
      });
    } else {
      // Switching back to user mode - clear form
      setFormData({
        email: '',
        password: '',
        rememberMe: false
      });
    }
  };

  return (
    <>
      <Header />
      <div className={styles['login-container']}>
        <div className={styles['logo-section']}>
          <div className={styles.logo}>
            <div className={styles['heart-icon']}>
              {isAdminLogin ? <Shield size={24} /> : "♥"}
            </div>
            LifeShare
          </div>
          <p className={styles['welcome-text']}>
            {isAdminLogin ? "Admin Portal" : "Welcome back!"}
          </p>
          <p className={styles.subtitle}>
            {isAdminLogin ? "System Management Access" : "Continue saving lives together"}
          </p>
        </div>

        {/* Admin/User Toggle */}
        <div className={styles['login-mode-toggle']}>
          <button
            type="button"
            onClick={toggleAdminLogin}
            className={`${styles['mode-toggle-btn']} ${isAdminLogin ? styles['admin-mode'] : styles['user-mode']}`}
          >
            {isAdminLogin ? (
              <>
                <Shield size={16} />
                Switch to User Login
              </>
            ) : (
              <>
                <Shield size={16} />
                Admin Login
              </>
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles['form-group']}>
            <label htmlFor="email">
              {isAdminLogin ? "Admin Email" : "Email Address"}
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder={isAdminLogin ? "admin@lifeshare.com" : "Enter your email"}
              className={styles['input-field']}
              required
            />
          </div>

          <div className={styles['form-group']}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              className={styles['input-field']}
              required
            />
          </div>

          {!isAdminLogin && (
            <>
              <div className={styles['remember-me']}>
                <input
                  type="checkbox"
                  id="rememberMe"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                />
                <label htmlFor="rememberMe">Remember me</label>
              </div>

              <div className={styles['forgot-password']}>
                <Link to="/forgot-password">Forgot your password?</Link>
              </div>
            </>
          )}

          {/* Demo credentials info for admin */}
          {isAdminLogin && (
            <div className={styles['admin-info-box']}>
              <p>
                <strong>Demo Credentials:</strong><br/>
                Email: admin@lifeshare.com<br/>
                Password: admin123
              </p>
            </div>
          )}

          <button
            type="submit"
            className={`${styles['login-btn']} ${isAdminLogin ? styles['admin-login-btn'] : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' :
             isAdminLogin ? 'Access Admin Panel' : 'Sign In'}
          </button>

          {!isAdminLogin && (
            <div className={styles['google-login']}>
              <button
                type="button"
                className={styles['google-btn']}
                onClick={() => googleLogin()}
              >
                <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" />
                Continue with Google
              </button>
            </div>
          )}

          {/* Password Setup Modal for OAuth users */}
          {showPasswordSetup && userAuthStatus && (
            <div className={styles['password-setup-modal']}>
              <div className={styles['modal-content']}>
                <h3>Set Up Your Password</h3>
                <p>Your account was created with Google OAuth. To enable password login, please set a password.</p>
                <form onSubmit={handlePasswordSetup}>
                  <div className={styles['form-group']}>
                    <label htmlFor="newPassword">New Password</label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={formData.newPassword || ''}
                      onChange={handleInputChange}
                      placeholder="Enter a new password"
                      className={styles['input-field']}
                      required
                    />
                  </div>
                  <div className={styles['form-group']}>
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword || ''}
                      onChange={handleInputChange}
                      placeholder="Confirm your password"
                      className={styles['input-field']}
                      required
                    />
                  </div>
                  <div className={styles['modal-buttons']}>
                    <button type="button" onClick={() => setShowPasswordSetup(false)} className={styles['cancel-btn']}>
                      Cancel
                    </button>
                    <button type="submit" className={styles['setup-btn']} disabled={isLoading}>
                      {isLoading ? 'Setting Up...' : 'Set Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </form>

        {!isAdminLogin && (
          <div className={styles['signup-link']}>
            Don't have an account? <Link to="/signup">Sign up here</Link>
          </div>
        )}

        {isAdminLogin && (
          <div className={styles['admin-warning-box']}>
            <p>
              ⚠️ Admin access only - Authorized personnel only
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default LoginPage;
