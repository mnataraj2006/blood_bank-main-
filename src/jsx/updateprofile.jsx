
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from '../css/updateprofile.module.css';
import DashboardHeader from '../jsx/recipentheader.jsx';

const UpdateProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    emergencyContact: '',
    emergencyPhone: '',
    profileImage: ''
  });
  const [donationCount, setDonationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('recipient'); // default

  useEffect(() => {
    const fetchProfile = async () => {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (!storedUser) {
        navigate('/login');
        return;
      }

      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL || 'https://blood-bank-backend.onrender.com'}/user/${storedUser.id}`);
        setProfile(response.data);
        setUserRole(response.data.role || 'recipient');
        setLoading(false);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setLoading(false);
      }

      // Fetch donation count
      try {
        const countResponse = await axios.get(`${process.env.REACT_APP_API_URL || 'https://blood-bank-backend.onrender.com'}/donations/count/${storedUser.id}`);
        setDonationCount(countResponse.data.count);
      } catch (error) {
        console.error('Error fetching donation count:', error);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfile(prev => ({...prev, profileImage: e.target.result}));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    // Validate required fields
    const requiredFields = ['fullName', 'email', 'phoneNumber', 'dateOfBirth', 'gender', 'bloodGroup', 'street', 'city', 'state', 'pincode', 'emergencyContact', 'emergencyPhone'];
    const isValid = requiredFields.every(field => profile[field]);

    if (!isValid) {
      alert('Please fill in all required fields.');
      return;
    }

    try {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      await axios.patch(`${process.env.REACT_APP_API_URL || 'https://blood-bank-backend.onrender.com'}/user/${storedUser.id}`, profile);
      alert('Profile updated successfully!');
      navigate('/dashboard'); // or wherever
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile.');
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      navigate(-1);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const displayName = profile.fullName || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className={styles['profile-container']}>
      <DashboardHeader
        userRole={userRole}
        onNavigate={(path) => navigate(path)}
        activeTab=""
        displayName={profile.fullName}
        displayBloodGroup={profile.bloodGroup}
      />

      {/* Main Content */}
      <main className={styles['profile-main']}>
        <div className={styles['profile-banner']}>
          <h1>Profile Settings</h1>
          <p>Update your personal information and preferences</p>
        </div>

        <div className={styles['profile-content']}>
          <div className={styles['profile-sidebar']}>
            <div className={styles['profile-image-section']}>
              <div className={styles['profile-image-wrapper']}>
                <div className={styles['profile-image-placeholder']}>
                  {profile.profileImage ? <img src={profile.profileImage} alt="Profile" className={styles['profile-image']} /> : <span>{initial}</span>}
                </div>
              </div>
              <label htmlFor="image-upload" className={styles['upload-btn']}>
                Change Photo
              </label>
              <input type="file" id="image-upload" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
            </div>

            <div className={styles['profile-stats']}>
              <div className={styles['stat-item']}>
                <span className={styles['stat-value']}>{donationCount}</span>
                <span className={styles['stat-label']}>Total Donations</span>
              </div>
              <div className={styles['stat-item']}>
                <span className={styles['stat-value']}>{donationCount * 3}</span>
                <span className={styles['stat-label']}>Lives Impacted</span>
              </div>
              <div className={styles['stat-item']}>
                <div className={styles['blood-type-badge']}>{profile.bloodGroup || 'N/A'}</div>
                <span className={styles['stat-label']}>Blood Type</span>
              </div>
            </div>
          </div>

          <div className={styles['profile-form-section']}>
            <div className={styles['profile-form']}>
              <section className={styles['form-section']}>
                <h2 className={styles['section-title']}>Personal Information</h2>

                <div className={styles['form-row']}>
                  <div className={styles['form-group']}>
                    <label htmlFor="fullName">Full Name *</label>
                    <input type="text" id="fullName" name="fullName" value={profile.fullName} onChange={handleInputChange} required />
                  </div>

                  <div className={styles['form-group']}>
                    <label htmlFor="email">Email Address *</label>
                    <input type="email" id="email" name="email" value={profile.email} onChange={handleInputChange} required />
                  </div>
                </div>

                <div className={styles['form-row']}>
                  <div className={styles['form-group']}>
                    <label htmlFor="phoneNumber">Phone Number *</label>
                    <input type="tel" id="phoneNumber" name="phoneNumber" value={profile.phoneNumber} onChange={handleInputChange} required />
                  </div>

                  <div className={styles['form-group']}>
                    <label htmlFor="dateOfBirth">Date of Birth *</label>
                    <input type="date" id="dateOfBirth" name="dateOfBirth" value={profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : ''} onChange={handleInputChange} required />
                  </div>
                </div>

                <div className={styles['form-row']}>
                  <div className={styles['form-group']}>
                    <label htmlFor="gender">Gender *</label>
                    <select id="gender" name="gender" value={profile.gender} onChange={handleInputChange} required>
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                  </div>

                  <div className={styles['form-group']}>
                    <label htmlFor="bloodGroup">Blood Type *</label>
                    <select id="bloodGroup" name="bloodGroup" value={profile.bloodGroup} onChange={handleInputChange} required>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>
              </section>

              <section className={styles['form-section']}>
                <h2 className={styles['section-title']}>Address Information</h2>

                <div className={styles['form-group']}>
                  <label htmlFor="street">Street Address *</label>
                  <input type="text" id="street" name="street" value={profile.street} onChange={handleInputChange} required />
                </div>

                <div className={styles['form-row']}>
                  <div className={styles['form-group']}>
                    <label htmlFor="city">City *</label>
                    <input type="text" id="city" name="city" value={profile.city} onChange={handleInputChange} required />
                  </div>

                  <div className={styles['form-group']}>
                    <label htmlFor="state">State *</label>
                    <input type="text" id="state" name="state" value={profile.state} onChange={handleInputChange} required />
                  </div>

                  <div className={styles['form-group']}>
                    <label htmlFor="pincode">ZIP Code *</label>
                    <input type="text" id="pincode" name="pincode" value={profile.pincode} onChange={handleInputChange} required />
                  </div>
                </div>
              </section>

              <section className={styles['form-section']}>
                <h2 className={styles['section-title']}>Emergency Contact</h2>

                <div className={styles['form-row']}>
                  <div className={styles['form-group']}>
                    <label htmlFor="emergencyContact">Contact Name *</label>
                    <input type="text" id="emergencyContact" name="emergencyContact" value={profile.emergencyContact} onChange={handleInputChange} required />
                  </div>

                  <div className={styles['form-group']}>
                    <label htmlFor="emergencyPhone">Contact Phone *</label>
                    <input type="tel" id="emergencyPhone" name="emergencyPhone" value={profile.emergencyPhone} onChange={handleInputChange} required />
                  </div>
                </div>
              </section>

              <div className={styles['form-actions']}>
                <button type="button" className={styles['btn-cancel']} onClick={handleCancel}>Cancel</button>
                <button type="button" className={styles['btn-save']} onClick={handleSave}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UpdateProfile;
