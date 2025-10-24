import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styles from '../css/recipientheader.module.css';
import {
  Bell,
  User,
  Droplet,
  ChevronDown,
  Settings,
  Info,
  FileText,
  LogOut,
  Menu,
  X,
  Search,
  HelpCircle
} from 'lucide-react';

const DashboardHeader = ({
  activeTab = "dashboard",
  setActiveTab = () => {},
  userRole = "recipient",
  onNavigate = () => {},
  showSearch = true,
  showNotifications = true,
  displayName: propDisplayName,
  displayBloodGroup: propDisplayBloodGroup
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(3);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState('');
  
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Fetch notifications from database
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        setUser(storedUser);
        if (storedUser && storedUser.id) {
          // Fetch profile image
          try {
            const profileResponse = await axios.get(`http://localhost:5000/user/${storedUser.id}`);
            setProfileImage(profileResponse.data.profileImage || '');
          } catch (error) {
            console.error('Error fetching profile image:', error);
          }

          // Fetch notifications
          const notificationsResponse = await axios.get(`http://localhost:5000/notifications/${storedUser.id}`);
          setNotifications(notificationsResponse.data);

          // Fetch unread count
          const unreadResponse = await axios.get(`http://localhost:5000/notifications/${storedUser.id}/unread-count`);
          setUnreadCount(unreadResponse.data.count);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
        // Fallback to empty state if API fails
        setNotifications([]);
        setUnreadCount(0);
      }
    };

    fetchNotifications();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsProfileOpen(false);
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      // Call API to mark as read
      await axios.patch(`http://localhost:5000/notifications/${notificationId}/read`);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = () => {
    setIsNotificationOpen(!isNotificationOpen);
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleProfileClick = () => {
    setIsProfileOpen(!isProfileOpen);
    setIsNotificationOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleMobileMenuClick = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    setIsProfileOpen(false);
    setIsNotificationOpen(false);
  };

  const handleMenuItemClick = (item) => {
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
    
    switch(item) {
      case 'Profile':
        onNavigate('/update-profile');
        break;
      case 'Settings':
        onNavigate('/settings');
        break;
      case 'Help':
        onNavigate('/help');
        break;
      case 'About':
        onNavigate('/about');
        break;
      case 'Logout':
        localStorage.removeItem("user");
        window.location.href = "/login"; 
        break;
      default:
        break;
    }
  };

  const getNavigationItems = () => {
    let items;
    if (userRole === "recipient") {
      items = [
        { key: 'dashboard', label: 'Dashboard', link: '/recipient-dashboard' },
        { key: 'requests', label: 'My Requests', tab: true },
        { key: 'donors', label: 'Find Donors', link: '/find-donor' },
        { key: 'history', label: 'History', link: '/recipient-history' },
        { key: 'medical', label: 'Medical Info', tab: true }
      ];
    } else {
      if (activeTab === "") {
        // When not in dashboard, use links for navigation
        items = [
          { key: 'overview', label: 'Dashboard', link: '/dashboard' },
          { key: 'history', label: 'Donation History', link: '/donation-history' },
          { key: 'appointments', label: 'Appointments', link: '/book-donation-slot' },
          { key: 'requests', label: 'Blood Requests', link: '/blood-request-form' },
        ];
      } else {
        // In dashboard, use tabs
        items = [
          { key: 'overview', label: 'Dashboard', tab: true },
          { key: 'history', label: 'Donation History', tab: true },
          { key: 'appointments', label: 'Appointments', tab: true },
          { key: 'requests', label: 'Blood Requests', tab: true },
        ];
      }
    }
    return items;
  };

  const navigationItems = getNavigationItems();

  const handleNavClick = (item, e) => {
    e.preventDefault();
    if (item.tab) {
      setActiveTab(item.key);
    } else {
      onNavigate(item.link);
    }
    setIsMobileMenuOpen(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Search query:', searchQuery);
      // Handle search functionality
    }
  };

  const displayName = propDisplayName || user?.name || 'User';
  const displayBloodGroup = propDisplayBloodGroup || (userRole === 'recipient' ? (user?.requiredBloodGroup || 'N/A') : (user?.bloodGroup || 'N/A'));

  return (
    <header className={styles['saas-header']}>
      <div className={styles['header-container']}>
        {/* Logo Section */}
        <div className={styles['header-brand']} onClick={() => onNavigate(userRole === "recipient" ? '/recipient-dashboard' : '/dashboard')}>
          <div className={styles['brand-icon']}>
            <Droplet size={24} />
          </div>
          <span className={styles['brand-text']}>LifeShare</span>
        </div>



        {/* Desktop Navigation */}
        <nav className={`${styles['header-nav']} ${styles['desktop-only']}`}>
          {navigationItems.slice(0, 4).map((item) => (
            <button
              key={item.key}
              className={`${styles['nav-item']} ${activeTab === item.key ? styles.active : ''}`}
              onClick={(e) => handleNavClick(item, e)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Header Actions */}
        <div className={styles['header-actions']}>
          {/* Help Button - Desktop Only */}
          <button
            className={`${styles['action-btn']} ${styles['help-btn']} ${styles['desktop-only']}`}
            onClick={() => handleMenuItemClick('Help')}
            title="Help & Support"
          >
            <HelpCircle size={20} />
          </button>

          {/* Notifications */}
          {showNotifications && (
            <div className={styles['notification-container']} ref={notificationRef}>
              <button
                className={`${styles['action-btn']} ${styles['notification-btn']}`}
                onClick={handleNotificationClick}
                title="Notifications"
              >
                <div className={styles['bell-icon-container']}>
                  <Bell size={20} />
                </div>
                {unreadCount > 0 && (
                  <span className={styles['notification-badge']}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>

              {/* Notification Dropdown */}
              {isNotificationOpen && (
                <div className={styles['notification-dropdown']}>
                  <div className={styles['dropdown-header']}>
                    <h3>Notifications</h3>
                    {unreadCount > 0 && (
                      <span className={styles['unread-count']}>{unreadCount} new</span>
                    )}
                  </div>
                  <div className={styles['notification-list']}>
                    {notifications.length === 0 ? (
                      <div className={styles['empty-state']}>
                        <Bell size={24} />
                        <p>No notifications</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification._id}
                          className={`${styles['notification-item']} ${!notification.isRead ? styles.unread : ''}`}
                          onClick={() => markAsRead(notification._id)}
                        >
                          <div className={styles['notification-content']}>
                            {notification.title && (
                              <p className={styles['notification-title']}>{notification.title}</p>
                            )}
                            <p className={styles['notification-message']}>{notification.message}</p>
                            <span className={styles['notification-time']}>
                              {new Date(notification.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          {!notification.isRead && <div className={styles['unread-dot']}></div>}
                        </div>
                      ))
                    )}
                  </div>
                  <div className={styles['dropdown-footer']}>
                    <button
                      className={styles['view-all-btn']}
                      onClick={() => {
                        setIsNotificationOpen(false);
                        onNavigate('/notifications');
                      }}
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Profile Dropdown */}
          <div className={styles['profile-container']} ref={dropdownRef}>
            <button className={styles['profile-btn']} onClick={handleProfileClick}>
              <div className={styles['profile-avatar']}>
                {profileImage ? <img src={profileImage} alt="Profile" className={styles['profile-avatar-img']} /> : <User size={18} />}
              </div>
              <div className={`${styles['profile-info']} ${styles['desktop-only']}`}>
                <span className={styles['profile-name']}>{displayName}</span>
                <span className={styles['profile-role']}>{displayBloodGroup}</span>
              </div>
              <ChevronDown size={16} className={`${styles['profile-chevron']} ${isProfileOpen ? styles.rotated : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className={styles['profile-dropdown']}>
                <div className={styles['dropdown-header']}>
                  <div className={styles['user-info']}>
                    <div className={styles['user-avatar']}>
                      {profileImage ? <img src={profileImage} alt="Profile" className={styles['profile-avatar-img']} /> : <User size={20} />}
                    </div>
                    <div className={styles['user-details']}>
                      <p className={styles['user-name']}>{displayName}</p>
                      <p className={styles['user-email']}>
                        {userRole === "recipient" ? `Needs: ${displayBloodGroup}` : `Type: ${displayBloodGroup}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={styles['dropdown-menu']}>
                  <button onClick={() => handleMenuItemClick('Profile')} className={styles['menu-item']}>
                    <User size={16} />
                    <span>Profile Settings</span>
                  </button>

                

                  <button onClick={() => handleMenuItemClick('Help')} className={styles['menu-item']}>
                    <HelpCircle size={16} />
                    <span>Help & Support</span>
                  </button>

                

                  <div className={styles['menu-divider']}></div>

                  <button onClick={() => handleMenuItemClick('Logout')} className={`${styles['menu-item']} ${styles.logout}`}>
                    <LogOut size={16} />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button className={`${styles['mobile-menu-btn']} ${styles['mobile-only']}`} onClick={handleMobileMenuClick}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className={styles['mobile-nav']} ref={mobileMenuRef}>
            <div className={styles['mobile-nav-content']}>
              {/* Search Bar - Mobile */}
              {showSearch && (
                <div className={styles['mobile-search']}>
                  <form onSubmit={handleSearchSubmit} className={styles['search-form']}>
                    <div className={styles['search-input-wrapper']}>
                      <Search size={18} className={styles['search-icon']} />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles['search-input']}
                      />
                    </div>
                  </form>
                </div>
              )}

              {/* Mobile Navigation Items */}
              <nav className={styles['mobile-nav-items']}>
                {navigationItems.map((item) => (
                  <button
                    key={item.key}
                    className={`${styles['mobile-nav-item']} ${activeTab === item.key ? styles.active : ''}`}
                    onClick={(e) => handleNavClick(item, e)}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default DashboardHeader;
