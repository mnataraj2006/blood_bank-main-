import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import styles from '../css/finddonor.module.css';
import DashboardHeader from "./recipentheader";

export default function FindDonor() {
  const navigate = useNavigate();
  const [bg, setBg] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [donors, setDonors] = useState([]);
  const [filteredDonors, setFilteredDonors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [viewMode, setViewMode] = useState("grid");
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);

  const displayName = JSON.parse(localStorage.getItem("user"))?.name || "User";
  const displayBloodGroup = JSON.parse(localStorage.getItem("user"))?.blood_group || "Not specified";

  const fetchDonors = async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (bg) params.append("bg", bg);
      if (city) params.append("city", city);
      if (state) params.append("state", state);
      const res = await fetch(`http://localhost:5000/donors?${params.toString()}`);
      const data = await res.json();
      const donorList = Array.isArray(data) ? data : [];
      setDonors(donorList);
      setFilteredDonors(donorList);
    } catch (e) {
      setError("Failed to load donors. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonors();
  }, []);

  useEffect(() => {
    let result = [...donors];
    
    if (searchTerm) {
      result = result.filter(d => 
        (d.fullName || d.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.city || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.state || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    result.sort((a, b) => {
      if (sortBy === "name") {
        const nameA = (a.fullName || a.full_name || "").toLowerCase();
        const nameB = (b.fullName || b.full_name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      } else if (sortBy === "bloodgroup") {
        const bgA = a.bloodGroup || a.bloodgroup || "";
        const bgB = b.bloodGroup || b.bloodgroup || "";
        return bgA.localeCompare(bgB);
      } else if (sortBy === "location") {
        const locA = (a.city || "").toLowerCase();
        const locB = (b.city || "").toLowerCase();
        return locA.localeCompare(locB);
      }
      return 0;
    });

    setFilteredDonors(result);
  }, [searchTerm, sortBy, donors]);

  const handleContactDonor = (donor) => {
    setSelectedDonor(donor);
    setShowContactModal(true);
  };

  const closeModal = () => {
    setShowContactModal(false);
    setSelectedDonor(null);
  };

  const getBloodGroupColor = (bloodGroup) => {
    const colors = {
      'A+': '#ff6b6b', 'A-': '#ee5a6f',
      'B+': '#4ecdc4', 'B-': '#45b7d1',
      'AB+': '#95e1d3', 'AB-': '#7dc8c4',
      'O+': '#f38181', 'O-': '#e84a5f'
    };
    return colors[bloodGroup] || '#666';
  };

  return (
    <div className={styles.container}>
      <DashboardHeader
        onNavigate={navigate}
        displayName={displayName}
        displayBloodGroup={displayBloodGroup}
        userRole="recipient"
      />

      <div className={styles.heroSection}>
        <h1 className={styles.mainTitle}>Find Your Life Saver</h1>
        <p className={styles.subtitle}>Connect with donors in your area and save lives</p>
      </div>

      <div className={styles.searchSection}>
        <div className={styles.filterGrid}>
          <div className={styles.inputGroup}>
            <label>Blood Group</label>
            <select value={bg} onChange={e => setBg(e.target.value)} className={styles.select}>
              <option value="">All Blood Groups</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(x => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label>City</label>
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Enter city"
              className={styles.input} />
          </div>

          <div className={styles.inputGroup}>
            <label>State</label>
            <input
              value={state}
              onChange={e => setState(e.target.value)}
              placeholder="Enter state"
              className={styles.input} />
          </div>

          <button onClick={fetchDonors} disabled={loading} className={styles.searchBtn}>
            <span className={styles.searchIcon}>🔍</span>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        <div className={styles.toolBar}>
          <div className={styles.searchBox}>
            <span className={styles.searchIconSmall}>🔎</span>
            <input
              type="text"
              placeholder="Search by name or location..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.controls}>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={styles.sortSelect}>
              <option value="name">Sort by Name</option>
              <option value="bloodgroup">Sort by Blood Group</option>
              <option value="location">Sort by Location</option>
            </select>

            <div className={styles.viewToggle}>
              <button 
                className={viewMode === "grid" ? styles.active : ""} 
                onClick={() => setViewMode("grid")}
                title="Grid View">
                ▦
              </button>
              <button 
                className={viewMode === "list" ? styles.active : ""} 
                onClick={() => setViewMode("list")}
                title="List View">
                ☰
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <span>⚠️</span> {error}
        </div>
      )}

      <div className={styles.resultsSection}>
        <div className={styles.resultsHeader}>
          <h2>{filteredDonors.length} Donor{filteredDonors.length !== 1 ? 's' : ''} Found</h2>
        </div>

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Finding donors for you...</p>
          </div>
        ) : (
          <>
            {filteredDonors.length > 0 ? (
              <div className={viewMode === "grid" ? styles.donorGrid : styles.donorList}>
                {filteredDonors.map((d, idx) => (
                  <div key={d.id || idx} className={styles.donorCard}>
                    <div className={styles.cardHeader}>
                      <div className={styles.avatar}>
                        {(d.fullName || d.full_name || "?")[0].toUpperCase()}
                      </div>
                      <div 
                        className={styles.bloodBadge}
                        style={{ backgroundColor: getBloodGroupColor(d.bloodGroup || d.bloodgroup) }}>
                        {d.bloodGroup || d.bloodgroup || '—'}
                      </div>
                    </div>

                    <div className={styles.cardBody}>
                      <h3 className={styles.donorName}>{d.fullName || d.full_name || "Anonymous"}</h3>
                      
                      <div className={styles.infoRow}>
                        <span className={styles.icon}>📍</span>
                        <span>{d.city || '—'}, {d.state || '—'}</span>
                      </div>

                      {d.email && (
                        <div className={styles.infoRow}>
                          <span className={styles.icon}>📧</span>
                          <span className={styles.emailText}>{d.email}</span>
                        </div>
                      )}

                      {d.phone && (
                        <div className={styles.infoRow}>
                          <span className={styles.icon}>📱</span>
                          <span>{d.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className={styles.cardFooter}>
                      <button 
                        className={styles.contactBtn}
                        onClick={() => handleContactDonor(d)}>
                        Contact Donor
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🔍</div>
                <h3>No Donors Found</h3>
                <p>Try adjusting your search filters or expand your search area</p>
              </div>
            )}
          </>
        )}
      </div>

      {showContactModal && selectedDonor && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={closeModal}>×</button>
            
            <div className={styles.modalHeader}>
              <div className={styles.modalAvatar}>
                {(selectedDonor.fullName || selectedDonor.full_name || "?")[0].toUpperCase()}
              </div>
              <h2>{selectedDonor.fullName || selectedDonor.full_name}</h2>
              <span 
                className={styles.modalBadge}
                style={{ backgroundColor: getBloodGroupColor(selectedDonor.bloodGroup || selectedDonor.bloodgroup) }}>
                {selectedDonor.bloodGroup || selectedDonor.bloodgroup}
              </span>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalInfo}>
                <strong>📍 Location:</strong>
                <span>{selectedDonor.city}, {selectedDonor.state}</span>
              </div>

              {selectedDonor.email && (
                <div className={styles.modalInfo}>
                  <strong>📧 Email:</strong>
                  <span>{selectedDonor.email}</span>
                </div>
              )}

              {selectedDonor.phone && (
                <div className={styles.modalInfo}>
                  <strong>📱 Phone:</strong>
                  <span>{selectedDonor.phone}</span>
                </div>
              )}

              <div className={styles.modalActions}>
                {selectedDonor.email && (
                  <a href={`mailto:${selectedDonor.email}`} className={styles.actionBtn}>
                    Send Email
                  </a>
                )}
                {selectedDonor.phone && (
                  <a href={`tel:${selectedDonor.phone}`} className={styles.actionBtn}>
                    Call Now
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}