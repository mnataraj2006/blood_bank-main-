import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styles from '../css/recipientheader.module.css';
import {
  Bell, User, Droplet, ChevronDown, LogOut, Menu, X,
  Search, HelpCircle, Home, Calendar, Clock, Heart,
  Activity, MapPin, FileText, Settings, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DONOR_NAV = [
  { key: 'overview',      label: 'Dashboard',       icon: Home,       tab: true },
  { key: 'history',       label: 'Donation History', icon: Clock,      tab: true },
  { key: 'appointments',  label: 'Appointments',     icon: Calendar,   tab: true },
  { key: 'requests',      label: 'Blood Requests',   icon: Heart,      tab: true },
];

const RECIPIENT_NAV = [
  { key: 'dashboard', label: 'Dashboard',   icon: Home,     link: '/recipient-dashboard' },
  { key: 'requests',  label: 'My Requests', icon: FileText, tab: true },
  { key: 'donors',    label: 'Find Donors', icon: MapPin,   link: '/find-donor' },
  { key: 'history',   label: 'History',     link: '/recipient-history', icon: Clock },
  { key: 'medical',   label: 'Medical Info', icon: Activity, tab: true },
];

const DashboardHeader = ({
  activeTab = 'overview',
  setActiveTab = () => {},
  userRole = 'recipient',
  onNavigate = () => {},
  showSearch = true,
  showNotifications = true,
  displayName: propDisplayName,
  displayBloodGroup: propDisplayBloodGroup,
  pageTitle,
}) => {
  const [profileOpen,       setProfileOpen]       = useState(false);
  const [notifOpen,         setNotifOpen]         = useState(false);
  const [mobileOpen,        setMobileOpen]        = useState(false);
  const [notifications,     setNotifications]     = useState([]);
  const [unreadCount,       setUnreadCount]       = useState(0);
  const [searchQuery,       setSearchQuery]       = useState('');
  const [user,              setUser]              = useState(null);
  const [profileImage,      setProfileImage]      = useState('');

  const notifRef   = useRef(null);
  const profileRef = useRef(null);

  const API = import.meta.env.VITE_API_URL || 'https://blood-bank-backend.onrender.com';

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    setUser(storedUser);
    if (!storedUser?.id) return;

    axios.get(`${API}/user/${storedUser.id}`)
      .then(r => setProfileImage(r.data.profileImage || ''))
      .catch(() => {});

    axios.get(`${API}/notifications/${storedUser.id}`)
      .then(r => setNotifications(r.data || []))
      .catch(() => {});

    axios.get(`${API}/notifications/${storedUser.id}/unread-count`)
      .then(r => setUnreadCount(r.data.count || 0))
      .catch(() => {});
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id) => {
    try {
      await axios.patch(`${API}/notifications/${id}/read`);
      setNotifications(p => p.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(p => Math.max(0, p - 1));
    } catch {}
  };

  const handleNav = (item, e) => {
    e?.preventDefault();
    if (item.tab)  setActiveTab(item.key);
    else           onNavigate(item.link);
    setMobileOpen(false);
  };

  const handleMenu = (item) => {
    setProfileOpen(false);
    if (item === 'Profile')   onNavigate('/update-profile');
    else if (item === 'Help') onNavigate('/help');
    else if (item === 'Logout') {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  const navItems     = userRole === 'recipient' ? RECIPIENT_NAV : DONOR_NAV;
  const displayName  = propDisplayName || user?.name || 'User';
  const displayGroup = propDisplayBloodGroup || (userRole === 'recipient' ? user?.requiredBloodGroup : user?.bloodGroup) || 'N/A';
  const initials     = displayName.charAt(0).toUpperCase();
  const resolvedTitle = pageTitle || (navItems.find(n => n.key === activeTab)?.label) || 'Dashboard';

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className={styles.sidebarHeader}>
        <div className={styles.brandLink} onClick={() => onNavigate(userRole === 'recipient' ? '/recipient-dashboard' : '/dashboard')} style={{ cursor: 'pointer' }}>
          <div className={styles.brandIcon}><Droplet size={18} /></div>
          <span className={styles.brandName}>LifeShare</span>
        </div>
      </div>

      {/* Nav */}
      <nav className={styles.navSection}>
        <div className={styles.navLabel}>Navigation</div>
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              className={`${styles.navItem} ${activeTab === item.key ? styles.active : ''}`}
              onClick={(e) => handleNav(item, e)}
            >
              <Icon size={18} />
              <span className={styles.navItemLabel}>{item.label}</span>
            </button>
          );
        })}

        <div className={styles.navLabel} style={{ marginTop: 'var(--space-6)' }}>Quick Links</div>
        <button className={styles.navItem} onClick={() => onNavigate('/help')}>
          <HelpCircle size={18} />
          <span className={styles.navItemLabel}>Help & Support</span>
        </button>
        <button className={styles.navItem} onClick={() => onNavigate('/notifications')}>
          <Bell size={18} />
          <span className={styles.navItemLabel}>Notifications</span>
          {unreadCount > 0 && <span className={styles.navBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>
      </nav>

      {/* User footer */}
      <div className={styles.sidebarFooter}>
        <div className={styles.sidebarUser} onClick={() => handleMenu('Profile')}>
          <div className={styles.userAvatar}>
            {profileImage ? <img src={profileImage} alt="" /> : initials}
          </div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{displayName}</div>
            <div className={styles.userRole}>{userRole === 'recipient' ? `Needs: ${displayGroup}` : `Type: ${displayGroup}`}</div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className={styles.sidebar} id="main-sidebar">
        <SidebarContent />
      </aside>

      {/* ── MOBILE OVERLAY ── */}
      <div className={`${styles.mobileOverlay} ${mobileOpen ? styles.open : ''}`} onClick={() => setMobileOpen(false)} />
      <aside className={`${styles.sidebar} ${styles.mobileSidebar} ${mobileOpen ? styles.open : ''}`} style={{ position: 'fixed' }}>
        <div style={{ position: 'absolute', top: 16, right: 16 }}>
          <button className={styles.collapseBtn} onClick={() => setMobileOpen(false)}><X size={16} /></button>
        </div>
        <SidebarContent />
      </aside>

      {/* ── TOP BAR ── */}
      <header className={styles.topbar}>
        {/* Left */}
        <div className={styles.topbarLeft}>
          {/* Mobile menu toggle */}
          <button className={styles.mobileMenuToggle} onClick={() => setMobileOpen(true)} style={{ display: 'none' }}>
            <Menu size={20} />
          </button>
          <h1 className={styles.pageTitle}>{resolvedTitle}</h1>
        </div>

        {/* Right */}
        <div className={styles.topbarRight}>
          {/* Search */}
          {showSearch && (
            <div className={styles.searchWrapper}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          )}

          {/* Notifications */}
          {showNotifications && (
            <div className={styles.notifContainer} ref={notifRef}>
              <button className={styles.iconBtn} onClick={() => setNotifOpen(p => !p)} title="Notifications">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className={styles.notifBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>

              {notifOpen && (
                <div className={styles.notifDropdown}>
                  <div className={styles.notifHeader}>
                    <h3>Notifications</h3>
                    {unreadCount > 0 && <span className={styles.notifCount}>{unreadCount} new</span>}
                  </div>
                  <div className={styles.notifList}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        <Bell size={28} style={{ margin: '0 auto var(--space-3)', opacity: 0.4 }} />
                        <p>No notifications yet</p>
                      </div>
                    ) : notifications.slice(0, 8).map(n => (
                      <div
                        key={n._id}
                        className={`${styles.notifItem} ${!n.isRead ? styles.unread : ''}`}
                        onClick={() => markRead(n._id)}
                      >
                        {!n.isRead && <div className={styles.notifDot} />}
                        <div className={styles.notifText}>
                          {n.title && <p className={styles.notifTitle}>{n.title}</p>}
                          <p className={styles.notifMsg}>{n.message}</p>
                          <span className={styles.notifTime}>
                            {new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={styles.notifFooter}>
                    <button className={styles.viewAllBtn} onClick={() => { setNotifOpen(false); onNavigate('/notifications'); }}>
                      View all notifications →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Profile */}
          <div className={styles.profileContainer} ref={profileRef}>
            <button className={styles.profileBtn} onClick={() => setProfileOpen(p => !p)}>
              <div className={styles.profileAvatar}>
                {profileImage ? <img src={profileImage} alt="" /> : initials}
              </div>
              <span className={styles.profileName}>{displayName}</span>
              <ChevronDown size={14} className={`${styles.profileChevron} ${profileOpen ? styles.open : ''}`} />
            </button>

            {profileOpen && (
              <div className={styles.profileDropdown}>
                <div className={styles.dropdownHeader}>
                  <div className={styles.dropUserAvatar}>
                    {profileImage ? <img src={profileImage} alt="" /> : initials}
                  </div>
                  <div>
                    <p className={styles.dropUserName}>{displayName}</p>
                    <p className={styles.dropUserEmail}>{userRole === 'recipient' ? `Needs: ${displayGroup}` : `Type: ${displayGroup}`}</p>
                  </div>
                </div>
                <div className={styles.dropdownMenu}>
                  <button className={styles.menuItem} onClick={() => handleMenu('Profile')}>
                    <User size={16} /> Profile Settings
                  </button>
                  <button className={styles.menuItem} onClick={() => handleMenu('Help')}>
                    <HelpCircle size={16} /> Help & Support
                  </button>
                  <div className={styles.menuDivider} />
                  <button className={`${styles.menuItem} ${styles.logoutItem}`} onClick={() => handleMenu('Logout')}>
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default DashboardHeader;
