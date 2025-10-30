import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from '../css/notifications.module.css';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (!storedUser) {
        setError('User not logged in');
        return;
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'https://blood-bank-backend.onrender.com'}/notifications/${storedUser.id}`);
      setNotifications(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.patch(`${process.env.REACT_APP_API_URL || 'https://blood-bank-backend.onrender.com'}/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      await Promise.all(
        unreadNotifications.map(notif =>
          axios.patch(`${process.env.REACT_APP_API_URL || 'https://blood-bank-backend.onrender.com'}/notifications/${notif._id}/read`)
        )
      );
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, isRead: true }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const deleteNotification = async (notificationId, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL || 'https://blood-bank-backend.onrender.com'}/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'read') return notification.isRead;
    if (filter === 'unread') return !notification.isRead;
    return true;
  });

  const getNotificationIcon = (type) => {
    const icons = {
      donor_accepted: '✅',
      request_accepted: '🎉',
      donation_completed: '🩸',
      appointment_reminder: '📅',
      response_accepted: '💬',
    };
    return icons[type] || '🔔';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingWrapper}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorWrapper}>
          <div className={styles.errorIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
              <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2"/>
              <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2"/>
            </svg>
          </div>
          <h2 className={styles.errorTitle}>Unable to Load Notifications</h2>
          <p className={styles.errorMessage}>{error}</p>
          <button onClick={fetchNotifications} className={styles.retryBtn}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>Notifications</h1>
          {unreadCount > 0 && (
            <span className={styles.unreadCount}>{unreadCount}</span>
          )}
        </div>

        <div className={styles.headerActions}>
          <div className={styles.filterGroup}>
            <button
              className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
              onClick={() => setFilter('all')}
            >
              All
              <span className={styles.filterCount}>{notifications.length}</span>
            </button>
            <button
              className={`${styles.filterBtn} ${filter === 'unread' ? styles.active : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread
              <span className={styles.filterCount}>{unreadCount}</span>
            </button>
            <button
              className={`${styles.filterBtn} ${filter === 'read' ? styles.active : ''}`}
              onClick={() => setFilter('read')}
            >
              Read
              <span className={styles.filterCount}>{notifications.filter(n => n.isRead).length}</span>
            </button>
          </div>

          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className={styles.markAllBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12" strokeWidth="2"/>
              </svg>
              Mark all as read
            </button>
          )}
        </div>
      </div>

      <div className={styles.notificationsList}>
        {filteredNotifications.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeWidth="2"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeWidth="2"/>
              </svg>
            </div>
            <h3 className={styles.emptyTitle}>
              {filter === 'all' ? 'No notifications yet' :
               filter === 'unread' ? 'All caught up!' :
               'No read notifications'}
            </h3>
            <p className={styles.emptyDescription}>
              {filter === 'all' ? "You'll see notifications here when there's activity." :
               filter === 'unread' ? "You've read all your notifications." :
               "Notifications you've read will appear here."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification._id}
              className={`${styles.notificationCard} ${!notification.isRead ? styles.unread : ''}`}
              onClick={() => !notification.isRead && markAsRead(notification._id)}
            >
              <div className={styles.notificationIconWrapper}>
                <span className={styles.notificationIcon}>
                  {getNotificationIcon(notification.type)}
                </span>
              </div>

              <div className={styles.notificationBody}>
                {notification.title && (
                  <h4 className={styles.notificationTitle}>{notification.title}</h4>
                )}
                <p className={styles.notificationMessage}>{notification.message}</p>

                <div className={styles.notificationMetaGroup}>
                  {notification.hospitalName && (
                    <span className={styles.metaItem}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" strokeWidth="2"/>
                        <polyline points="2 17 12 22 22 17" strokeWidth="2"/>
                        <polyline points="2 12 12 17 22 12" strokeWidth="2"/>
                      </svg>
                      {notification.hospitalName}
                    </span>
                  )}
                  {notification.appointmentTime && (
                    <span className={styles.metaItem}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                        <polyline points="12 6 12 12 16 14" strokeWidth="2"/>
                      </svg>
                      {notification.appointmentTime}
                    </span>
                  )}
                  {notification.patientName && (
                    <span className={styles.metaItem}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeWidth="2"/>
                        <circle cx="12" cy="7" r="4" strokeWidth="2"/>
                      </svg>
                      {notification.patientName}
                    </span>
                  )}
                </div>

                <div className={styles.notificationFooter}>
                  <span className={styles.timestamp}>
                    {formatDate(notification.createdAt)}
                  </span>
                </div>
              </div>

              <div className={styles.notificationActions}>
                {!notification.isRead && (
                  <div className={styles.unreadDot}></div>
                )}
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => deleteNotification(notification._id, e)}
                  aria-label="Delete notification"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="3 6 5 6 21 6" strokeWidth="2"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeWidth="2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;