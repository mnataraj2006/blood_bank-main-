import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from '../css/recipientdashboard.module.css';
import DashboardHeader from "./recipentheader";
import { 
  Calendar, 
  Clock, 
  Bell, 
  User, 
  Droplet, 
  AlertCircle, 
  ChevronRight, 
  Activity, 
  MapPin, 
  Check, 
  X, 
  Settings, 
  Info, 
  ChevronDown,
  Heart,
  Users,
  Phone,
  Mail,
  FileText,
  Plus,
  Search,
  Filter,
  Zap,
  LogOut
} from 'lucide-react';

const RecipientDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('requests');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [recipientProfile, setRecipientProfile] = useState(null);
  const [activeRequests, setActiveRequests] = useState([]);
  const [requestHistory, setRequestHistory] = useState([]);
  const [donorResponses, setDonorResponses] = useState([]);
  const [processingResponse, setProcessingResponse] = useState(null);

  const displayName = recipientProfile?.full_name || recipientProfile?.name || "User";
  const displayBloodGroup = recipientProfile?.required_blood_group || 
                         recipientProfile?.bloodGroup || 
                         recipientProfile?.blood_group || 
                         "Not specified";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
  const storedUser = JSON.parse(localStorage.getItem("user"));
  console.log("useEffect running, storedUser:", storedUser); // Added log to confirm useEffect runs
  if (!storedUser || !storedUser.id || storedUser.role.toLowerCase() !== "recipient") {
    console.error("❌ Recipient not found in localStorage");
    return;
  }

  const userId = storedUser.id;

  // Fetch recipient profile
  axios.get(`http://localhost:5000/api/recipients/${userId}`)
    .then((res) => setRecipientProfile(res.data))
    .catch((err) => console.error("❌ Error fetching profile:", err));

  // Fetch all requests once
  axios.get(`http://localhost:5000/requests/${userId}`)
    .then((res) => {
      const allRequests = res.data;
      console.log("Fetched requests:", allRequests); // Added debug log
      // Filter active requests (status pending or active)
      const active = allRequests.filter(req => req.status === 'pending' || req.status === 'active');
      setActiveRequests(active);
      // Filter request history (status completed or cancelled)
      const history = allRequests.filter(req => req.status === 'completed' || req.status === 'cancelled');
      setRequestHistory(history);
    })
    .catch((err) => {
      console.error("❌ Error fetching requests:", err);
      setActiveRequests([]);
      setRequestHistory([]);
    });

  // Fetch donor responses
  axios.get(`http://localhost:5000/responses/${userId}`)
    .then((res) => setDonorResponses(res.data))
    .catch((err) => console.error("❌ Error fetching donor responses:", err));
}, []);





  const handleProfileClick = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const handleMenuItemClick = (item) => {
    console.log(`${item} clicked`);
    setIsProfileOpen(false);
    
    // Add your navigation logic here
    switch(item) {
      case 'Profile':
        // Navigate to profile page

        break;
      case 'History':   // 👈 add this case
        setActiveTab('history'); 
      break;
      case 'Settings':
        // Navigate to settings page
        break;
      case 'About':
        // Navigate to about page
        break;
      case 'Logout':
        localStorage.removeItem("user");
        window.location.href = "/login"; 
        break;
      default:
        break;
    }
  };

  // Removed emergency request handler and button as per user request
  // const handleEmergencyRequest = () => {
  //   console.log("Emergency request initiated");
  // };

  const handleNewRequest = () => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser && storedUser.id) {
      navigate('/blood-request-form', { state: { recipientId: storedUser.id } });
    }
  };

  const handleAcceptResponse = async (responseId) => {
    setProcessingResponse(responseId);
    try {
      const response = await axios.patch(`http://localhost:5000/responses/${responseId}`, {
        responseStatus: 'accepted'
      });
      if (response.data && response.data.message) {
        alert(response.data.message);
      } else {
        alert("Response accepted successfully");
      }
      // Refresh responses
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (storedUser && storedUser.id) {
        const res = await axios.get(`http://localhost:5000/responses/${storedUser.id}`);
        setDonorResponses(res.data);
      }
    } catch (error) {
      console.error("Error accepting response", error);
      alert("Failed to accept response");
    } finally {
      setProcessingResponse(null);
    }
  };

  const handleDeclineResponse = async (responseId) => {
    setProcessingResponse(responseId);
    try {
      const response = await axios.patch(`http://localhost:5000/responses/${responseId}`, {
        responseStatus: 'declined'
      });
      alert(response.data.message);
      // Refresh responses
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (storedUser && storedUser.id) {
        const res = await axios.get(`http://localhost:5000/responses/${storedUser.id}`);
        setDonorResponses(res.data);
      }
    } catch (error) {
      console.error("Error declining response", error);
      alert("Failed to decline response");
    } finally {
      setProcessingResponse(null);
    }
  };

  if (!recipientProfile) {
    return <div className={styles['dashboard-container']}><p>Loading...</p></div>;
  }

  // Calculate statistics
  const totalRequests = activeRequests.length + requestHistory.length;
  const fulfilledRequests = requestHistory.filter(req => req.status === 'fulfilled').length;
  const pendingRequests = activeRequests.filter(req => req.status === 'pending').length;
  const totalUnitsReceived = requestHistory.reduce((sum, req) => sum + req.unitsReceived, 0);

  const getUrgencyColor = (urgency) => {
    switch(urgency) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'moderate': return 'moderate';
      default: return 'moderate';
    }
  };

  return (
    <div className={styles['dashboard-container']}>
      <DashboardHeader
        displayName={displayName}
        displayBloodGroup={displayBloodGroup}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole="recipient"
        onNavigate={(path) => {
          if (path === '/recipient-dashboard') {
            setActiveTab('requests');
          } else {
            navigate(path);
          }
        }}
      />

      {/* Welcome Section */}
      <div className={styles['welcome-section']}>
        <h1>Welcome, {displayName}!</h1>
        <p>We're here to help you find the blood support you need. Stay strong!</p>
      </div>

      {/* Main Dashboard Content */}
      <div className={styles['dashboard-content']}>
        {/* Profile Card */}
        <div className={styles['profile-card']}>
          <div className={styles['profile-header']}>
            <div className={styles['profile-avatar']}>
              <Heart size={24} />
            </div>
          <div className={styles['profile-info']}>
              <h2>{displayName}</h2>
              <span className={styles['blood-type']}>
                <Droplet size={16} />
                {displayBloodGroup}
                <span className={`${styles['urgency-badge']} ${styles[getUrgencyColor(recipientProfile.urgencyLevel)]}`}>
                  {recipientProfile?.urgencyLevel ?
                    recipientProfile.urgencyLevel.charAt(0).toUpperCase() + recipientProfile.urgencyLevel.slice(1) :
                    "Not specified"
                  }
                </span>
              </span>
            </div>
          </div>

          {/* Removed old urgency-status alert box */}
          {/* <div className={`urgency-status ${getUrgencyColor(recipientProfile.urgencyLevel)}`}>
            <AlertCircle size={20} />
            <span>Urgency Level: {
              recipientProfile?.urgencyLevel ?
                recipientProfile.urgencyLevel.charAt(0).toUpperCase() + recipientProfile.urgencyLevel.slice(1) :
                "Not specified"
            }</span>
          </div> */}

          <div className={styles['request-status-section']} style={{ gap: '2rem' }}>
            <div className={styles['status-card']} style={{ padding: '2rem' }}>
              <h3>
                <Activity size={20} />
                Active Requests
              </h3>
              <div className={`${styles['status-number']} ${styles.active}`}>{activeRequests.length}</div>
              <p className={styles['status-description']}>Currently seeking blood donations</p>
            </div>

            <div className={styles['status-card']} style={{ padding: '2rem' }}>
              <h3>
                <Clock size={20} />
                Pending
              </h3>
              <div className={`${styles['status-number']} ${styles.pending}`}>{pendingRequests}</div>
              <p className={styles['status-description']}>Requests awaiting donors</p>
            </div>

            <div className={styles['status-card']} style={{ padding: '2rem' }}>
              <h3>
                <Check size={20} />
                Fulfilled
              </h3>
              <div className={`${styles['status-number']} ${styles.matched}`}>{fulfilledRequests}</div>
              <p className={styles['status-description']}>Successfully received donations</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={styles['quick-actions']}>
          <h3>Quick Actions</h3>
        <div className={styles['action-buttons']}>
          {/* Removed Emergency Request button as per user request */}
          {/* <button className="action-btn emergency" onClick={handleEmergencyRequest}>
            <Zap size={20} />
            Emergency Request
          </button> */}
          <button className={`${styles['action-btn']} ${styles.primary}`} onClick={handleNewRequest}>
            <Plus size={20} />
            New Blood Request
          </button>
          <button className={`${styles['action-btn']} ${styles.secondary}`} onClick={() => navigate('/find-donor')}>
            <Search size={20} />
            Find Donors
          </button>
          <button className={`${styles['action-btn']} ${styles.secondary}`}>
            <FileText size={20} />
            Medical Records
          </button>
        </div>
        </div>

        {/* Active Requests */}
        {activeRequests.length > 0 && (
          <div className={styles['active-requests']}>
            <div className={styles['section-header']}>
              <h3>
                <Activity size={20} />
                Active Blood Requests
              </h3>
            </div>
            <div className={styles['request-list']}>
              {activeRequests.map(request => (
                <div key={request._id} className={styles['request-card']}>
                  <div className={styles['request-header']}>
                    <div className={styles['request-info']}>
                      <h4>Request #{request._id}</h4>
                      <div className={styles['request-details']}>
                        <div className={styles['detail-item']}>
                          <Calendar size={16} />
                          <span>Requested: {new Date(request.requestDate).toLocaleDateString()}</span>
                        </div>
                        <div className={styles['detail-item']}>
                          <MapPin size={16} />
                          <span>{request.hospital}</span>
                        </div>
                        <div className={styles['detail-item']}>
                          <AlertCircle size={16} />
                          <span>{request.purpose}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <span className={styles['blood-type-badge']}>{request.bloodType}</span>
                      <span className={`${styles['status-badge']} ${styles[request.urgency]}`}>{request.urgency}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        Progress: {request.unitsReceived} of {request.unitsNeeded} units
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#14b8a6' }}>
                        {Math.round((request.unitsReceived / request.unitsNeeded) * 100)}%
                      </span>
                    </div>
                    <div className={styles['progress-bar']}>
                      <div
                        className={styles['progress-fill']}
                        style={{ width: `${(request.unitsReceived / request.unitsNeeded) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {request.estimatedDate && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
                      <div className={styles['detail-item']}>
                        <Clock size={16} />
                        <span>Expected by: {new Date(request.estimatedDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs Section */}
        <div className={styles['tabs-section']}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'requests' ? styles.active : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              Current Requests
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
              onClick={() => setActiveTab('history')}
            >
              Request History
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'responses' ? styles.active : ''}`}
              onClick={() => setActiveTab('responses')}
            >
              Donor Responses
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'medical' ? styles.active : ''}`}
              onClick={() => setActiveTab('medical')}
            >
              Medical Information
            </button>
          </div>

          <div className={styles['tab-content']}>
            {activeTab === 'requests' && (
              <div className={styles['requests-content']}>
                {activeRequests.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                      Manage your active blood requests and track their progress.
                    </p>
                    {activeRequests.map(request => (
                      <div key={request._id} style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Request #{request._id}</h4>
                          <span className={`${styles['status-badge']} ${styles[request.status]}`}>{request.status}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                          <span>Blood Type: <strong>{request.requestedGroup}</strong></span>
                          <span>Units: <strong>{request.unitsNeeded}</strong></span>
                          <span>Purpose: <strong>{request.purpose}</strong></span>
                          <span>Hospital: <strong>{request.hospitalName}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles['empty-state']}>
                    <Activity size={48} />
                    <p>No active requests</p>
                    <button className={`${styles['action-btn']} ${styles.primary}`} onClick={handleNewRequest}>Create New Request</button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className={styles['history-content']}>
                {requestHistory.length > 0 ? (
                  <div>
                    <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                      Your complete blood request history and received donations.
                    </p>
                    {requestHistory.map(request => (
                      <div key={request._id} className={styles['history-item']}>
                        <div className={styles['history-date']}>
                          <Calendar size={16} />
                          <span>{new Date(request.requestDate).toLocaleDateString()}</span>
                        </div>
                        <div className={styles['history-details']}>
                          <div className={styles['history-location']}>
                            {request.requestedGroup} - {request.unitsNeeded} units requested
                          </div>
                          <div className={styles['history-type']}>
                            {request.hospitalName} • {request.status === 'completed' ? 'Completed' : 'Cancelled'} on {new Date(request.requestDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className={styles['history-status']}>
                          <Check size={16} />
                          <span>{request.status === 'completed' ? 'Completed' : 'Cancelled'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles['empty-state']}>
                    <FileText size={48} />
                    <p>No request history</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'responses' && (
              <div className={styles['responses-content']}>
                {donorResponses.length > 0 ? (
                  <div>
                    <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                      Donor responses to your blood requests. You can accept or decline each response.
                    </p>
                    {donorResponses.map(response => (
                      <div key={response._id} className={styles['response-card']} style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Response #{response._id.slice(-6)}</h4>
                            <p style={{ margin: '0.25rem 0' }}>
                              Donor: <strong>{response.donorId?.fullName || 'Unknown'}</strong>
                            </p>
                            <p style={{ margin: '0.25rem 0' }}>
                              Blood Type: <strong>{response.donorId?.bloodGroup || 'Unknown'}</strong>
                            </p>
                            <p style={{ margin: '0.25rem 0' }}>
                              Units Requested: <strong>{response.requestId?.unitsNeeded || 'Unknown'}</strong>
                            </p>
                            <p style={{ margin: '0.25rem 0' }}>
                              Status: <strong>{response.responseStatus}</strong>
                            </p>
                            <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
                              Responded on: {new Date(response.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {response.responseStatus === 'pending' && (
                              <>
                                <button
                                  disabled={processingResponse === response._id}
                                  onClick={() => handleAcceptResponse(response._id)}
                                  className={`${styles['action-btn']} ${styles.primary}`}
                                >
                                  {processingResponse === response._id ? 'Processing...' : 'Accept'}
                                </button>
                                <button
                                  disabled={processingResponse === response._id}
                                  onClick={() => handleDeclineResponse(response._id)}
                                  className={`${styles['action-btn']} ${styles.secondary}`}
                                >
                                  {processingResponse === response._id ? 'Processing...' : 'Decline'}
                                </button>
                              </>
                            )}
                            {response.responseStatus === 'accepted' && (
                              <span className={`${styles['status-badge']} ${styles.accepted}`}>Accepted</span>
                            )}
                            {response.responseStatus === 'declined' && (
                              <span className={`${styles['status-badge']} ${styles.declined}`}>Declined</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles['empty-state']}>
                    <Users size={48} />
                    <p>No donor responses yet</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'medical' && (
              <div className={styles['medical-info']}>
                <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                  Your medical information helps us find the right donors and ensure safe transfusions.
                </p>
                <div className={styles['medical-grid']}>
                  <div className={styles['medical-item']}>
                    <span className={styles['medical-label']}>Blood Type Needed</span>
                    <span className={styles['medical-value']}>{recipientProfile.bloodGroup}</span>
                  </div>
                  <div className={styles['medical-item']}>
                    <span className={styles['medical-label']}>Medical Condition</span>
                    <span className={styles['medical-value']}>{recipientProfile.condition}</span>
                  </div>
                  <div className={styles['medical-item']}>
                    <span className={styles['medical-label']}>Primary Hospital</span>
                    <span className={styles['medical-value']}>{recipientProfile.hospital}</span>
                  </div>
                  <div className={styles['medical-item']}>
                    <span className={styles['medical-label']}>Contact Number</span>
                    <span className={styles['medical-value']}>{recipientProfile.contactNumber}</span>
                  </div>
                  <div className={styles['medical-item']}>
                    <span className={styles['medical-label']}>Email Address</span>
                    <span className={styles['medical-value']}>{recipientProfile.email}</span>
                  </div>
                  <div className={styles['medical-item']}>
                    <span className={styles['medical-label']}>Total Units Received</span>
                    <span className={styles['medical-value']}>{totalUnitsReceived} units</span>
                  </div>
                </div>

                <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '0.5rem', border: '1px solid #bbf7d0' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#166534', fontSize: '1rem' }}>Medical Notes</h4>
                  <p style={{ margin: 0, color: '#166534', fontSize: '0.875rem' }}>
                    Regular blood transfusions required for {recipientProfile.condition}.
                    Compatible with {recipientProfile.bloodGroup} and O- blood types.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipientDashboard;
