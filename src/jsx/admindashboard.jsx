import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styles from '../css/admindashboard.module.css';
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
  Database
} from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  // State for data
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDonors: 0,
    totalRecipients: 0,
    totalDonations: 0,
    pendingRequests: 0,
    recentDonations: 0,
    totalPlasmaStock: 0,
    plasmaStockAlerts: 0
  });
  
  const [users, setUsers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [matches, setMatches] = useState([]);
  const [bloodInventory, setBloodInventory] = useState([]);
  const [plasmaInventory, setPlasmaInventory] = useState([]);
  const [showAddHospitalForm, setShowAddHospitalForm] = useState(false);
  const [hospitalForm, setHospitalForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: ''
  });
  const [newHospital, setNewHospital] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    verified: true
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch admin data
  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats
      const statsRes = await axios.get('http://localhost:5000/admin/stats');
      setStats(statsRes.data);

      // Fetch users
      const usersRes = await axios.get('http://localhost:5000/admin/users');
      setUsers(usersRes.data);

      // Fetch donations
      const donationsRes = await axios.get('http://localhost:5000/admin/donations');
      setDonations(donationsRes.data);

      // Fetch requests
      const requestsRes = await axios.get('http://localhost:5000/admin/requests');
      setRequests(requestsRes.data);

      // Fetch hospitals
      const hospitalsRes = await axios.get('http://localhost:5000/admin/hospitals');
      setHospitals(hospitalsRes.data);

      // Fetch matches
      const matchesRes = await axios.get('http://localhost:5000/admin/matches');
      setMatches(matchesRes.data);



      // Fetch blood inventory
      const inventoryRes = await axios.get('http://localhost:5000/admin/blood-inventory');
      setBloodInventory(inventoryRes.data);

      // Fetch plasma inventory
      try {
        const plasmaRes = await axios.get('http://localhost:5000/admin/plasma-inventory');
        setPlasmaInventory(plasmaRes.data);
        // Calculate total plasma stock and alerts
        const totalPlasmaStock = plasmaRes.data.reduce((total, item) => total + (item.unitsAvailable || 0), 0);
        const plasmaStockAlerts = plasmaRes.data.filter(item => item.unitsAvailable < 5).length;

        setStats(prevStats => ({
          ...prevStats,
          totalPlasmaStock,
          plasmaStockAlerts
        }));
      } catch (plasmaError) {
        console.error('Error fetching plasma inventory:', plasmaError);
        // Set defaults if plasma endpoint fails
        setStats(prevStats => ({
          ...prevStats,
          totalPlasmaStock: 0,
          plasmaStockAlerts: 0
        }));
      }

    } catch (error) {
      console.error('Error fetching admin data:', error);
      // Show error message to user
      alert('Error loading dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (action, userId) => {
    try {
      switch (action) {
        case 'view':
          // You can implement a modal or navigation to user details
          console.log('View user:', userId);
          break;
        case 'edit':
          // Open edit modal or navigate to edit page
          console.log('Edit user:', userId);
          break;
        case 'delete':
          if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            await axios.delete(`http://localhost:5000/admin/users/${userId}`);
            await fetchAdminData(); // Refresh data
            alert('User deleted successfully');
          }
          break;
        case 'activate':
          await axios.patch(`http://localhost:5000/admin/users/${userId}`, { status: 'active' });
          await fetchAdminData();
          break;
        case 'deactivate':
          await axios.patch(`http://localhost:5000/admin/users/${userId}`, { status: 'inactive' });
          await fetchAdminData();
          break;
      }
    } catch (error) {
      console.error('Error performing user action:', error);
      alert('Error performing action. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin');
    window.location.href = '/login';
  };

  const handleAddHospital = async (e) => {
    e.preventDefault();
    try {
      // Remove verified field before sending to backend if you want to not store it
      const hospitalData = { ...newHospital };
      delete hospitalData.verified;

      await axios.post('http://localhost:5000/admin/hospitals', hospitalData);
      setNewHospital({
        name: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
        email: '',
        verified: true
      });
      await fetchAdminData(); // Refresh hospitals list
      alert('Hospital added successfully');
    } catch (error) {
      console.error('Error adding hospital:', error);
      alert('Error adding hospital. Please try again.');
    }
  };

  const handleVerifyHospital = async (hospitalId, verified) => {
    try {
      await axios.patch(`http://localhost:5000/admin/hospitals/${hospitalId}/verify`, { verified });
      await fetchAdminData(); // Refresh hospitals list
      alert(`Hospital ${verified ? 'verified' : 'unverified'} successfully`);
    } catch (error) {
      console.error('Error updating hospital verification:', error);
      alert('Error updating hospital verification. Please try again.');
    }
  };

  const handleDeleteHospital = async (hospitalId) => {
    if (window.confirm('Are you sure you want to delete this hospital? This action cannot be undone.')) {
      try {
        await axios.delete(`http://localhost:5000/admin/hospitals/${hospitalId}`);
        await fetchAdminData(); // Refresh hospitals list
        alert('Hospital deleted successfully');
      } catch (error) {
        console.error('Error deleting hospital:', error);
        alert('Error deleting hospital. Please try again.');
      }
    }
  };



  const handleMatchAction = async (action, matchId) => {
    try {
      switch (action) {
        case 'complete':
          if (window.confirm('Are you sure you want to mark this match as completed?')) {
            await axios.patch(`http://localhost:5000/admin/matches/${matchId}`, { status: 'completed' });
            await fetchAdminData(); // Refresh matches list
            alert('Match marked as completed successfully');
          }
          break;
        case 'view':
          // You can implement a modal or navigation to match details
          console.log('View match:', matchId);
          break;
        case 'contact_donor':
          // You can implement contact functionality
          console.log('Contact donor for match:', matchId);
          break;
        case 'contact_recipient':
          // You can implement contact functionality
          console.log('Contact recipient for match:', matchId);
          break;
      }
    } catch (error) {
      console.error('Error performing match action:', error);
      alert('Error performing action. Please try again.');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className={styles['admin-loading']}>
        <div className={styles['admin-loading-content']}>
          <div className={styles['admin-loading-spinner']}></div>
          <p className={styles['admin-loading-text']}>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <header className={styles['admin-header']}>
        <div className={styles['header-content']}>
          <div className={styles['admin-logo']}>
            <div className={styles['admin-logo-icon']}>
              <Shield size={24} />
            </div>
            <div className={styles['admin-logo-text']}>
              <h1>Admin Dashboard</h1>
              <p>LifeShare Management System</p>
            </div>
          </div>

          <div className={styles['admin-header-actions']}>
            <button className={styles['admin-notification-btn']}>
              <AlertTriangle size={20} />
              <span className={styles['admin-notification-badge']}></span>
            </button>

            <div className={styles['admin-profile-dropdown']} ref={dropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={styles['admin-profile-button']}
              >
                <Shield size={20} />
                <span>Admin</span>
                <ChevronDown size={16} />
              </button>

              {isProfileOpen && (
                <div className={styles['admin-dropdown-menu']}>
                  <div className={styles['admin-dropdown-header']}>
                    <p className={styles['admin-dropdown-user-name']}>System Admin</p>
                    <p className={styles['admin-dropdown-user-email']}>admin@lifeshare.com</p>
                  </div>
                  
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={styles['admin-dropdown-item']}
                  >
                    <Settings size={16} />
                    Settings
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    className={`${styles['admin-dropdown-item']} ${styles['danger']}`}
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className={styles['admin-nav-tabs']}>
        <div className={styles['admin-nav-container']}>
          <nav className={styles['admin-nav-menu']}>
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'matches', label: 'Matches', icon: Heart },
              { id: 'donations', label: 'Donations', icon: Droplet },
              { id: 'requests', label: 'Requests', icon: Heart },
              { id: 'inventory', label: 'Blood Inventory', icon: Droplet },
              { id: 'plasma-inventory', label: 'Plasma Inventory', icon: Droplet },
              { id: 'hospitals', label: 'Hospitals', icon: MapPin },
              { id: 'analytics', label: 'Analytics', icon: PieChart },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${styles['admin-nav-tab']} ${activeTab === tab.id ? styles['active'] : ''}`}
                >
                  <Icon size={20} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className={styles['admin-main-content']}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats Cards */}
            <div className={styles['admin-stats-grid']}>
              {[
                {
                  label: 'Total Users',
                  value: stats.totalUsers || 0,
                  icon: Users,
                  color: '#3b82f6',
                  bg: '#dbeafe',
                  change: '+12%'
                },
                {
                  label: 'Total Donors',
                  value: stats.totalDonors || 0,
                  icon: Heart,
                  color: '#ef4444',
                  bg: '#fee2e2',
                  change: '+8%'
                },
                {
                  label: 'Total Recipients',
                  value: stats.totalRecipients || 0,
                  icon: Users,
                  color: '#8b5cf6',
                  bg: '#ede9fe',
                  change: '+15%'
                },
                {
                  label: 'Total Donations',
                  value: stats.totalDonations || 0,
                  icon: Droplet,
                  color: '#14b8a6',
                  bg: '#d1fae5',
                  change: '+25%'
                },
                {
                  label: 'Total Plasma Stock',
                  value: stats.totalPlasmaStock || 0,
                  icon: Droplet,
                  color: '#8b5cf6',
                  bg: '#ede9fe',
                  change: '+10%'
                },
                {
                  label: 'Pending Requests',
                  value: stats.pendingRequests || 0,
                  icon: Clock,
                  color: '#f59e0b',
                  bg: '#fef3c7',
                  change: '-5%'
                },
                {
                  label: 'Today\'s Donations',
                  value: stats.todayDonations || 0,
                  icon: TrendingUp,
                  color: '#10b981',
                  bg: '#d1fae5',
                  change: '+30%'
                }
              ].map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className={styles['admin-stat-card']}>
                    <div className={styles['admin-stat-header']}>
                      <h3 className={styles['admin-stat-title']}>{stat.label}</h3>
                      <div 
                        className={styles['admin-stat-icon']}
                        style={{ backgroundColor: stat.bg }}
                      >
                        <Icon size={20} style={{ color: stat.color }} />
                      </div>
                    </div>
                    <p className={styles['admin-stat-value']}>
                      {stat.value.toLocaleString()}
                    </p>
                    <p className={`${styles['admin-stat-change']} ${stat.change.startsWith('-') ? styles['negative'] : ''}`}>
                      {stat.change} from last month
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Recent Activity */}
            <div className={styles['admin-activity-feed']}>
              <div className={styles['admin-activity-header']}>
                <h2>Recent Activity</h2>
              </div>
              <div className={styles['admin-activity-content']}>
                <div className={styles['admin-activity-list']}>
                  {donations.slice(0, 5).map((donation, index) => (
                    <div key={index} className={styles['admin-activity-item']}>
                      <div className={styles['admin-activity-icon']}>
                        <Droplet size={20} style={{ color: 'white' }} />
                      </div>
                      <div className={styles['admin-activity-details']}>
                        <h4>New blood donation recorded</h4>
                        <p>
                          {donation.donor_name || 'Unknown Donor'} •
                          {donation.bloodGroup || 'Unknown Type'} •
                          {donation.hospitalName || 'Unknown Hospital'}
                        </p>
                      </div>
                      <div className={styles['admin-activity-time']}>
                        <p>{new Date(donation.donationDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  
                  {requests.slice(0, 3).map((request, index) => (
                    <div key={`request-${index}`} className={styles['admin-activity-item']}>
                      <div className={styles['admin-activity-icon']} style={{ background: '#f59e0b' }}>
                        <Heart size={20} style={{ color: 'white' }} />
                      </div>
                      <div className={styles['admin-activity-details']}>
                        <h4>New blood request received</h4>
                        <p>
                          {request.recipient_name || 'Unknown Recipient'} •
                          {request.requestedGroup || 'Unknown Type'} •
                          {request.status}
                        </p>
                      </div>
                      <div className={styles['admin-activity-time']}>
                        <p>{new Date(request.requestDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}

                  {donations.length === 0 && requests.length === 0 && (
                    <div className={styles['admin-empty-state']}>
                      <Activity size={48} />
                      <h3>No Recent Activity</h3>
                      <p>Recent donations and requests will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            {/* Search and Filter */}
            <div className={styles['admin-search-section']}>
              <div className={styles['admin-search-filters']}>
                <div className={styles['admin-search-input']}>
                  <Search size={20} className={styles['admin-search-icon']} />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className={styles['admin-filter-select']}
                >
                  <option value="all">All Roles</option>
                  <option value="donor">Donors</option>
                  <option value="recipient">Recipients</option>
                </select>
              </div>
              <button className={styles['admin-add-button']}>
                <Plus size={18} />
                Add User
              </button>
            </div>

            {/* Users Table */}
            <div className={styles['admin-table-container']}>
              <div className={styles['admin-table-wrapper']}>
                <table className={styles['admin-table']}>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Blood Group</th>
                      <th>Location</th>
                      <th>Contact</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => (
                      <tr key={user.id}>
                        <td>
                          <div className={styles['admin-user-info']}>
                            <h4>{user.fullName}</h4>
                            <p>{user.email}</p>
                          </div>
                        </td>
                        <td>
                          <span className={`${styles['admin-role-badge']} ${styles[user.role]}`}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          {user.displayBloodGroup || user.bloodGroup || user.requiredBloodGroup || 'N/A'}
                        </td>
                        <td>
                          {user.city ? `${user.city}, ${user.state}` : 'Not specified'}
                        </td>
                        <td>
                          <div style={{ fontSize: '0.875rem' }}>
                            <div>{user.phoneNumber || 'N/A'}</div>
                          </div>
                        </td>
                        <td>
                          <span className={`${styles['admin-status-badge']} ${styles['active']}`}>
                            Active
                          </span>
                        </td>
                        <td>
                          <div className={styles['admin-action-buttons']}>
                            <button
                              onClick={() => handleUserAction('view', user.id)}
                              className={styles['admin-action-btn']}
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleUserAction('edit', user.id)}
                              className={styles['admin-action-btn']}
                              title="Edit User"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleUserAction('delete', user.id)}
                              className={`${styles['admin-action-btn']} ${styles['danger']}`}
                              title="Delete User"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredUsers.length === 0 && (
                <div className={styles['admin-empty-state']}>
                  <Users size={48} />
                  <h3>No Users Found</h3>
                  <p>Try adjusting your search or filter criteria</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Matches Tab */}
        {activeTab === 'matches' && (
          <div>
            <div className={styles['admin-table-container']}>
              <div className={styles['admin-activity-header']}>
                <h2>Donor-Recipient Matches</h2>
              </div>
              <div className={styles['admin-table-wrapper']}>
                <table className={styles['admin-table']}>
                  <thead>
                    <tr>
                      <th>Donor</th>
                      <th>Recipient</th>
                      <th>Blood Group</th>
                      <th>Location</th>
                      <th>Match Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((match) => (
                  <tr key={match.id}>
                    <td>
                      <div className={styles['admin-user-info']}>
                        <h4>{match.donor?.fullName || 'Unknown Donor'}</h4>
                        <p>{match.donor?.email || 'N/A'}</p>
                      </div>
                    </td>
                    <td>
                      <div className={styles['admin-user-info']}>
                        <h4>{match.recipient?.fullName || 'Unknown Recipient'}</h4>
                        <p>{match.recipient?.email || 'N/A'}</p>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles['admin-role-badge']} ${styles['donor']}`}>
                        {match.bloodGroup || 'N/A'}
                      </span>
                    </td>
                    <td>
                      {match.recipient?.city ? `${match.recipient.city}, ${match.recipient.state}` : 'Not specified'}
                    </td>
                    <td>{match.matchDate ? new Date(match.matchDate).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <span className={`${styles['admin-status-badge']} ${match.status === 'completed' ? styles['active'] : styles['inactive']}`}>
                        {match.status || 'pending'}
                      </span>
                    </td>
                    <td>
                      <div className={styles['admin-action-buttons']}>
                        <button
                          onClick={() => handleMatchAction('view', match.id)}
                          className={styles['admin-action-btn']}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleMatchAction('contact_donor', match.id)}
                          className={styles['admin-action-btn']}
                          title="Contact Donor"
                        >
                          <Phone size={16} />
                        </button>
                        <button
                          onClick={() => handleMatchAction('contact_recipient', match.id)}
                          className={styles['admin-action-btn']}
                          title="Contact Recipient"
                        >
                          <Mail size={16} />
                        </button>
                        {match.status === 'pending' && (
                          <button
                            onClick={() => handleMatchAction('complete', match.id)}
                            className={`${styles['admin-action-btn']} ${styles['success']}`}
                            title="Mark as Completed"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {matches.length === 0 && (
                <div className={styles['admin-empty-state']}>
                  <Heart size={48} />
                  <h3>No Matches Found</h3>
                  <p>Donor-recipient matches will appear here once the matching algorithm runs</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Donations Tab */}
        {activeTab === 'donations' && (
          <div>
            <div className={styles['admin-table-container']}>
              <div className={styles['admin-activity-header']}>
                <h2>All Blood Donations</h2>
              </div>
              <div className={styles['admin-table-wrapper']}>
                <table className={styles['admin-table']}>
                  <thead>
                    <tr>
                      <th>Donor</th>
                      <th>Blood Group</th>
                      <th>Hospital</th>
                      <th>Donation Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map((donation) => (
                      <tr key={donation._id}>
                        <td>
                          <div className={styles['admin-user-info']}>
                            <h4>{donation.donor_name || 'Unknown'}</h4>
                            <p>{donation.donor_email || 'N/A'}</p>
                          </div>
                        </td>
                        <td>
                          <span className={`${styles['admin-role-badge']} ${styles['donor']}`}>
                            {donation.bloodGroup || 'N/A'}
                          </span>
                        </td>
                        <td>{donation.hospitalName || 'Not specified'}</td>
                        <td>{donation.donationDate ? new Date(donation.donationDate).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <span className={`${styles['admin-status-badge']} ${styles['active']}`}>
                            Completed
                          </span>
                        </td>
                        <td>
                          <div className={styles['admin-action-buttons']}>
                            <button className={styles['admin-action-btn']} title="View Details">
                              <Eye size={16} />
                            </button>
                            <button className={styles['admin-action-btn']} title="Download Certificate">
                              <Download size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {donations.length === 0 && (
                <div className={styles['admin-empty-state']}>
                  <Droplet size={48} />
                  <h3>No Donations Found</h3>
                  <p>Donation records will appear here once users start donating</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div>
            <div className={styles['admin-table-container']}>
              <div className={styles['admin-activity-header']}>
                <h2>Blood Requests</h2>
              </div>
              <div className={styles['admin-table-wrapper']}>
                <table className={styles['admin-table']}>
                  <thead>
                    <tr>
                      <th>Recipient</th>
                      <th>Blood Group Needed</th>
                      <th>Location</th>
                      <th>Request Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request) => (
                      <tr key={request.id}>
                        <td>
                          <div className={styles['admin-user-info']}>
                            <h4>{request.recipient_name || 'Unknown'}</h4>
                            <p>{request.recipient_email || 'N/A'}</p>
                          </div>
                        </td>
                        <td>
                          <span className={`${styles['admin-role-badge']} ${styles['recipient']}`}>
                            {request.requested_group || 'N/A'}
                          </span>
                        </td>
                        <td>{request.city ? `${request.city}, ${request.state}` : 'Not specified'}</td>
                        <td>{new Date(request.requestDate).toLocaleDateString()}</td>
                        <td>
                          <span className={`${styles['admin-status-badge']} ${request.status === 'pending' ? styles['inactive'] : styles['active']}`}>
                            {request.status || 'pending'}
                          </span>
                        </td>
                        <td>
                          <div className={styles['admin-action-buttons']}>
                            <button className={styles['admin-action-btn']} title="View Details">
                              <Eye size={16} />
                            </button>
                            <button className={styles['admin-action-btn']} title="Find Matches">
                              <Search size={16} />
                            </button>
                            {request.status === 'pending' && (
                              <button className={styles['admin-action-btn']} title="Mark as Fulfilled">
                                <CheckCircle size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {requests.length === 0 && (
                <div className={styles['admin-empty-state']}>
                  <Heart size={48} />
                  <h3>No Blood Requests</h3>
                  <p>Blood requests from recipients will appear here</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Blood Inventory Tab */}
        {activeTab === 'inventory' && (
          <div>
            <div className={styles['admin-table-container']}>
              <div className={styles['admin-activity-header']}>
                <h2>Blood Inventory</h2>
              </div>
              <div className={styles['admin-table-wrapper']}>
                <table className={styles['admin-table']}>
                  <thead>
                    <tr>
                      <th>Hospital</th>
                      <th>Blood Group</th>
                      <th>Quantity</th>
                      <th>Expiry Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bloodInventory.map((item) => (
                      <tr key={item._id || item.id}>
                        <td>{item.hospitalName || item.hospital?.name || 'N/A'}</td>
                        <td>
                          <span className={`${styles['admin-role-badge']} ${styles['donor']}`}>
                            {item.bloodGroup || 'N/A'}
                          </span>
                        </td>
                        <td>{item.quantity || 0} units</td>
                        <td>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <span className={`${styles['admin-status-badge']} ${item.quantity > 5 ? styles['active'] : styles['inactive']}`}>
                            {item.quantity > 5 ? 'Available' : 'Low Stock'}
                          </span>
                        </td>
                        <td>
                          <div className={styles['admin-action-buttons']}>
                            <button className={styles['admin-action-btn']} title="View Details">
                              <Eye size={16} />
                            </button>
                            <button className={styles['admin-action-btn']} title="Update Stock">
                              <Edit size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {bloodInventory.length === 0 && (
                <div className={styles['admin-empty-state']}>
                  <Droplet size={48} />
                  <h3>No Blood Inventory</h3>
                  <p>Blood inventory records will appear here as hospitals update their stock</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Plasma Inventory Tab */}
        {activeTab === 'plasma-inventory' && (
          <div>
            <div className={styles['admin-table-container']}>
              <div className={styles['admin-activity-header']}>
                <h2>Plasma Inventory</h2>
              </div>
              <div className={styles['admin-table-wrapper']}>
                <table className={styles['admin-table']}>
                  <thead>
                    <tr>
                      <th>Hospital</th>
                      <th>Blood Group</th>
                      <th>Units Available</th>
                      <th>Expiry Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plasmaInventory.map((item) => (
                      <tr key={item._id || item.id}>
                        <td>{item.hospitalName || item.hospital?.name || 'N/A'}</td>
                        <td>
                          <span className={`${styles['admin-role-badge']} ${styles['donor']}`}>
                            {item.bloodGroup || 'N/A'}
                          </span>
                        </td>
                        <td>{item.unitsAvailable || 0} units</td>
                        <td>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <span className={`${styles['admin-status-badge']} ${item.unitsAvailable > 5 ? styles['active'] : styles['inactive']}`}>
                            {item.unitsAvailable > 5 ? 'Available' : 'Low Stock'}
                          </span>
                        </td>
                        <td>
                          <div className={styles['admin-action-buttons']}>
                            <button className={styles['admin-action-btn']} title="View Details">
                              <Eye size={16} />
                            </button>
                            <button className={styles['admin-action-btn']} title="Update Stock">
                              <Edit size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {plasmaInventory.length === 0 && (
                <div className={styles['admin-empty-state']}>
                  <Droplet size={48} />
                  <h3>No Plasma Inventory</h3>
                  <p>Plasma inventory records will appear here as hospitals update their stock</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="admin-empty-state">
            <PieChart size={64} />
            <h3>Analytics Dashboard</h3>
            <p>Detailed analytics and reports will be available here</p>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
              Features include donation trends, blood group distribution, regional statistics, and more
            </p>
          </div>
        )}

        {/* Hospitals Tab */}
        {activeTab === 'hospitals' && (
          <div>
            <div className={styles['admin-table-container']}>
              <div className={styles['admin-activity-header']}>
                <h2>Hospitals Management</h2>
              </div>
              <div className={styles['admin-table-wrapper']}>
                <table className={styles['admin-table']}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Address</th>
                      <th>City</th>
                      <th>State</th>
                      <th>Pincode</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Verified</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hospitals.map((hospital) => (
                      <tr key={hospital._id}>
                        <td>{hospital.name}</td>
                        <td>{hospital.address}</td>
                        <td>{hospital.city}</td>
                        <td>{hospital.state}</td>
                        <td>{hospital.pincode}</td>
                        <td>{hospital.phone || 'N/A'}</td>
                        <td>{hospital.email || 'N/A'}</td>
                        <td>
                          {hospital.verified ? (
                            <span className={`${styles['admin-status-badge']} ${styles['active']}`}>Yes</span>
                          ) : (
                            <span className={`${styles['admin-status-badge']} ${styles['inactive']}`}>No</span>
                          )}
                        </td>
                        <td>
                          <div className={styles['admin-action-buttons']}>
                            <button
                              onClick={() => handleVerifyHospital(hospital._id, !hospital.verified)}
                              className={`${styles['admin-action-btn']} ${hospital.verified ? styles['danger'] : styles['success']}`}
                              title={hospital.verified ? 'Unverify Hospital' : 'Verify Hospital'}
                            >
                              {hospital.verified ? <XCircle size={16} /> : <CheckCircle size={16} />}
                            </button>
                            <button
                              onClick={() => handleDeleteHospital(hospital._id)}
                              className={`${styles['admin-action-btn']} ${styles['danger']}`}
                              title="Delete Hospital"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles['admin-add-section']}>
                <h3>Add New Hospital</h3>
                <form onSubmit={handleAddHospital}>
                  <input
                    type="text"
                    placeholder="Name"
                    value={newHospital.name}
                    onChange={(e) => setNewHospital({ ...newHospital, name: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Address"
                    value={newHospital.address}
                    onChange={(e) => setNewHospital({ ...newHospital, address: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={newHospital.city}
                    onChange={(e) => setNewHospital({ ...newHospital, city: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={newHospital.state}
                    onChange={(e) => setNewHospital({ ...newHospital, state: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Pincode"
                    value={newHospital.pincode}
                    onChange={(e) => setNewHospital({ ...newHospital, pincode: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={newHospital.phone}
                    onChange={(e) => setNewHospital({ ...newHospital, phone: e.target.value })}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newHospital.email}
                    onChange={(e) => setNewHospital({ ...newHospital, email: e.target.value })}
                  />
                  <button type="submit" className={`${styles['admin-btn']} ${styles['success']}`}>
                    Add Hospital
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

         

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className={styles['admin-empty-state']}>
            <Settings size={64} />
            <h3>System Settings</h3>
            <p>Configure system preferences and administrative settings</p>
            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`}>
                <Database size={16} style={{ marginRight: '0.5rem' }} />
                Database Settings
              </button>
              <button className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`}>
                <Mail size={16} style={{ marginRight: '0.5rem' }} />
                Email Configuration
              </button>
              <button className={`${styles['admin-btn']} ${styles['admin-btn-secondary']}`}>
                <Shield size={16} style={{ marginRight: '0.5rem' }} />
                Security Settings
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;