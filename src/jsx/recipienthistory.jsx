import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Check } from 'lucide-react';
import styles from '../css/recipientdashboard.module.css';
import DashboardHeader from "./recipentheader";

const RecipientHistory = () => {
  const navigate = useNavigate();
  const [requestHistory, setRequestHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recipientProfile, setRecipientProfile] = useState(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser || !storedUser.id || storedUser.role.toLowerCase() !== "recipient") {
      console.error("❌ Recipient not found in localStorage");
      setLoading(false);
      return;
    }

    const userId = storedUser.id;

    // Fetch recipient profile
    axios.get(`http://localhost:5000/api/recipients/${userId}`)
      .then((res) => setRecipientProfile(res.data))
      .catch((err) => console.error("❌ Error fetching profile:", err));

    // Fetch all requests
    axios.get(`http://localhost:5000/requests/${userId}`)
      .then((res) => {
        // Display all requests in history
        setRequestHistory(res.data);
      })
      .catch((err) => {
        console.error("❌ Error fetching request history:", err);
        setRequestHistory([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className={styles['dashboard-container']}><p>Loading request history...</p></div>;
  }

  const displayName = recipientProfile?.full_name || recipientProfile?.name || "User";
  const displayBloodGroup = recipientProfile?.required_blood_group ||
                         recipientProfile?.bloodGroup ||
                         recipientProfile?.blood_group ||
                         "Not specified";

  return (
    <div className={styles['dashboard-container']}>
      <DashboardHeader
        displayName={displayName}
        displayBloodGroup={displayBloodGroup}
        activeTab="history"
        setActiveTab={() => {}}
        userRole="recipient"
        onNavigate={(path) => {
          if (path === '/recipient-dashboard') {
            navigate('/recipient-dashboard');
          } else {
            navigate(path);
          }
        }}
      />

      <h2>Request History</h2>
      {requestHistory.length > 0 ? (
        <div className={styles['history-content']}>
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
          <p>No request history found.</p>
        </div>
      )}
    </div>
  );
};

export default RecipientHistory;
