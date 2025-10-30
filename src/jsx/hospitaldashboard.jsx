import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from '../css/hospitaldashboard.module.css';
import {
  Users,
  Droplet,
  Activity,
  Heart,
  Shield,
  TrendingUp,
  AlertTriangle,
  Clock,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Download,
  Settings,
  LogOut,
  ChevronDown,
  BarChart3,
  PieChart,
  FileText,
  Database,
  Stethoscope,
  Syringe,
  ClipboardList,
  UserCheck,
  Package,
  Bell,
  Moon,
  Sun,
  Menu,
  X,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  TrendingDown,
  ChevronRight,
  Star,
  Award,
  Target
} from 'lucide-react';

const HospitalDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // State for data
  const [stats, setStats] = useState({
    totalAppointments: 0,
    pendingAppointments: 0,
    completedDonations: 0,
    bloodStockAlerts: 0,
    plasmaStockAlerts: 0,
    urgentRequests: 0,
    todayAppointments: 0,
    weeklyTrend: 0,
    successRate: 0,
    totalDonors: 0
  });

  const [appointments, setAppointments] = useState([]);
  const [bloodStock, setBloodStock] = useState([]);
  const [plasmaStock, setPlasmaStock] = useState([]);
  const [user, setUser] = useState(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [updatingAppointments, setUpdatingAppointments] = useState(new Set());

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
    generateNotifications();
    generateRecentActivity();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const userData = JSON.parse(localStorage.getItem('user'));
      if (!userData || userData.role !== 'hospital') {
        navigate('/login');
        return;
      }
      setUser(userData);

      const token = userData.token;

      // Fetch appointments
      const appointmentsRes = await axios.get(`${process.env.REACT_APP_API_URL || 'https://blood-bank-backend.onrender.com'}/hospital/my-appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppointments(appointmentsRes.data);

      // Fetch blood stock
      const stockRes = await axios.get(`${process.env.REACT_APP_API_URL || 'https://blood-bank-backend.onrender.com'}/hospital/stock`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBloodStock(stockRes.data);

      // Fetch plasma stock
      const plasmaRes = await axios.get(`${process.env.REACT_APP_API_URL || 'https://blood-bank-backend.onrender.com'}/hospital/plasma-stock`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlasmaStock(plasmaRes.data);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayAppointments = appointmentsRes.data.filter(app =>
        new Date(app.appointmentDate) >= today && new Date(app.appointmentDate) < tomorrow
      ).length;

      const pendingAppointments = appointmentsRes.data.filter(app =>
        app.status === 'scheduled'
      ).length;

      const completedDonations = appointmentsRes.data.filter(app =>
        app.status === 'donated'
      ).length;

      const totalDonations = appointmentsRes.data.filter(app =>
        app.status === 'donated' || app.status === 'missed'
      ).length;

      const successRate = totalDonations > 0 
        ? Math.round((completedDonations / totalDonations) * 100) 
        : 0;

      // Get upcoming appointments
      const upcoming = appointmentsRes.data
        .filter(app => new Date(app.appointmentDate) >= today && app.status === 'scheduled')
        .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))
        .slice(0, 5);

      setUpcomingAppointments(upcoming);

      setStats({
        totalAppointments: appointmentsRes.data.length,
        pendingAppointments,
        completedDonations,
        bloodStockAlerts: stockRes.data.filter(item => item.unitsAvailable < 5).length,
        plasmaStockAlerts: plasmaRes.data.filter(item => item.unitsAvailable < 5).length,
        urgentRequests: 0,
        todayAppointments,
        weeklyTrend: 12,
        successRate,
        totalDonors: new Set(appointmentsRes.data.map(app => app.donorId?._id)).size
      });

      setLoading(false);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setLoading(false);
    }
  };

  const generateNotifications = () => {
    setNotifications([
      { id: 1, type: 'alert', message: 'A+ Blood stock is running low', time: '5 min ago' },
      { id: 2, type: 'success', message: '3 new appointments scheduled', time: '15 min ago' },
      { id: 3, type: 'info', message: 'Monthly report is ready', time: '1 hour ago' }
    ]);
  };

  const generateRecentActivity = () => {
    setRecentActivity([
      { id: 1, action: 'Donation completed', donor: 'John Doe', time: '10 min ago', type: 'success' },
      { id: 2, action: 'Appointment scheduled', donor: 'Jane Smith', time: '25 min ago', type: 'info' },
      { id: 3, action: 'Blood stock updated', donor: 'System', time: '1 hour ago', type: 'update' },
      { id: 4, action: 'Appointment cancelled', donor: 'Mike Johnson', time: '2 hours ago', type: 'warning' }
    ]);
  };

  const handleStatusUpdate = async (appointmentId, newStatus, notes = '') => {
    if (updatingAppointments.has(appointmentId)) {
      return; // Prevent duplicate requests
    }

    setUpdatingAppointments(prev => new Set(prev).add(appointmentId));

    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      const token = userData.token;

      const response = await axios.patch(`${process.env.REACT_APP_API_URL || 'https://blood-bank-backend.onrender.com'}/hospital/appointments/${appointmentId}/status`, {
        status: newStatus,
        notes,
        hospitalId: userData.hospitalId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Add a small delay to ensure backend processing is complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Refresh dashboard data and handle potential errors
      try {
        await fetchDashboardData();
        alert(`Appointment marked as ${newStatus}`);
      } catch (fetchError) {
        console.error('Error refreshing dashboard data:', fetchError);
        alert(`Appointment marked as ${newStatus}, but failed to refresh dashboard. Please refresh the page.`);
      }
    } catch (err) {
      console.error('Error updating appointment:', err);

      if (err.response?.status === 401 || err.response?.status === 403) {
        // Token expired or invalid, or access denied
        alert('Your session has expired. Please log in again.');
        handleLogout();
      } else if (err.response?.status === 404) {
        alert('Appointment not found. It may have been deleted.');
        try {
          await fetchDashboardData(); // Refresh data
        } catch (fetchError) {
          console.error('Error refreshing dashboard data after 404:', fetchError);
        }
      } else {
        // Show specific error message from server or generic message
        const errorMessage = err.response?.data?.message || 'Error updating appointment status. Please try again.';
        alert(errorMessage);
      }
    } finally {
      setUpdatingAppointments(prev => {
        const newSet = new Set(prev);
        newSet.delete(appointmentId);
        return newSet;
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getBloodGroupColor = (bloodGroup) => {
    const colors = {
      'A+': '#FF6B6B',
      'A-': '#FF8787',
      'B+': '#4ECDC4',
      'B-': '#45B7D1',
      'AB+': '#95E1D3',
      'AB-': '#A8E6CF',
      'O+': '#FFD93D',
      'O-': '#FFA07A'
    };
    return colors[bloodGroup] || '#6C5CE7';
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}>
          <Droplet className={styles.loaderIcon} />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.dashboard} ${darkMode ? styles.darkMode : ''} ${sidebarCollapsed ? styles.collapsed : ''}`}>
      {/* Sidebar */}
      <nav className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <Heart className={styles.logoIcon} />
            {!sidebarCollapsed && <span>LifeShare</span>}
          </div>
          <button 
            className={styles.collapseBtn}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <ChevronRight size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <ul className={styles.navList}>
          <li className={activeTab === 'overview' ? styles.active : ''}>
            <button onClick={() => setActiveTab('overview')}>
              <BarChart3 size={20} />
              {!sidebarCollapsed && <span>Overview</span>}
            </button>
          </li>
          <li className={activeTab === 'appointments' ? styles.active : ''}>
            <button onClick={() => setActiveTab('appointments')}>
              <Calendar size={20} />
              {!sidebarCollapsed && <span>Appointments</span>}
              {!sidebarCollapsed && stats.todayAppointments > 0 && (
                <span className={styles.badge}>{stats.todayAppointments}</span>
              )}
            </button>
          </li>
          <li className={activeTab === 'inventory' ? styles.active : ''}>
            <button onClick={() => setActiveTab('inventory')}>
              <Package size={20} />
              {!sidebarCollapsed && <span>Inventory</span>}
              {!sidebarCollapsed && (stats.bloodStockAlerts + stats.plasmaStockAlerts) > 0 && (
                <span className={styles.badgeAlert}>{stats.bloodStockAlerts + stats.plasmaStockAlerts}</span>
              )}
            </button>
          </li>
          <li className={activeTab === 'notifications' ? styles.active : ''}>
            <button onClick={() => setActiveTab('notifications')}>
              <Bell size={20} />
              {!sidebarCollapsed && <span>Notifications</span>}
              {!sidebarCollapsed && notifications.length > 0 && (
                <span className={styles.badge}>{notifications.length}</span>
              )}
            </button>
          </li>
          <li className={activeTab === 'donors' ? styles.active : ''}>
            <button onClick={() => setActiveTab('donors')}>
              <Users size={20} />
              {!sidebarCollapsed && <span>Donors</span>}
            </button>
          </li>
          <li className={activeTab === 'analytics' ? styles.active : ''}>
            <button onClick={() => setActiveTab('analytics')}>
              <TrendingUp size={20} />
              {!sidebarCollapsed && <span>Analytics</span>}
            </button>
          </li>
        </ul>

        <div className={styles.sidebarFooter}>
          <button className={styles.settingsBtn} onClick={() => setActiveTab('profile')}>
            <Settings size={20} />
            {!sidebarCollapsed && <span>Settings</span>}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className={styles.mainContainer}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1>Welcome back, {user?.name || 'Hospital'}!</h1>
            <p className={styles.subtitle}>Here's what's happening with your blood bank today</p>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.refreshBtn} onClick={fetchDashboardData}>
              <RefreshCw size={18} />
            </button>
            <button 
              className={styles.iconBtn}
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className={styles.notificationWrapper}>
              <button 
                className={styles.iconBtn}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className={styles.notificationBadge}>{notifications.length}</span>
                )}
              </button>
              {showNotifications && (
                <div className={styles.notificationDropdown}>
                  <div className={styles.notificationHeader}>
                    <h3>Notifications</h3>
                    <button>Mark all read</button>
                  </div>
                  {notifications.map(notif => (
                    <div key={notif.id} className={`${styles.notificationItem} ${styles[notif.type]}`}>
                      <p>{notif.message}</p>
                      <span>{notif.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.profileMenu}>
              <button
                className={styles.profileBtn}
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <div className={styles.avatar}>
                  {user?.name?.charAt(0) || 'H'}
                </div>
                {!sidebarCollapsed && (
                  <>
                    <span>{user?.name || 'Hospital'}</span>
                    <ChevronDown size={16} />
                  </>
                )}
              </button>
              {isProfileOpen && (
                <div className={styles.profileDropdown}>
                  <button onClick={() => setActiveTab('profile')}>
                    <UserCheck size={16} />
                    Profile Settings
                  </button>
                  <button onClick={handleLogout}>
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className={styles.main}>
          {activeTab === 'overview' && (
            <div className={styles.overviewSection}>
              {/* Stats Grid */}
              <div className={styles.statsGrid}>
                <div className={`${styles.statCard} ${styles.primary}`}>
                  <div className={styles.statHeader}>
                    <div className={styles.statIcon}>
                      <Calendar size={24} />
                    </div>
                    <div className={styles.statTrend}>
                      <ArrowUp size={16} />
                      <span>+{stats.weeklyTrend}%</span>
                    </div>
                  </div>
                  <div className={styles.statContent}>
                    <h3>{stats.totalAppointments}</h3>
                    <p>Total Appointments</p>
                  </div>
                </div>

                <div className={`${styles.statCard} ${styles.warning}`}>
                  <div className={styles.statHeader}>
                    <div className={styles.statIcon}>
                      <Clock size={24} />
                    </div>
                    <div className={styles.statInfo}>
                      <span>{stats.todayAppointments} today</span>
                    </div>
                  </div>
                  <div className={styles.statContent}>
                    <h3>{stats.pendingAppointments}</h3>
                    <p>Pending Appointments</p>
                  </div>
                </div>

                <div className={`${styles.statCard} ${styles.success}`}>
                  <div className={styles.statHeader}>
                    <div className={styles.statIcon}>
                      <Droplet size={24} />
                    </div>
                    <div className={styles.statTrend}>
                      <Target size={16} />
                      <span>{stats.successRate}%</span>
                    </div>
                  </div>
                  <div className={styles.statContent}>
                    <h3>{stats.completedDonations}</h3>
                    <p>Completed Donations</p>
                  </div>
                </div>

                <div className={`${styles.statCard} ${styles.danger}`}>
                  <div className={styles.statHeader}>
                    <div className={styles.statIcon}>
                      <AlertTriangle size={24} />
                    </div>
                    <div className={styles.urgentBadge}>URGENT</div>
                  </div>
                  <div className={styles.statContent}>
                    <h3>{stats.bloodStockAlerts}</h3>
                    <p>Low Stock Alerts</p>
                  </div>
                </div>
              </div>

              {/* Secondary Stats */}
              <div className={styles.secondaryStats}>
                <div className={styles.miniStatCard}>
                  <Users size={20} />
                  <div>
                    <h4>{stats.totalDonors}</h4>
                    <p>Active Donors</p>
                  </div>
                </div>
                <div className={styles.miniStatCard}>
                  <Award size={20} />
                  <div>
                    <h4>{stats.successRate}%</h4>
                    <p>Success Rate</p>
                  </div>
                </div>
                <div className={styles.miniStatCard}>
                  <Activity size={20} />
                  <div>
                    <h4>{bloodStock.length}</h4>
                    <p>Blood Types</p>
                  </div>
                </div>
              </div>

              {/* Content Grid */}
              <div className={styles.contentGrid}>
                {/* Upcoming Appointments */}
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3>Upcoming Appointments</h3>
                    <button onClick={() => setActiveTab('appointments')}>
                      View All <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className={styles.appointmentsList}>
                    {upcomingAppointments.length > 0 ? (
                      upcomingAppointments.map(app => (
                        <div key={app._id} className={styles.appointmentItem}>
                          <div className={styles.appointmentAvatar}>
                            {app.donorId?.fullName?.charAt(0) || 'D'}
                          </div>
                          <div className={styles.appointmentDetails}>
                            <h4>{app.donorId?.fullName}</h4>
                            <p>{new Date(app.appointmentDate).toLocaleDateString()} • {app.donorId?.bloodGroup}</p>
                          </div>
                          <div className={styles.appointmentStatus}>
                            <span className={styles.statusBadge}>Scheduled</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className={styles.emptyState}>No upcoming appointments</p>
                    )}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3>Recent Activity</h3>
                  </div>
                  <div className={styles.activityList}>
                    {recentActivity.map(activity => (
                      <div key={activity.id} className={styles.activityItem}>
                        <div className={`${styles.activityDot} ${styles[activity.type]}`}></div>
                        <div className={styles.activityContent}>
                          <p><strong>{activity.action}</strong></p>
                          <span>{activity.donor} • {activity.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Blood Stock Overview */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3>Blood Stock Overview</h3>
                  <button onClick={() => setActiveTab('inventory')}>
                    View Inventory <ChevronRight size={16} />
                  </button>
                </div>
                <div className={styles.bloodStockGrid}>
                  {bloodStock.map(item => (
                    <div 
                      key={item._id} 
                      className={styles.bloodStockCard}
                      style={{ borderColor: getBloodGroupColor(item.bloodGroup) }}
                    >
                      <div 
                        className={styles.bloodTypeLabel}
                        style={{ backgroundColor: getBloodGroupColor(item.bloodGroup) }}
                      >
                        {item.bloodGroup}
                      </div>
                      <div className={styles.bloodStockInfo}>
                        <h4>{item.unitsAvailable}</h4>
                        <p>units available</p>
                        {item.unitsAvailable < 5 && (
                          <span className={styles.lowStockWarning}>
                            <AlertTriangle size={14} /> Low Stock
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className={styles.appointmentsSection}>
              <div className={styles.sectionHeader}>
                <h2>Appointment Management</h2>
                <div className={styles.headerActions}>
                  <button className={styles.exportBtn}>
                    <Download size={18} />
                    Export
                  </button>
                </div>
              </div>

              <div className={styles.filters}>
                <div className={styles.searchBox}>
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search by donor or recipient name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="donated">Donated</option>
                  <option value="missed">Missed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className={styles.appointmentsTable}>
                {appointments
                  .filter(app =>
                    (filterStatus === 'all' || app.status === filterStatus) &&
                    (searchTerm === '' ||
                      app.donorId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      app.recipientId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()))
                  )
                  .map(appointment => (
                    <div key={appointment._id} className={styles.appointmentRow}>
                      <div className={styles.appointmentMain}>
                        <div className={styles.donorInfo}>
                          <div className={styles.donorAvatar}>
                            {appointment.donorId?.fullName?.charAt(0) || 'D'}
                          </div>
                          <div>
                            <h4>{appointment.donorId?.fullName}</h4>
                            <p>{appointment.donorId?.bloodGroup}</p>
                          </div>
                        </div>
                        <div className={styles.appointmentMeta}>
                          <div className={styles.metaItem}>
                            <Calendar size={16} />
                            {new Date(appointment.appointmentDate).toLocaleDateString()}
                          </div>
                          <div className={styles.metaItem}>
                            <MapPin size={16} />
                            {appointment.hospitalName}
                          </div>
                        </div>
                        <div className={styles.recipientInfo}>
                          <span>For: {appointment.recipientId?.fullName}</span>
                        </div>
                        <span className={`${styles.statusPill} ${styles[appointment.status]}`}>
                          {appointment.status}
                        </span>
                      </div>
                      <div className={styles.appointmentActions}>
                        {appointment.status === 'scheduled' && (
                          <>
                            <button
                              className={styles.btnSuccess}
                              onClick={() => handleStatusUpdate(appointment._id, 'donated')}
                              disabled={updatingAppointments.has(appointment._id)}
                            >
                              <CheckCircle size={16} />
                              {updatingAppointments.has(appointment._id) ? 'Updating...' : 'Mark Donated'}
                            </button>
                            <button
                              className={styles.btnDanger}
                              onClick={() => handleStatusUpdate(appointment._id, 'missed')}
                              disabled={updatingAppointments.has(appointment._id)}
                            >
                              <XCircle size={16} />
                              {updatingAppointments.has(appointment._id) ? 'Updating...' : 'Mark Missed'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className={styles.inventorySection}>
              <div className={styles.sectionHeader}>
                <h2>Inventory Management</h2>
                <button className={styles.btnPrimary}>
                  <Plus size={18} />
                  Update Stock
                </button>
              </div>

              {/* Blood Stock Section */}
              <div className={styles.inventorySubsection}>
                <h3>Blood Stock</h3>
                <div className={styles.inventoryGrid}>
                  {bloodStock.map(item => (
                    <div key={item._id} className={styles.inventoryCard}>
                      <div
                        className={styles.inventoryHeader}
                        style={{ backgroundColor: getBloodGroupColor(item.bloodGroup) }}
                      >
                        <h3>{item.bloodGroup}</h3>
                        {item.unitsAvailable < 5 && (
                          <div className={styles.alertBadge}>
                            <AlertTriangle size={16} />
                          </div>
                        )}
                      </div>
                      <div className={styles.inventoryBody}>
                        <div className={styles.unitsDisplay}>
                          <h2>{item.unitsAvailable}</h2>
                          <p>units available</p>
                        </div>
                        <div className={styles.inventoryMeta}>
                          <div className={styles.metaRow}>
                            <span>Last Updated:</span>
                            <strong>{new Date(item.lastUpdated).toLocaleDateString()}</strong>
                          </div>
                          <div className={styles.stockStatus}>
                            {item.unitsAvailable >= 10 ? (
                              <span className={styles.statusGood}>Adequate Stock</span>
                            ) : item.unitsAvailable >= 5 ? (
                              <span className={styles.statusWarning}>Moderate Stock</span>
                            ) : (
                              <span className={styles.statusCritical}>Critical Level</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Plasma Stock Section */}
              <div className={styles.inventorySubsection}>
                <h3>Plasma Stock</h3>
                <div className={styles.inventoryGrid}>
                  {plasmaStock.map(item => (
                    <div key={item._id} className={styles.inventoryCard}>
                      <div
                        className={styles.inventoryHeader}
                        style={{ backgroundColor: getBloodGroupColor(item.bloodGroup) }}
                      >
                        <h3>{item.bloodGroup}</h3>
                        {item.unitsAvailable < 5 && (
                          <div className={styles.alertBadge}>
                            <AlertTriangle size={16} />
                          </div>
                        )}
                      </div>
                      <div className={styles.inventoryBody}>
                        <div className={styles.unitsDisplay}>
                          <h2>{item.unitsAvailable}</h2>
                          <p>units available</p>
                        </div>
                        <div className={styles.inventoryMeta}>
                          <div className={styles.metaRow}>
                            <span>Last Updated:</span>
                            <strong>{new Date(item.lastUpdated).toLocaleDateString()}</strong>
                          </div>
                          <div className={styles.stockStatus}>
                            {item.unitsAvailable >= 10 ? (
                              <span className={styles.statusGood}>Adequate Stock</span>
                            ) : item.unitsAvailable >= 5 ? (
                              <span className={styles.statusWarning}>Moderate Stock</span>
                            ) : (
                              <span className={styles.statusCritical}>Critical Level</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className={styles.notificationsSection}>
              <div className={styles.sectionHeader}>
                <h2>Notifications</h2>
                <div className={styles.headerActions}>
                  <button className={styles.btnSecondary}>
                    <RefreshCw size={18} />
                    Refresh
                  </button>
                </div>
              </div>

              <div className={styles.notificationsContainer}>
                {notifications.length > 0 ? (
                  notifications.map(notif => (
                    <div key={notif.id} className={`${styles.notificationCard} ${styles[notif.type]}`}>
                      <div className={styles.notificationIcon}>
                        {notif.type === 'alert' && <AlertTriangle size={24} />}
                        {notif.type === 'success' && <CheckCircle size={24} />}
                        {notif.type === 'info' && <Bell size={24} />}
                      </div>
                      <div className={styles.notificationContent}>
                        <h4>{notif.message}</h4>
                        <span className={styles.notificationTime}>{notif.time}</span>
                      </div>
                      <div className={styles.notificationActions}>
                        <button className={styles.markReadBtn}>
                          Mark as Read
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyStateCard}>
                    <Bell size={48} />
                    <h3>No Notifications</h3>
                    <p>You don't have any notifications at the moment.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'donors' && (
            <div className={styles.donorsSection}>
              <div className={styles.sectionHeader}>
                <h2>Active Donors</h2>
                <div className={styles.searchBox}>
                  <Search size={18} />
                  <input type="text" placeholder="Search donors..." />
                </div>
              </div>
              <div className={styles.emptyStateCard}>
                <Users size={48} />
                <h3>Donor Management</h3>
                <p>View and manage all registered donors who have donated at your facility</p>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className={styles.analyticsSection}>
              <div className={styles.sectionHeader}>
                <h2>Analytics & Reports</h2>
                <div className={styles.dateRange}>
                  <button>Last 7 days</button>
                  <button>Last 30 days</button>
                  <button>Custom</button>
                </div>
              </div>
              <div className={styles.analyticsGrid}>
                <div className={styles.card}>
                  <h3>Donation Trends</h3>
                  <div className={styles.chartPlaceholder}>
                    <TrendingUp size={48} />
                    <p>Chart visualization coming soon</p>
                  </div>
                </div>
                <div className={styles.card}>
                  <h3>Blood Type Distribution</h3>
                  <div className={styles.chartPlaceholder}>
                    <PieChart size={48} />
                    <p>Chart visualization coming soon</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className={styles.profileSection}>
              <div className={styles.sectionHeader}>
                <h2>Profile & Settings</h2>
              </div>

              <div className={styles.profileGrid}>
                <div className={styles.card}>
                  <h3>Hospital Information</h3>
                  <div className={styles.infoList}>
                    <div className={styles.infoItem}>
                      <span>Name:</span>
                      <strong>{user?.name}</strong>
                    </div>
                    <div className={styles.infoItem}>
                      <span>Email:</span>
                      <strong>{user?.email}</strong>
                    </div>
                    <div className={styles.infoItem}>
                      <span>Role:</span>
                      <strong>Hospital Administrator</strong>
                    </div>
                  </div>
                </div>

                <div className={styles.card}>
                  <h3>Quick Actions</h3>
                  <div className={styles.actionButtons}>
                    <button className={styles.actionBtn}>
                      <Edit size={20} />
                      Edit Profile
                    </button>
                    <button className={styles.actionBtn}>
                      <Shield size={20} />
                      Change Password
                    </button>
                    <button className={styles.actionBtn}>
                      <Bell size={20} />
                      Notification Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default HospitalDashboard;