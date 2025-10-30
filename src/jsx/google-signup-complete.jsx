import React, { useState, useEffect } from 'react';
import styles from '../css/signuppage.module.css';
import Header from '../jsx/header1.jsx';
import { useNavigate, useSearchParams } from 'react-router-dom';

const GoogleSignupComplete = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    // Pre-filled from Google
    fullName: '',
    email: '',

    // Additional fields to collect
    dateOfBirth: '',
    gender: '',
    phoneNumber: '',
    otp: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    role: '',

    // Donor fields
    bloodGroup: '',
    willingToDonatePlasma: '',
    lastDonationDate: '',
    weight: '',
    healthConditions: [],

    // Google OAuth data
    googleId: '',
    googleToken: ''
  });

  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const healthConditionOptions = ['Diabetes', 'Hypertension', 'Hepatitis', 'None', 'Other'];

  useEffect(() => {
    // Get data from URL params (passed from Google OAuth)
    const googleId = searchParams.get('googleId');
    const email = searchParams.get('email');
    const name = searchParams.get('name');
    const token = searchParams.get('token');

    if (!googleId || !email || !name || !token) {
      alert('Invalid Google signup session. Please try again.');
      navigate('/signup');
      return;
    }

    setFormData(prev => ({
      ...prev,
      fullName: name,
      email: email,
      googleId: googleId,
      googleToken: token
    }));
  }, [searchParams, navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      if (name === 'healthConditions') {
        setFormData(prev => ({
          ...prev,
          healthConditions: checked
            ? [...prev.healthConditions, value]
            : prev.healthConditions.filter(item => item !== value)
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSendOTP = () => {
    if (formData.phoneNumber.length === 10) {
      setOtpSent(true);
      setOtpTimer(30);
      const timer = setInterval(() => {
        setOtpTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleSubmit = async(e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("${process.env.REACT_APP_API_URL || 'https://blood-bank-backend.onrender.com'}/auth/google/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Signup completed successfully! Please log in.");
        navigate('/login');
      } else {
        alert(data.message || "Signup failed. Please try again.");
      }
    } catch (error) {
      console.error("Signup error:", error);
      alert("Something went wrong! Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
        <Header />
      <div className={styles['signup-container']}>
        <div className={styles['signup-form']}>
          <div className={styles['form-section']}>
            <h2 className={styles['section-title']}>
              <span className={styles['section-icon']}>🔐</span>
              Complete Your Google Signup
            </h2>
            <p style={{ textAlign: 'center', marginBottom: '1rem', color: '#6b7280' }}>
              We need a few more details to complete your account setup.
            </p>
          </div>

          {/* Pre-filled Google Info Display */}
          <div className={styles['form-section']}>
            <div className={styles['google-info-display']}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
                padding: '1rem',
                backgroundColor: '#f0f9ff',
                border: '1px solid #0ea5e9',
                borderRadius: '0.5rem'
              }}>
                <img src="https://developers.google.com/identity/images/g-logo.png"
                     alt="Google"
                     style={{ width: '20px', height: '20px' }} />
                <div>
                  <div style={{ fontWeight: '500', color: '#0f172a' }}>{formData.fullName}</div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{formData.email}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Information Section */}
          <div className={styles['form-section']}>
            <h2 className={styles['section-title']}>
              <span className={styles['section-icon']}>👤</span>
              Basic Information
            </h2>

            <div className={styles['form-grid']}>
              <div className={styles['form-group']}>
                <label className={`${styles['form-label']} ${styles.required}`}>Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  className={styles['form-input']}
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  required />
              </div>

              <div className={styles['form-group']}>
                <label className={`${styles['form-label']} ${styles.required}`}>Gender</label>
                <select
                  name="gender"
                  className={styles['form-select']}
                  value={formData.gender}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact & Verification Section */}
          <div className={styles['form-section']}>
            <h2 className={styles['section-title']}>
              <span className={styles['section-icon']}>📱</span>
              Contact & Verification
            </h2>

            <div className={styles['form-grid']}>
              <div className={styles['form-group']}>
                <label className={`${styles['form-label']} ${styles.required}`}>Phone Number</label>
                <div className={styles['otp-section']}>
                  <input
                    type="tel"
                    name="phoneNumber"
                    className={styles['form-input']}
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="10-digit mobile number"
                    maxLength="10"
                    required />
                  <button
                    type="button"
                    className={styles['otp-button']}
                    onClick={handleSendOTP}
                    disabled={otpTimer > 0 || formData.phoneNumber.length !== 10}
                  >
                    {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Send OTP'}
                  </button>
                </div>
              </div>

              {otpSent && (
                <div className={styles['form-group']}>
                  <label className={`${styles['form-label']} ${styles.required}`}>Enter OTP</label>
                  <input
                    type="text"
                    name="otp"
                    className={styles['form-input']}
                    value={formData.otp}
                    onChange={handleInputChange}
                    placeholder="6-digit OTP"
                    maxLength="6"
                    required />
                </div>
              )}
            </div>
          </div>

          {/* Address Section */}
          <div className={styles['form-section']}>
            <h2 className={styles['section-title']}>
              <span className={styles['section-icon']}>📍</span>
              Address Information
            </h2>

            <div className={styles['form-grid']}>
              <div className={`${styles['form-group']} ${styles['full-width']}`}>
                <label className={`${styles['form-label']} ${styles.required}`}>Street Address</label>
                <input
                  type="text"
                  name="street"
                  className={styles['form-input']}
                  value={formData.street}
                  onChange={handleInputChange}
                  placeholder="House/Flat No, Street, Area"
                  required />
              </div>

              <div className={styles['form-group']}>
                <label className={`${styles['form-label']} ${styles.required}`}>City</label>
                <input
                  type="text"
                  name="city"
                  className={styles['form-input']}
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Your city"
                  required />
              </div>

              <div className={styles['form-group']}>
                <label className={`${styles['form-label']} ${styles.required}`}>State</label>
                <input
                  type="text"
                  name="state"
                  className={styles['form-input']}
                  value={formData.state}
                  onChange={handleInputChange}
                  placeholder="Your state"
                  required />
              </div>

              <div className={styles['form-group']}>
                <label className={`${styles['form-label']} ${styles.required}`}>Pincode</label>
                <input
                  type="text"
                  name="pincode"
                  className={styles['form-input']}
                  value={formData.pincode}
                  onChange={handleInputChange}
                  placeholder="6-digit pincode"
                  maxLength="6"
                  required />
              </div>
            </div>
          </div>

          {/* Role Selection */}
          <div className={styles['form-section']}>
            <h2 className={styles['section-title']}>
              <span className={styles['section-icon']}>🎯</span>
              Select Your Role
            </h2>

            <div className={styles['role-selection']}>
              <div className={styles['role-option']}>
                <input
                  type="radio"
                  name="role"
                  value="donor"
                  id="donor"
                  onChange={handleInputChange}
                  required />
                <label htmlFor="donor" className={styles['role-card']}>
                  <div className={styles['role-icon']}>🩸</div>
                  <div className={styles['role-title']}>Blood Donor</div>
                  <div className={styles['role-description']}>Help save lives by donating blood</div>
                </label>
              </div>

              <div className={styles['role-option']}>
                <input
                  type="radio"
                  name="role"
                  value="recipient"
                  id="recipient"
                  onChange={handleInputChange}
                  required />
                <label htmlFor="recipient" className={styles['role-card']}>
                  <div className={styles['role-icon']}>🏥</div>
                  <div className={styles['role-title']}>Recipient</div>
                  <div className={styles['role-description']}>Find blood donors for medical needs</div>
                </label>
              </div>
            </div>
          </div>

          {/* Donor-Specific Fields */}
          {formData.role === 'donor' && (
            <div className={`${styles['form-section']} ${styles['conditional-section']} ${styles.show}`}>
              <h2 className={styles['section-title']}>
                <span className={styles['section-icon']}>🩸</span>
                Donor Information
              </h2>

              <div className={styles['form-grid']}>
                <div className={styles['form-group']}>
                  <label className={`${styles['form-label']} ${styles.required}`}>Blood Group</label>
                  <select
                    name="bloodGroup"
                    className={styles['form-select']}
                    value={formData.bloodGroup}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Blood Group</option>
                    {bloodGroups.map(group => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>

                <div className={styles['form-group']}>
                  <label className={`${styles['form-label']} ${styles.required}`}>Weight (kg)</label>
                  <input
                    type="number"
                    name="weight"
                    className={styles['form-input']}
                    value={formData.weight}
                    onChange={handleInputChange}
                    placeholder="Your weight in kg"
                    min="45"
                    required />
                </div>

                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Last Donation Date</label>
                  <input
                    type="date"
                    name="lastDonationDate"
                    className={styles['form-input']}
                    value={formData.lastDonationDate}
                    onChange={handleInputChange} />
                </div>

                <div className={styles['form-group']}>
                  <label className={`${styles['form-label']} ${styles.required}`}>Willing to Donate Plasma?</label>
                  <div className={styles['radio-group']}>
                    <div className={styles['radio-option']}>
                      <input
                        type="radio"
                        name="willingToDonatePlasma"
                        value="yes"
                        id="plasma-yes"
                        onChange={handleInputChange} />
                      <label htmlFor="plasma-yes">Yes</label>
                    </div>
                    <div className={styles['radio-option']}>
                      <input
                        type="radio"
                        name="willingToDonatePlasma"
                        value="no"
                        id="plasma-no"
                        onChange={handleInputChange} />
                      <label htmlFor="plasma-no">No</label>
                    </div>
                  </div>
                </div>

                <div className={`${styles['form-group']} ${styles['full-width']}`}>
                  <label className={`${styles['form-label']} ${styles.required}`}>Health Conditions</label>
                  <div className={styles['checkbox-group']}>
                    {healthConditionOptions.map(condition => (
                      <div key={condition} className={styles['checkbox-option']}>
                        <input
                          type="checkbox"
                          name="healthConditions"
                          value={condition}
                          id={`health-${condition}`}
                          onChange={handleInputChange} />
                        <label htmlFor={`health-${condition}`}>{condition}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            className={styles['submit-button']}
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Complete Signup'}
          </button>

          <div className={styles['login-link']}>
            Already have an account? <a href="/login" style={{ color: '#3b82f6', textDecoration: 'none' }}>Log In</a>
          </div>
        </div>
      </div>
    </>
  );
};

export default GoogleSignupComplete;
