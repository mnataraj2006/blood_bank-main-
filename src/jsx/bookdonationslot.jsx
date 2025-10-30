import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardHeader from './recipentheader';
import styles from '../css/bookdonationslot.module.css';

const BookDonationSlot = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState('');
  const [bloodRequests, setBloodRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState('');
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    donorName: '',
    email: '',
    phone: '',
    address: '',
    specialInstructions: ''
  });

  useEffect(() => {
    // Load user from localStorage
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser && storedUser.id) {
      setUser(storedUser);
      // Prefill form with user data
      setFormData(prev => ({
        ...prev,
        donorName: storedUser.name || '',
        email: storedUser.email || '',
        phone: storedUser.phoneNumber || '' // Assuming phoneNumber might be in storedUser
      }));
      // Fetch blood requests for this donor
      axios.get(`${process.env.REACT_APP_API_URL || 'https://blood-bank-backend.onrender.com'}/requests/donor/${storedUser.id}`)
        .then(res => setBloodRequests(res.data))
        .catch(err => console.error('Error fetching blood requests:', err));
    } else {
      alert('Please log in to book an appointment');
      navigate('/login');
    }

    // Fetch verified hospitals for donor to select
    axios.get(`${process.env.REACT_APP_API_URL || 'https://blood-bank-backend.onrender.com'}/hospitals/verified`)
      .then(res => {
        setHospitals(res.data);
        if (res.data.length > 0) {
          setSelectedHospital(res.data[0]._id);
        }
      })
      .catch(err => {
        console.error('Error fetching hospitals:', err);
      });
  }, [navigate]);

  const timeSlots = [
    { time: '9:00 AM', available: true },
    { time: '10:00 AM', available: true },
    { time: '11:00 AM', available: true },
    { time: '2:00 PM', available: true },
    { time: '3:00 PM', available: true },
    { time: '4:00 PM', available: true },
    { time: '5:00 PM', available: true }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRequestChange = (e) => {
    setSelectedRequest(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !selectedHospital || !selectedDate || !selectedTime) {
      alert('Please fill all required fields');
      return;
    }

    const appointmentData = {
      donorId: user.id,
      hospitalId: selectedHospital,
      appointmentDate: selectedDate,
      appointmentTime: selectedTime,
      requestId: selectedRequest || null
    };

    try {
      const token = user.token; // Assuming token is in localStorage user
      const response = await axios.post(`${process.env.REACT_APP_API_URL || 'https://blood-bank-backend.onrender.com'}/appointments/book`, appointmentData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Blood donation slot booked successfully!');
      navigate('/dashboard'); // Redirect to donor dashboard
    } catch (error) {
      console.error('Error booking donation slot:', error);
      alert('Failed to book donation slot. Please try again.');
    }
  };

  const isFormValid = () => {
    return selectedDate && selectedTime && selectedHospital;
  };

  return (
    <div className={styles['book-donation-container']}>
      <DashboardHeader userRole="donor" onNavigate={navigate} activeTab="" />
      <main className={styles['main-content']}>
        <div className={styles.breadcrumb}>
          <a href="#home">Home</a> / <a href="#appointments">Appointments</a> / Book Donation Slot
        </div>

        <div className={styles['page-header']}>
          <h1 className={styles['page-title']}>🩸 Book Blood Donation Slot</h1>
          <p className={styles['page-subtitle']}>Schedule a convenient time for blood donation at a verified hospital</p>
        </div>

        <div className={`${styles.alert} ${styles['alert-info']}`}>
          <span>ℹ️</span>
          <span>We accept donations Monday through Friday between 9 AM - 5 PM. Please bring valid ID and be well-rested.</span>
        </div>

        {/* Booking Form */}
        <form className={styles['booking-form']} onSubmit={handleSubmit}>
          {/* Hospital Selection */}
          <div className={styles['form-section']}>
            <h2 className={styles['section-title']}>
              <span className={styles['section-icon']}>🏥</span>
              Select Hospital
            </h2>

            <div className={styles['form-row']}>
              <div className={`${styles['form-group']} ${styles['full-width']}`}>
                <label className={styles['form-label']}>Choose a Verified Hospital *</label>
                <select
                  value={selectedHospital}
                  onChange={(e) => setSelectedHospital(e.target.value)}
                  className={styles['form-select']}
                  required
                >
                  {hospitals.length === 0 ? (
                    <option value="" disabled>No verified hospitals available</option>
                  ) : (
                    hospitals.map(hospital => (
                      <option key={hospital._id} value={hospital._id}>
                        {hospital.name} - {hospital.city}, {hospital.state}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Optional Blood Request Linking */}
          {bloodRequests.length > 0 && (
            <div className={styles['form-section']}>
              <h2 className={styles['section-title']}>
                <span className={styles['section-icon']}>💉</span>
                Link to Blood Request (Optional)
              </h2>
              <div className={styles['form-row']}>
                <div className={`${styles['form-group']} ${styles['full-width']}`}>
                  <label className={styles['form-label']}>Select a Matching Blood Request</label>
                  <select
                    value={selectedRequest}
                    onChange={handleRequestChange}
                    className={styles['form-select']}
                  >
                    <option value="">General Donation (No specific request)</option>
                    {bloodRequests.map(request => (
                      <option key={request._id} value={request._id}>
                        {request.patientName} - {request.hospitalName} ({request.urgencyLevel})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Personal Information */}
          <div className={styles['form-section']}>
            <h2 className={styles['section-title']}>
              <span className={styles['section-icon']}>👤</span>
              Personal Information (Prefilled)
            </h2>

            <div className={styles['form-row']}>
              <div className={styles['form-group']}>
                <label className={styles['form-label']}>Full Name</label>
                <input
                  type="text"
                  name="donorName"
                  className={styles['form-input']}
                  value={formData.donorName}
                  readOnly
                />
              </div>

              <div className={styles['form-group']}>
                <label className={styles['form-label']}>Email Address</label>
                <input
                  type="email"
                  name="email"
                  className={styles['form-input']}
                  value={formData.email}
                  readOnly
                />
              </div>
            </div>

            <div className={styles['form-row']}>
              <div className={styles['form-group']}>
                <label className={styles['form-label']}>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  className={styles['form-input']}
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter or update your phone number"
                />
              </div>

              <div className={styles['form-group']}>
                <label className={styles['form-label']}>Address</label>
                <input
                  type="text"
                  name="address"
                  className={styles['form-input']}
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter your complete address"
                />
              </div>
            </div>
          </div>

          {/* Date & Time Selection */}
          <div className={styles['form-section']}>
            <h2 className={styles['section-title']}>
              <span className={styles['section-icon']}>📅</span>
              Select Date & Time
            </h2>

            <div className={styles['form-row']}>
              <div className={styles['form-group']}>
                <label className={styles['form-label']}>Preferred Date *</label>
                <input
                  type="date"
                  name="selectedDate"
                  className={styles['form-input']}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>

            <div className={styles['form-group']}>
              <label className={styles['form-label']}>Available Time Slots *</label>
              <div className={styles['time-slots']}>
                {timeSlots.map(slot => (
                  <button
                    key={slot.time}
                    type="button"
                    className={`${styles['time-slot']} ${selectedTime === slot.time ? styles.selected : ''} ${!slot.available ? styles.unavailable : ''}`}
                    onClick={() => slot.available && setSelectedTime(slot.time)}
                    disabled={!slot.available}
                  >
                    {slot.time}
                    {!slot.available && <br />}
                    {!slot.available && <small>(Unavailable)</small>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          <div className={styles['form-section']}>
            <h2 className={styles['section-title']}>
              <span className={styles['section-icon']}>📝</span>
              Additional Information
            </h2>

            <div className={styles['form-row']}>
              <div className={`${styles['form-group']} ${styles['full-width']}`}>
                <label className={styles['form-label']}>Special Instructions</label>
                <textarea
                  name="specialInstructions"
                  className={styles['form-textarea']}
                  value={formData.specialInstructions}
                  onChange={handleInputChange}
                  placeholder="Any special instructions or medical conditions we should be aware of"
                />
              </div>
            </div>
          </div>

          {/* Donation Info Card */}
          <div className={styles['book-info-card']}>
            <h3 className={styles['book-info-title']}>
              <span>🩸</span>
              What happens after booking?
            </h3>
            <ul className={styles['book-info-list']}>
              <li><span className={styles.checkmark}>✓</span> You'll receive a confirmation email with appointment details</li>
              <li><span className={styles.checkmark}>✓</span> Hospital will call you 24 hours before appointment</li>
              <li><span className={styles.checkmark}>✓</span> Bring valid ID and be well-rested for donation</li>
              <li><span className={styles.checkmark}>✓</span> You'll get a donation certificate after successful donation</li>
              <li><span className={styles.checkmark}>✓</span> Track your donation history in your dashboard</li>
            </ul>
          </div>

          {/* Submit Section */}
          <div className={styles['submit-section']}>
            <button
              type="submit"
              className={`${styles.btn} ${styles['btn-primary']}`}
              disabled={!isFormValid()}
            >
              Book Blood Donation Slot
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default BookDonationSlot;
