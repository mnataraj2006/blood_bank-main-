import React, { useState } from 'react';
import styles from '../css/signuppage.module.css';
import Header from '../jsx/header1.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
const LifeShareSignup= () => {
  const [formData, setFormData] = useState({
    // Common fields
    fullName: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    phoneNumber: '',
    otp: '',
    password: '',
    confirmPassword: '',
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

    // Hospital staff fields - removed as per user request
    // hospitalId: '',
    // staffRole: '',
  });

  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const navigate = useNavigate();

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const healthConditionOptions = ['Diabetes', 'Hypertension', 'Hepatitis', 'None', 'Other'];

  const googleLogin = useGoogleLogin({
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    onSuccess: async (tokenResponse) => {
      try {
        const response = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${tokenResponse.access_token}`);
        const userInfo = await response.json();

        const { email, name, id: googleId } = userInfo;

        // Check if user already exists
        const checkResponse = await fetch("${process.env.REACT_APP_API_URL || 'https://blood-bank-backend.onrender.com'}/auth/google/check-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const checkData = await checkResponse.json();

        if (checkData.exists) {
          alert("An account with this email already exists. Please log in instead.");
          navigate('/login');
        } else {
          // Redirect to complete signup page with Google data
          const params = new URLSearchParams({
            googleId,
            email,
            name,
            token: tokenResponse.access_token
          });
          navigate(`/google-signup-complete?${params.toString()}`);
        }
      } catch (err) {
        console.error("Google signup error:", err);
        alert("Google signup failed");
      }
    },
    onError: () => {
      alert("Google login failed");
    }
  });

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
    } else if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        [name]: e.target.files[0]
      }));
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

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    const res = await fetch("${process.env.REACT_APP_API_URL || 'https://blood-bank-backend.onrender.com'}/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    if (res.ok) {
      alert("Signup successful! Please log in.");
      navigate('/login');
    } else {
      alert(data.message || "Signup failed. Please try again.");
    }
  };

  return (
    <>
        <Header />
      <div className={styles['signup-container']}>
           

            <div className={styles['signup-form']}>
                {/* Basic Information Section */}
                <div className={styles['form-section']}>
                    <h2 className={styles['section-title']}>
                        <span className={styles['section-icon']}>👤</span>
                        Basic Information
                    </h2>

                    <div className={styles['form-grid']}>
                        <div className={styles['form-group']}>
                            <label className={`${styles['form-label']} ${styles.required}`}>Full Name</label>
                            <input
                                type="text"
                                name="fullName"
                                className={`${styles['form-input']} ${styles['input-field']}`}
                                value={formData.fullName}
                                onChange={handleInputChange}
                                placeholder="Enter your full name"
                                required />
                        </div>

                        <div className={styles['form-group']}>
                            <label className={`${styles['form-label']} ${styles.required}`}>Date of Birth</label>
                            <input
                                type="date"
                                name="dateOfBirth"
                                className={`${styles['form-input']} ${styles['input-field']}`}
                                value={formData.dateOfBirth}
                                onChange={handleInputChange}
                                required />
                        </div>

                        <div className={styles['form-group']}>
                            <label className={`${styles['form-label']} ${styles.required}`}>Gender</label>
                            <select
                                name="gender"
                                className={`${styles['form-select']} ${styles['input-field']}`}
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

                        <div className={styles['form-group']}>
                            <label className={`${styles['form-label']} ${styles.required}`}>Email</label>
                            <input
                                type="email"
                                name="email"
                                className={`${styles['form-input']} ${styles['input-field']}`}
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="your.email@example.com"
                                required />
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

                        <div className={styles['form-group']}>
                            <label className={`${styles['form-label']} ${styles.required}`}>Password</label>
                            <input
                                type="password"
                                name="password"
                                className={styles['form-input']}
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="Create a strong password"
                                required />
                        </div>

                        <div className={styles['form-group']}>
                            <label className={`${styles['form-label']} ${styles.required}`}>Confirm Password</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                className={styles['form-input']}
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                placeholder="Confirm your password"
                                required />
                        </div>
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

                        {/* Removed Hospital Staff and Admin sign up options as per user request */}
                        {/* <div className="role-option">
                            <input
                                type="radio"
                                name="role"
                                value="hospital_staff"
                                id="hospital_staff"
                                onChange={handleInputChange}
                                required />
                            <label htmlFor="hospital_staff" className="role-card">
                                <div className="role-icon">🏥</div>
                                <div className="role-title">Hospital Staff</div>
                                <div className="role-description">Manage hospital blood donations and appointments</div>
                            </label>
                        </div>

                        <div className="role-option">
                            <input
                                type="radio"
                                name="role"
                                value="admin"
                                id="admin"
                                onChange={handleInputChange}
                                required />
                            <label htmlFor="admin" className="role-card">
                                <div className="role-icon">⚙️</div>
                                <div className="role-title">Administrator</div>
                                <div className="role-description">Manage the blood donation system</div>
                            </label>
                        </div> */}
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

                {/* Hospital Staff-Specific Fields - Removed as per user request */}
                {/* {formData.role === 'hospital_staff' && (
                    <div className="form-section conditional-section show">
                        <h2 className="section-title">
                            <span className="section-icon">🏥</span>
                            Hospital Staff Information
                        </h2>

                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label required">Hospital</label>
                                <select
                                    name="hospitalId"
                                    className="form-select"
                                    value={formData.hospitalId}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select Hospital</option>
                                    <option value="hospital1">City General Hospital</option>
                                    <option value="hospital2">Metro Medical Center</option>
                                    <option value="hospital3">Regional Health Clinic</option>
                                    <option value="hospital4">Community Care Hospital</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label required">Staff Role</label>
                                <select
                                    name="staffRole"
                                    className="form-select"
                                    value={formData.staffRole}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select Role</option>
                                    <option value="nurse">Nurse</option>
                                    <option value="technician">Lab Technician</option>
                                    <option value="supervisor">Supervisor</option>
                                    <option value="coordinator">Donation Coordinator</option>
                                    <option value="administrator">Hospital Administrator</option>
                                </select>
                            </div>

                            <div className="form-group full-width">
                                <div className="info-box">
                                    <h4>Staff Responsibilities:</h4>
                                    <ul>
                                        <li>Manage blood donation appointments</li>
                                        <li>Verify donor eligibility and conduct screenings</li>
                                        <li>Monitor blood inventory levels</li>
                                        <li>Process and store blood donations</li>
                                        <li>Handle emergency blood requests</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )} */}

                <button type="button" className={styles['submit-button']} onClick={handleSubmit}>
                    Create Account
                </button>

                {/* Google Sign Up Button */}
                <div className={styles['google-signup-section']}>
                    <div className={styles['divider']}>
                        <span>or</span>
                    </div>

                    <button
                        type="button"
                        className={styles['google-signup-btn']}
                        onClick={() => googleLogin()}
                    >
                        <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" className={styles['google-icon']} />
                        Continue with Google
                    </button>
                </div>

                <div className={styles['login-link']}>
                    Already have an account? <Link to="/login">Log In</Link>
                </div>
            </div>
        </div></>
  );
};

export default LifeShareSignup;
