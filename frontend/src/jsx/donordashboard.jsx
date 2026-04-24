import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardHeader from './recipentheader';
import {
  Calendar, Clock, User, Droplet, AlertCircle,
  ChevronRight, MapPin, Check, Heart, TrendingUp, Activity, Award
} from 'lucide-react';
import styles from '../css/donordashboard.module.css';

const API = import.meta.env.VITE_API_URL || 'https://blood-bank-backend.onrender.com';

const StatCard = ({ icon: Icon, label, value, color, bg }) => (
  <div className={styles.statCard} style={{ gap: 'var(--space-4)' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span className={styles.statCardLabel}>{label}</span>
      <div className={styles.statCardIcon} style={{ background: bg }}>
        <Icon size={20} style={{ color }} />
      </div>
    </div>
    <div className={styles.statCardValue}>{value}</div>
  </div>
);

const DonorDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [donorProfile, setDonorProfile] = useState(null);
  const [donationCount, setDonationCount] = useState(0);
  const [donationHistory, setDonationHistory] = useState([]);
  const [bloodRequests, setBloodRequests] = useState([]);
  const [allBloodRequests, setAllBloodRequests] = useState([]);
  const [responding, setResponding] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const displayName  = JSON.parse(localStorage.getItem('user'))?.name || 'User';
  const displayGroup = JSON.parse(localStorage.getItem('user'))?.bloodGroup || 'N/A';

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!storedUser?.id) { window.location.href = '/login'; return; }
    setDonorProfile(storedUser);
    const id = storedUser.id;

    if (storedUser.lastDonationDate) {
      const last = new Date(storedUser.lastDonationDate);
      const next = new Date(last); next.setMonth(next.getMonth() + 3);
      setDonorProfile(p => ({ ...p, lastDonation: last, nextEligibleDate: next }));
    }

    Promise.all([
      axios.get(`${API}/donations/count/${id}`).then(r => setDonationCount(r.data.count)).catch(() => {}),
      axios.get(`${API}/donations/history/${id}`).then(r => setDonationHistory(r.data)).catch(() => {}),
      axios.get(`${API}/requests/donor/${id}`).then(r => setBloodRequests(r.data)).catch(() => {}),
      axios.get(`${API}/requests/all/pending`).then(r => setAllBloodRequests(r.data)).catch(() => {}),
      axios.get(`${API}/appointments/${id}`).then(r => setAppointments(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const handleAccept = async (reqId) => {
    if (!donorProfile?.id) return;
    setResponding(reqId);
    try {
      const res = await axios.patch(`${API}/requests/${reqId}/accept`, { donorId: donorProfile.id });
      alert(res.data.message);
      const fresh = await axios.get(`${API}/requests/donor/${donorProfile.id}`);
      setBloodRequests(fresh.data);
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.message || 'Unknown error'));
    } finally { setResponding(null); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        <Droplet size={48} style={{ color: 'var(--primary)', marginBottom: 'var(--space-4)', animation: 'spin 1s linear infinite' }} />
        <p>Loading your dashboard…</p>
      </div>
    </div>
  );
  if (!donorProfile) return null;

  const isEligible = donorProfile.nextEligibleDate ? new Date(donorProfile.nextEligibleDate) <= new Date() : true;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

  return (
    <div className={styles.dashboardContainer}>
      <DashboardHeader
        onNavigate={navigate}
        displayName={displayName}
        displayBloodGroup={displayGroup}
        userRole="donor"
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pageTitle="Donor Dashboard"
      />

      <div className={styles.mainContent}>
        <div className={styles.pageBody}>

          {/* Welcome Banner */}
          <div className={styles.welcomeBanner}>
            <div className={styles.welcomeText}>
              <h1>Welcome back, {donorProfile.name}! 👋</h1>
              <p>Your generosity has already impacted {donationCount * 3} lives. Keep saving the world, one donation at a time.</p>
            </div>
            <div className={styles.welcomeActions}>
              <button className={styles.donateCta} onClick={() => navigate('/book-donation-slot')}>
                <Calendar size={18} /> Book Donation Slot
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className={styles.statsGrid}>
            <StatCard icon={Droplet}    label="Total Donations" value={donationCount}          color="#E53935" bg="rgba(229,57,53,0.12)" />
            <StatCard icon={Heart}      label="Lives Impacted"  value={donationCount * 3}       color="#EF4444" bg="rgba(239,68,68,0.12)" />
            <StatCard icon={Calendar}   label="Last Donation"   value={fmtDate(donorProfile.lastDonation)} color="#1E88E5" bg="rgba(30,136,229,0.12)" />
            <StatCard icon={Activity}   label="Upcoming Slots"  value={appointments.filter(a => !a.confirmed).length} color="#22C55E" bg="rgba(34,197,94,0.12)" />
          </div>

          {/* Profile + Eligibility */}
          <div className={styles.profileCard}>
            <div className={styles.profileAvatar}>{donorProfile.name?.charAt(0).toUpperCase()}</div>
            <div className={styles.profileInfo}>
              <div className={styles.profileName}>{donorProfile.name}</div>
              <div className={styles.bloodTypeBadge}><Droplet size={14} /> {donorProfile.bloodGroup}</div>
            </div>
            <div className={`${styles.eligibilityBadge} ${isEligible ? styles.eligible : styles.notEligible}`}>
              {isEligible
                ? <><Check size={16} /> Eligible to Donate</>
                : <><Clock size={16} /> Eligible {fmtDate(donorProfile.nextEligibleDate)}</>}
            </div>
          </div>

          {/* Main grid: Tabs + Side Panel */}
          <div className={styles.contentGrid}>

            {/* Tabs */}
            <div className={styles.tabsCard}>
              <div className={styles.tabsBar}>
                {[
                  { id: 'overview',     label: 'Overview' },
                  { id: 'history',      label: 'Donation History' },
                  { id: 'appointments', label: 'Appointments' },
                  { id: 'requests',     label: 'Blood Requests' },
                ].map(t => (
                  <button key={t.id} className={`${styles.tabBtn} ${activeTab === t.id ? styles.active : ''}`} onClick={() => setActiveTab(t.id)}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className={styles.tabContent}>

                {/* OVERVIEW */}
                {activeTab === 'overview' && (
                  <div>
                    {/* Progress */}
                    <div style={{ marginBottom: 'var(--space-6)' }}>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                        <strong>Next Milestone</strong> — {Math.max(0, 10 - donationCount)} more donations to reach 10
                      </p>
                      <div className={styles.progressTrack}>
                        <div className={styles.progressFill} style={{ width: `${Math.min(100, (donationCount / 10) * 100)}%` }} />
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>{donationCount} / 10 donations</p>
                    </div>

                    {/* Urgent matching requests */}
                    {bloodRequests.length > 0 && (
                      <>
                        <p style={{ fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', fontSize: '0.875rem' }}>
                          <AlertCircle size={16} /> Urgent Requests Matching Your Blood Type
                        </p>
                        <div className={styles.requestList}>
                          {bloodRequests.slice(0, 3).map(req => (
                            <div key={req._id} className={styles.requestCard}>
                              <div className={styles.requestInfo}>
                                <div className={styles.bloodGroupBadge}>{req.requestedGroup}</div>
                                <div className={styles.requestDetails}>
                                  <div className={styles.hospitalName}>{req.hospitalName}</div>
                                  <span className={`${styles.urgencyBadge} ${styles[req.urgencyLevel?.toLowerCase()] || styles.normal}`}>
                                    {req.urgencyLevel}
                                  </span>
                                </div>
                              </div>
                              <button className={styles.acceptBtn} onClick={() => handleAccept(req._id)} disabled={responding === req._id}>
                                {responding === req._id ? 'Accepting…' : 'Accept'} <ChevronRight size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {bloodRequests.length === 0 && (
                      <div className={styles.emptyMsg}><Heart size={32} style={{ marginBottom: 'var(--space-3)', color: 'var(--text-muted)', opacity: 0.4 }} /><p>No urgent requests matching your blood type</p></div>
                    )}
                  </div>
                )}

                {/* HISTORY */}
                {activeTab === 'history' && (
                  <div className={styles.historyList}>
                    {donationHistory.length > 0
                      ? donationHistory.map(d => (
                          <div key={d._id} className={styles.historyItem}>
                            <div className={styles.historyDot}><Check size={18} /></div>
                            <div className={styles.historyDetails}>
                              <div className={styles.historyDate}><Calendar size={12} /> {fmtDate(d.donationDate)}</div>
                              <div className={styles.historyHospital}>{d.hospitalName}</div>
                            </div>
                            <span className={styles.historyType}>{d.bloodGroup}</span>
                            <div className={styles.historyStatus}><Check size={14} /> Completed</div>
                          </div>
                        ))
                      : <div className={styles.emptyMsg}><Clock size={32} style={{ marginBottom: 'var(--space-3)', opacity: 0.4 }} /><p>No donation history yet</p></div>
                    }
                  </div>
                )}

                {/* APPOINTMENTS */}
                {activeTab === 'appointments' && (
                  <div className={styles.appointmentList}>
                    {appointments.length > 0
                      ? appointments.map(a => {
                          const d = new Date(a.appointmentDate);
                          return (
                            <div key={a._id} className={styles.appointmentCard}>
                              <div className={styles.apptDate}>
                                <div className={styles.apptDay}>{d.getDate()}</div>
                                <div className={styles.apptMonth}>{d.toLocaleString('default', { month: 'short' })}</div>
                              </div>
                              <div className={styles.apptInfo}>
                                <div className={styles.apptHospital}>{a.hospitalName}</div>
                                <div className={styles.apptTime}><Clock size={12} /> {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              </div>
                              {a.confirmed
                                ? <span className={styles.historyStatus}><Check size={14} /> Completed</span>
                                : <><span className={styles.apptStatusBadge}>Scheduled</span><button className={styles.cancelBtn}>Cancel</button></>
                              }
                            </div>
                          );
                        })
                      : <div className={styles.emptyMsg}><Calendar size={32} style={{ marginBottom: 'var(--space-3)', opacity: 0.4 }} /><p>No upcoming appointments</p></div>
                    }
                  </div>
                )}

                {/* REQUESTS */}
                {activeTab === 'requests' && (
                  <div className={styles.requestList}>
                    {allBloodRequests.length > 0
                      ? allBloodRequests.map(req => (
                          <div key={req._id} className={styles.requestCard}>
                            <div className={styles.requestInfo}>
                              <div className={styles.bloodGroupBadge}>{req.requestedGroup}</div>
                              <div className={styles.requestDetails}>
                                <div className={styles.hospitalName}>{req.hospitalName}</div>
                                <span className={`${styles.urgencyBadge} ${styles[req.urgencyLevel?.toLowerCase()] || styles.normal}`}>
                                  {req.urgencyLevel}
                                </span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              <MapPin size={14} /> Distance N/A
                            </div>
                          </div>
                        ))
                      : <div className={styles.emptyMsg}><AlertCircle size={32} style={{ marginBottom: 'var(--space-3)', opacity: 0.4 }} /><p>No pending blood requests</p></div>
                    }
                  </div>
                )}
              </div>
            </div>

            {/* Side Panel */}
            <div className={styles.sidePanel}>

              {/* Quick Actions */}
              <div className={styles.sideCard}>
                <div className={styles.sideCardTitle}><Activity size={16} style={{ color: 'var(--primary)' }} /> Quick Actions</div>
                <div className={styles.quickActionList}>
                  <button className={styles.quickActionBtn} onClick={() => navigate('/book-donation-slot')}>
                    <Calendar size={16} style={{ color: 'var(--primary)' }} /> Book Donation Slot <ChevronRight size={14} className={styles.quickActionArrow} />
                  </button>
                  <button className={styles.quickActionBtn} onClick={() => navigate('/update-profile')}>
                    <User size={16} style={{ color: 'var(--secondary)' }} /> Update Profile <ChevronRight size={14} className={styles.quickActionArrow} />
                  </button>
                  <button className={styles.quickActionBtn} onClick={() => navigate('/find-donor')}>
                    <MapPin size={16} style={{ color: 'var(--success)' }} /> Find Nearby Donors <ChevronRight size={14} className={styles.quickActionArrow} />
                  </button>
                </div>
              </div>

              {/* Your Impact */}
              <div className={styles.sideCard}>
                <div className={styles.sideCardTitle}><Heart size={16} style={{ color: 'var(--primary)' }} /> Your Impact</div>
                <div className={styles.milestoneCount}>
                  <span className={styles.milestoneNum}>{donationCount * 3}</span>
                  <span className={styles.milestoneTotal}>lives touched</span>
                </div>
                <div className="progress-track" style={{ marginBottom: 'var(--space-3)' }}>
                  <div className="progress-fill" style={{ width: `${Math.min(100, (donationCount / 10) * 100)}%` }} />
                </div>
                <div className={styles.impactList}>
                  {[
                    `${Math.ceil(donationCount * 0.5)} emergency surgeries`,
                    `${Math.ceil(donationCount * 1.2)} cancer treatments`,
                    `${Math.ceil(donationCount * 1.3)} trauma recoveries`,
                  ].map((item, i) => (
                    <div key={i} className={styles.impactItem}>
                      <div className={styles.impactDot} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>{/* end contentGrid */}
        </div>{/* end pageBody */}
      </div>{/* end mainContent */}
    </div>
  );
};

export default DonorDashboard;
