import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "./header1";
import styles from '../css/donationhistory.module.css';
import { Link } from "react-router-dom";

export default function DonationHistory(){
  const [donations, setDonations] = useState([]);
  const donorId = 1;

  useEffect(()=>{ fetch(); },[]);

  const fetch = async ()=>{
    try{ const res = await axios.get(`/api/donations/${donorId}`); setDonations(res.data||[]); }catch(e){ console.error(e); }
  };

  return (
    <div className={styles['page-container']}>
      <Header />
      <div className={styles['dashboard-grid']}>
        <aside className={styles.sidebar}>
          <h3>Donor</h3>
          <nav><Link to="/donate">Donate</Link><Link to="/appointment">Appointments</Link><Link to="/donation-history">History</Link></nav>
        </aside>
        <main className={styles['main-content']}>
          <h2>Donation History</h2>
          <section className={`${styles.card} ${styles['list-card']}`}>
            <table className={styles.table}>
              <thead><tr><th>Date</th><th>Type</th><th>Units</th><th>Location</th></tr></thead>
              <tbody>
                {donations.length===0 && <tr><td colSpan="4">No records</td></tr>}
                {donations.map(d=> <tr key={d.id}><td>{new Date(d.donation_date).toLocaleDateString()}</td><td>{d.blood_type}</td><td>{d.units}</td><td>{d.location}</td></tr>)}
              </tbody>
            </table>
          </section>
        </main>
      </div>
    </div>
  );
}
