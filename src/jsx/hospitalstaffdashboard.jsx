import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from '../css/hospitalstaffdashboard.module.css';
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
  Bell,
  Stethoscope,
  Syringe,
  ClipboardList,
  UserCheck,
  Package
} from 'lucide-react';

const HospitalStaffDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  // State for data
  const [stats, setStats] = useState({
    totalAppointments: 0,
    pendingAppointments: 0,
    completedDonations: 0,
    bloodStockAlerts: 0,
    urgentRequests: 0,
    todayAppointments: 0
  });

  const [appointments, setAppointments] = useState([]);
  const [bloodStock, setBloodStock] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const userData = JSON.parse(localStorage.getItem('user'));
      setUser(userData);

      // Fetch upcoming appointments
      const appointmentsRes = await axios.get(`http://localhost:5000/hospital-staff/appointments/upcoming/${userData.id}`, {
        headers: { Authorization: `Bearer ${userData.token}` }
      });
      setAppointments(appointmentsRes.data);

      // Fetch blood stock
      const stockRes = await axios.get('http://localhost:5000/staff/stock', {
        headers: { Authorization: `Bearer ${userData.token}` }
      });
      setBloodStock(stockRes.data);

      // Fetch notifications
      const notificationsRes = await axios.get('http://localhost:5000/staff/notifications', {
        headers: { Authorization: `Bearer ${userData.token}` }
      });
      setNotifications(notificationsRes.data);

      // Calculate stats
      calculateStats(appointmentsRes.data, stockRes.data, notificationsRes.data);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      const notificationsRes = await axios.get('http://localhost:5000/staff/notifications', {
        headers: { Authorization: `Bearer ${userData.token}` }
      });
      setNotifications(notificationsRes.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const calculateStats = (appointments, stock, notifications) => {
    const today = new Date().toDateString();
    const todayAppointments = appointments.filter(app =>
      new Date(app.date).toDateString() === today
    ).length;

    const pendingAppointments = appointments.filter(app =>
      app.status === 'scheduled'
    ).length;

    const completedDonations = appointments.filter(app =>
      app.status === 'completed'
    ).length;

    const bloodStockAlerts = stock.filter(item =>
      item.unitsAvailable < 10
    ).length;

    const urgentRequests = notifications.filter(notif =>
      notif.type === 'urgent_request'
    ).length;

    setStats({
      totalAppointments: appointments.length,
      pendingAppointments,
      completedDonations,
      bloodStockAlerts,
      urgentRequests,
      todayAppointments
    });
  };

  const handleMarkDonated = async (appointmentId) => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      await axios.patch(`http://localhost:5000/staff/appointments/${appointmentId}/confirm`, {
        staffId: userData.id,
        status: 'donated',
        notes: ''
      }, {
        headers: { Authorization: `Bearer ${userData.token}` }
      });

      // Refresh data
      fetchDashboardData();
      alert('Donation marked as completed successfully!');
    } catch (error) {
      console.error('Error confirming donation:', error);
      alert('Failed to confirm donation');
    }
  };

  const handleMarkMissed = async (appointmentId) => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      await axios.patch(`http://localhost:5000/staff/appointments/${appointmentId}/confirm`, {
        staffId: userData.id,
        status: 'missed',
        notes: ''
      }, {
        headers: { Authorization: `Bearer ${userData.token}` }
      });

      // Refresh data
      fetchDashboardData();
      alert('Appointment marked as missed successfully!');
    } catch (error) {
      console.error('Error marking appointment as missed:', error);
      alert('Failed to mark appointment as missed');
    }
  };

  const handleStockAdjustment = async (bloodGroup, adjustment) => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      await axios.post('http://localhost:5000/staff/stock/adjust', {
        bloodGroup,
        adjustment,
        reason: 'Manual adjustment by staff'
      }, {
        headers: { Authorization: `Bearer ${userData.token}` }
      });

      // Refresh data
      fetchDashboardData();
      alert('Stock adjusted successfully!');
    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert('Failed to adjust stock');
    }
  };

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('user');
    // Navigate to login page
    navigate('/login');
  };

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = appointment.donorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         appointment.bloodGroup?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || appointment.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const StatCard = ({ icon: Icon, title, value, color, bgColor }) => (
    <div className={styles['stat-card']} style={{ backgroundColor: bgColor }}>
      <div className={styles['stat-icon']} style={{ color }}>
        <Icon size={24} />
      </div>
      <div className={styles['stat-content']}>
        <h3>{value}</h3>
        <p>{title}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={styles['hospital-staff-dashboard']}>
        <div className={styles['loading-spinner']}>
          <div className={styles.spinner}></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['hospital-staff-dashboard']}>
      {/* Header */}
      <header className={styles['dashboard-header']}>
        <div className={styles['header-left']}>
          <h1>Hospital Staff Dashboard</h1>
          <p>Welcome back, {user?.fullName}</p>
        </div>
        <div className={styles['header-right']}>
          <div className={styles['notification-bell']}>
            <Bell size={20} />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className={styles['notification-badge']}>
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </div>
          <div className={styles['profile-menu']}>
            <button
              className={styles['profile-btn']}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              <div className={styles['profile-avatar']}>
                {user?.fullName?.charAt(0).toUpperCase()}
              </div>
              <ChevronDown size={16} />
            </button>
            {isProfileOpen && (
              <div className={styles['profile-dropdown']}>
                <div className={styles['profile-info']}>
                  <p className={styles['profile-name']}>{user?.fullName}</p>
                  <p className={styles['profile-role']}>{user?.staffRole}</p>
                </div>
                <button className={styles['logout-btn']} onClick={handleLogout}>
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className={styles['dashboard-nav']}>
        <button
          className={`${styles['nav-btn']} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={16} />
          Overview
        </button>
        <button
          className={`${styles['nav-btn']} ${activeTab === 'appointments' ? styles.active : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          <Calendar size={16} />
          Appointments
        </button>
        <button
          className={`${styles['nav-btn']} ${activeTab === 'stock' ? styles.active : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          <Package size={16} />
          Blood Stock
        </button>
        <button
          className={`${styles['nav-btn']} ${activeTab === 'notifications' ? styles.active : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell size={16} />
          Notifications
        </button>
        <button
          className={`${styles['nav-btn']} ${activeTab === 'reports' ? styles.active : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <FileText size={16} />
          Reports
        </button>
      </nav>

      {/* Main Content */}
      <main className={styles['dashboard-main']}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className={styles['overview-section']}>
            <div className={styles['stats-grid']}>
              <StatCard
                icon={Calendar}
                title="Today's Appointments"
                value={stats.todayAppointments}
                color="#3b82f6"
                bgColor="#eff6ff"
              />
              <StatCard
                icon={Clock}
                title="Pending Appointments"
                value={stats.pendingAppointments}
                color="#f59e0b"
                bgColor="#fffbeb"
              />
              <StatCard
                icon={CheckCircle}
                title="Completed Donations"
                value={stats.completedDonations}
                color="#10b981"
                bgColor="#f0fdf4"
              />
              <StatCard
                icon={AlertTriangle}
                title="Stock Alerts"
                value={stats.bloodStockAlerts}
                color="#ef4444"
                bgColor="#fef2f2"
              />
              <StatCard
                icon={Bell}
                title="Urgent Requests"
                value={stats.urgentRequests}
                color="#8b5cf6"
                bgColor="#faf5ff"
              />
              <StatCard
                icon={Users}
                title="Total Appointments"
                value={stats.totalAppointments}
                color="#06b6d4"
                bgColor="#ecfeff"
              />
            </div>

            {/* Recent Activity */}
            <div className={styles['recent-activity']}>
              <h3>Recent Appointments</h3>
              <div className={styles['activity-list']}>
                {appointments.slice(0, 5).map(appointment => (
                  <div key={appointment._id} className={styles['activity-item']}>
                    <div className={styles['activity-icon']}>
                      <Calendar size={16} />
                    </div>
                    <div className={styles['activity-content']}>
                      <p>{appointment.donorName} - {appointment.bloodGroup}</p>
                      <span>{new Date(appointment.date).toLocaleDateString()}</span>
                    </div>
                    <div className={`${styles['activity-status']} ${styles[appointment.status]}`}>
                      {appointment.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className={styles['appointments-section']}>
            <div className={styles['section-header']}>
              <h2>Appointment Management</h2>
              <div className={styles.filters}>
                <div className={styles['search-box']}>
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search appointments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className={styles['appointments-table']}>
              <table>
                <thead>
                  <tr>
                    <th>Donor</th>
                    <th>Blood Group</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map(appointment => (
                    <tr key={appointment._id}>
                      <td>{appointment.donorName}</td>
                      <td>{appointment.bloodGroup}</td>
                      <td>{new Date(appointment.date).toLocaleString()}</td>
                      <td>
                        <span className={`${styles['status-badge']} ${styles[appointment.status]}`}>
                          {appointment.status}
                        </span>
                      </td>
                      <td>
                        {appointment.status === 'scheduled' && (
                          <>
                            <button
                              className={`${styles['action-btn']} ${styles.confirm}`}
                              onClick={() => handleMarkDonated(appointment._id)}
                            >
                              <CheckCircle size={16} />
                              Mark as Donated
                            </button>
                            <button
                              className={`${styles['action-btn']} ${styles.missed}`}
                              onClick={() => handleMarkMissed(appointment._id)}
                            >
                              <XCircle size={16} />
                              Mark as Missed
                            </button>
                          </>
                        )}
                        <button className={`${styles['action-btn']} ${styles.view}`}>
                          <Eye size={16} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stock Tab */}
        {activeTab === 'stock' && (
          <div className={styles['stock-section']}>
            <div className={styles['section-header']}>
              <h2>Blood Inventory Management</h2>
            </div>

            <div className={styles['stock-grid']}>
              {bloodStock.map(stock => (
                <div key={stock.bloodGroup} className={styles['stock-card']}>
                  <div className={styles['stock-header']}>
                    <h3>{stock.bloodGroup}</h3>
                    <div className={`${styles['stock-status']} ${stock.unitsAvailable < 10 ? styles.low : styles.good}`}>
                      {stock.unitsAvailable < 10 ? 'Low Stock' : 'Good'}
                    </div>
                  </div>
                  <div className={styles['stock-info']}>
                    <div className={styles['stock-units']}>
                      <Droplet size={20} />
                      <span>{stock.unitsAvailable} units</span>
                    </div>
                    <div className={styles['stock-last-updated']}>
                      Last updated: {new Date(stock.lastUpdated).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={styles['stock-actions']}>
                    <button
                      className={`${styles['stock-btn']} ${styles.adjust}`}
                      onClick={() => handleStockAdjustment(stock.bloodGroup, 1)}
                    >
                      + Add
                    </button>
                    <button
                      className={`${styles['stock-btn']} ${styles.adjust}`}
                      onClick={() => handleStockAdjustment(stock.bloodGroup, -1)}
                      disabled={stock.unitsAvailable <= 0}
                    >
                      - Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className={styles['notifications-section']}>
            <div className={styles['section-header']}>
              <h2>Notifications</h2>
            </div>

            <div className={styles['notifications-list']}>
              {notifications.map(notification => (
                <div key={notification._id} className={`${styles['notification-item']} ${!notification.read ? styles.unread : ''}`}>
                  <div className={styles['notification-icon']}>
                    <Bell size={16} />
                  </div>
                  <div className={styles['notification-content']}>
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                    <span className={styles['notification-time']}>
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {!notification.read && (
                    <div className={styles['notification-indicator']}></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className={styles['reports-section']}>
            <div className={styles['section-header']}>
              <h2>Hospital Reports</h2>
            </div>

            <div className={styles['reports-grid']}>
              <div className={styles['report-card']}>
                <div className={styles['report-icon']}>
                  <BarChart3 size={24} />
                </div>
                <div className={styles['report-content']}>
                  <h3>Monthly Donation Report</h3>
                  <p>View donation statistics for the current month</p>
                  <button className={styles['report-btn']}>
                    <Download size={16} />
                    Generate Report
                  </button>
                </div>
              </div>

              <div className={styles['report-card']}>
                <div className={styles['report-icon']}>
                  <PieChart size={24} />
                </div>
                <div className={styles['report-content']}>
                  <h3>Blood Type Distribution</h3>
                  <p>Analysis of blood types in inventory</p>
                  <button className={styles['report-btn']}>
                    <Download size={16} />
                    Generate Report
                  </button>
                </div>
              </div>

              <div className={styles['report-card']}>
                <div className={styles['report-icon']}>
                  <FileText size={24} />
                </div>
                <div className={styles['report-content']}>
                  <h3>Appointment Summary</h3>
                  <p>Summary of all appointments and outcomes</p>
                  <button className={styles['report-btn']}>
                    <Download size={16} />
                    Generate Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default HospitalStaffDashboard;
