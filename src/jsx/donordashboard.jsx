import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardHeader from "./recipentheader";
import { Calendar, Clock, User, Droplet, AlertCircle, ChevronRight, MapPin, Check } from 'lucide-react';
import styles from '../css/donordashboard.module.css';
const DonorDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Handlers to switch tabs
  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  const [donorProfile, setDonorProfile] = useState(null);
  const [donationCount, setDonationCount] = useState(0);
  const [donationHistory, setDonationHistory] = useState([]);
  const [bloodRequests, setBloodRequests] = useState([]);
  const [allBloodRequests, setAllBloodRequests] = useState([]);
  const [responding, setResponding] = useState(null);
  const [appointments, setAppointments] = useState([]);

  const displayName = JSON.parse(localStorage.getItem("user"))?.name || "User";
  const displayBloodGroup = JSON.parse(localStorage.getItem("user"))?.bloodGroup || "Not specified";

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser || !storedUser.id) {
      window.location.href = "/login";
      return;
    }
    setDonorProfile(storedUser);
    const userId = storedUser.id;

    // Set last donation and next eligible from user's lastDonationDate
    if (storedUser.lastDonationDate) {
      const lastDonation = new Date(storedUser.lastDonationDate);
      const nextEligible = new Date(lastDonation);
      nextEligible.setMonth(nextEligible.getMonth() + 3); // add 3 months

      setDonorProfile(prev => ({
        ...prev,
        lastDonation: lastDonation,
        nextEligibleDate: nextEligible
      }));
    }

    // Fetch donation count
    axios.get(`http://localhost:5000/donations/count/${userId}`)
      .then(res => setDonationCount(res.data.count))
      .catch(() => {});

    // Fetch donation history
    axios.get(`http://localhost:5000/donations/history/${userId}`)
      .then(res => setDonationHistory(res.data))
      .catch(() => {});

    // Fetch blood requests matching donor's blood group
    axios.get(`http://localhost:5000/requests/donor/${userId}`)
      .then(res => setBloodRequests(res.data))
      .catch(() => {});

    // Fetch all pending blood requests
    axios.get(`http://localhost:5000/requests/all/pending`)
      .then(res => setAllBloodRequests(res.data))
      .catch(() => {});

    // Fetch real appointments for the user
    axios.get(`http://localhost:5000/appointments/${userId}`)
      .then(res => setAppointments(res.data))
      .catch(() => {});

  }, []);

  const handleAccept = async (requestId) => {
    if (!donorProfile || !donorProfile.id) {
      alert("User not logged in");
      return;
    }
    setResponding(requestId);
    try {
      const response = await axios.patch(`http://localhost:5000/requests/${requestId}/accept`, {
        donorId: donorProfile.id
      });
      alert(response.data.message);
      // Refresh the blood requests list
      axios.get(`http://localhost:5000/requests/donor/${donorProfile.id}`)
        .then(res => setBloodRequests(res.data))
        .catch(() => {});
    } catch (error) {
      alert("Failed to accept request: " + (error.response?.data?.message || "Unknown error"));
    } finally {
      setResponding(null);
    }
  };



  const handleProfileClick = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const handleMenuItemClick = (item) => {
    setIsProfileOpen(false);

    switch(item) {
      case 'Profile':
        break;
      case 'Settings':
        break;
      case 'About':
        break;
      case 'Logout':
        localStorage.removeItem("user");
        window.location.href = "/login";
        break;
      default:
        break;
    }
  };

  if (!donorProfile) {
    return <p>Loading...</p>;
  }

  const isEligible = new Date(donorProfile.nextEligibleDate) <= new Date();

  return (
    <div className={styles['dashboard-container']}>
      <DashboardHeader
        onNavigate={navigate}
        displayName={displayName}
        displayBloodGroup={displayBloodGroup}
        userRole="donor"
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Welcome Section */}
      <div className={styles['welcome-section']}>
        <h1>Welcome back, {donorProfile.name}!</h1>
        <p>Thank you for being a hero. Your donations have helped save {donorProfile.livesImpacted} lives.</p>
      </div>

      {/* Main Dashboard Content */}
      <div className={styles['dashboard-content']}>
        {activeTab === 'overview' && <>
        <div className={styles['profile-card']}>
          <div className={styles['profile-header']}>
            <div className={styles['profile-avatar']}>
              <User size={40} />
            </div>
            <div className={styles['profile-info']}>
              <h2>{donorProfile.name}</h2>
              <div className={styles['blood-type']}>
                <Droplet size={16} />
                <span>Blood Type: {donorProfile.bloodGroup}</span>
              </div>
            </div>
          </div>

          <div className={styles['profile-stats']}>
            <div className={styles['stat-item']}>
              <span className={styles['stat-value']}>{donationCount}</span>
              <span className={styles['stat-label']}>Total Donations</span>
            </div>
            <div className={styles['stat-item']}>
              <span className={styles['stat-value']}>{donationCount*3}</span>
              <span className={styles['stat-label']}>Lives Impacted</span>
            </div>
            <div className={styles['stat-item']}>
              <span className={styles['stat-value']}>
                {donorProfile.lastDonation ? new Date(donorProfile.lastDonation).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "N/A"}
              </span>
              <span className={styles['stat-label']}>Last Donation</span>
            </div>
          </div>

          <div className={styles['eligibility-status']}>
            {isEligible ? (
              <div className={styles.eligible}>
                <Check size={20} />
                <span>You're eligible to donate!</span>
              </div>
            ) : (
              <div className={styles['not-eligible']}>
                <Clock size={20} />
                <span>
                  Next eligible date:{" "}
                  {donorProfile.nextEligibleDate
                    ? new Date(donorProfile.nextEligibleDate).toLocaleDateString()
                    : "Not available"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className={styles['quick-actions']}>
          <h3>Quick Actions</h3>
          <div className={styles['action-buttons']}>
            <button className={`${styles['action-btn']} ${styles.primary}`} onClick={() => navigate('/book-donation-slot')}>
              <Calendar size={20} />
              Book Donation Slot
            </button>
            <button className={`${styles['action-btn']} ${styles.secondary}`} onClick={()=> navigate('/update-profile')}>
              <User size={20} />
              Update Profile
            </button>
            <button className={`${styles['action-btn']} ${styles.secondary}`} onClick={() => setActiveTab('requests')}>
              <AlertCircle size={20} />
              View Blood Requests
            </button>
          </div>
        </div>

        {/* Urgent Requests */}
        {bloodRequests.length > 0 && (
          <div className={styles['urgent-requests']}>
            <div className={styles['section-header']}>
              <h3>
                <AlertCircle size={20} />
                Urgent Blood Requests Matching Your Type
              </h3>
            </div>
            <div className={styles['request-list']}>
              {bloodRequests.map(request => (
                <div key={request._id} className={styles['request-card']}>
                  <div className={styles['request-info']}>
                    <div className={styles['request-header']}>
                      <span className={styles['blood-type-badge']}>{request.requestedGroup}</span>
                      <span className={`${styles['urgency-badge']} ${styles[request.urgencyLevel.toLowerCase()]}`}>
                        {request.urgencyLevel}
                      </span>
                    </div>
                    <div className={styles['hospital-name']}>{request.hospitalName}</div>
                    <div className={styles.distance}>
                      <MapPin size={14} />
                      {/* Distance calculation can be added later */}
                      <span>Distance info not available</span>
                    </div>
                  </div>
                  <button
                    className={styles['respond-btn']}
                    disabled={responding === request._id}
                    onClick={() => handleAccept(request._id)}
                  >
                    {responding === request._id ? "Accepting..." : "Accept"}
                    <ChevronRight size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}</>}

        {/* Tabs Section */}
        <div className={styles['tabs-section']} style={activeTab !== 'overview' ? {marginTop: '2rem'} : {}}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
              onClick={() => handleTabClick('overview')}
            >
              Overview
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
              onClick={() => handleTabClick('history')}
            >
              Donation History
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'appointments' ? styles.active : ''}`}
              onClick={() => handleTabClick('appointments')}
            >
              Appointments
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'requests' ? styles.active : ''}`}
              onClick={() => handleTabClick('requests')}
            >
              Blood Requests
            </button>
          </div>

          <div className={styles['tab-content']}>
            {activeTab === 'overview' && (
              <div className={styles['overview-content']}>
                <div className={styles['milestone-card']}>
                  <h4>Next Milestone</h4>
                  <div className={styles['milestone-progress']}>
                    <div className={styles['progress-bar']}>
                      <div className={styles['progress-fill']} style={{ width: '80%' }}></div>
                    </div>
                    <p>2 more donations to reach 10 donations milestone!</p>
                  </div>
                </div>
                <div className={styles['impact-card']}>
                  <h4>Your Impact</h4>
                  <p>Your donations have potentially helped:</p>
                  <ul className={styles['impact-list']}>
                    <li>8 emergency surgeries</li>
                    <li>12 cancer treatments</li>
                    <li>4 accident victims</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div id='history' className={styles['history-content']}>
                <div className={styles['history-list']}>
                  {donationHistory.length > 0 ? (
                    donationHistory.map(donation => (
                      <div key={donation._id} className={styles['history-item']}>
                        <div className={styles['history-date']}>
                          <Calendar size={16} />
                          <span>{new Date(donation.donationDate).toLocaleDateString()}</span>
                        </div>
                        <div className={styles['history-details']}>
                          <div className={styles['history-location']}>{donation.hospitalName}</div>
                          <div className={styles['history-type']}>{donation.bloodGroup}</div>
                        </div>
                        <div className={styles['history-status']}>
                          <Check size={16} />
                          <span>Completed</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No donation history available.</p>
                  )}
                </div>
              </div>
            )}

{activeTab === 'appointments' && (
  <div id='appointments' className={styles['appointments-content']}>
    {appointments.length > 0 ? (
      <div className={styles['appointment-list']}>
        {appointments.map(appointment => (
          <div key={appointment._id} className={styles['appointment-card']}>
            <div className={styles['appointment-date']}>
              <Calendar size={20} />
              <div>
                <div className={styles.date}>{new Date(appointment.appointmentDate).toLocaleDateString()}</div>
                <div className={styles.time}>{new Date(appointment.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
            <div className={styles['appointment-details']}>
              <div className={styles.location}>
                <MapPin size={16} />
                <span>{appointment.hospitalName}</span>
              </div>
              <div className={styles.type}>Type: {appointment.type || 'N/A'}</div>
            </div>
            <div className={styles['appointment-actions']}>
              {appointment.confirmed ? (
                <span className={styles['completed-status']}>Completed</span>
              ) : (
                <button className={styles['btn-danger']}>Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p>No upcoming appointments.</p>
    )}
  </div>
)}

            {activeTab === 'requests' && (
              <div className={styles['requests-content']}>
                {allBloodRequests.length > 0 ? (
                  <div className={styles['request-list']}>
                    {allBloodRequests.map(request => (
                      <div key={request._id} className={styles['request-card']}>
                        <div className={styles['request-info']}>
                          <div className={styles['request-header']}>
                            <span className={styles['blood-type-badge']}>{request.requestedGroup}</span>
                            <span className={`${styles['urgency-badge']} ${styles[request.urgencyLevel.toLowerCase()]}`}>
                              {request.urgencyLevel}
                            </span>
                          </div>
                          <div className={styles['hospital-name']}>{request.hospitalName}</div>
                          <div className={styles.distance}>
                            <MapPin size={14} />
                            <span>Distance info not available</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No blood requests available.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>


    </div>
  );
};

export default DonorDashboard;
