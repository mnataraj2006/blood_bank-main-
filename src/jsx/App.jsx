import React from "react";
import { Routes, Route } from "react-router-dom";
import axios from 'axios';
import ErrorBoundary from "./ErrorBoundary.jsx";
import Homepage from "../jsx/homepage.jsx";
import LifeShareSignup from "./signuppage.jsx";
import LoginPage from "./loginpage.jsx";
import DonorDashboard from "./donordashboard.jsx";
import RecipientDashboard from "./recipientdashboard.jsx";
import FindDonor from "./finddonor.jsx";
import AdminDashboard from "./admindashboard.jsx";
import HospitalStaffDashboard from "./hospitalstaffdashboard.jsx";
import HospitalDashboard from "./hospitaldashboard.jsx";
import BloodRequestForm from "./bloodreqform.jsx";
import DonationHistory from "./DonationHistory.jsx";
import RecipientHistory from "./recipienthistory.jsx";
import BookDonationSlot from "./bookdonationslot.jsx";
import UpdateProfile from "./updateprofile.jsx";
import GoogleSignupComplete from "./google-signup-complete.jsx";
import HelpSupport from "./HelpSupport.jsx";
import Notifications from "./Notifications.jsx";

// Axios interceptor for token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 403 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData?.refreshToken) {
          const refreshResponse = await axios.post('http://localhost:5000/auth/refresh', {
            refreshToken: userData.refreshToken
          });
          const newAccessToken = refreshResponse.data.accessToken;
          // Update localStorage with new token
          userData.token = newAccessToken;
          localStorage.setItem('user', JSON.stringify(userData));
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return axios(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

function App() {
  return (
    <ErrorBoundary>
      <div className="App">
        <Routes>
          {/* Homepage route */}
          <Route path="/" element={<Homepage />} />

          {/* Signup route */}
          <Route path="/signup" element={<LifeShareSignup />} />

          {/* Login route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Donor Dashboard route */}
          <Route path="/dashboard" element={<DonorDashboard />} />

          {/* Recipient Dashboard route */}
          <Route path="/recipient-dashboard" element={<RecipientDashboard />} />

          {/* Find Donor route */}
          <Route path="/find-donor" element={<FindDonor />} />

          {/*admin dashboard route */}
          <Route path="/admin-dashboard" element={<AdminDashboard />} />

          {/*hospital staff dashboard route */}
          <Route path="/hospital-staff-dashboard" element={<HospitalStaffDashboard />} />

          {/*hospital dashboard route */}
          <Route path="/hospital-dashboard" element={<HospitalDashboard />} />

          {/*blood request form route */}
          <Route path="/blood-request-form" element={<BloodRequestForm />} />

          {/*donation history route */}
          <Route path="/donation-history" element={<DonationHistory />} />

          {/*book donation slot route */}
          <Route path="/book-donation-slot" element={<BookDonationSlot />} />

          {/*update profile route */}
          <Route path="/update-profile" element={<UpdateProfile />} />

          {/*recipient history route */}
          <Route path="/recipient-history" element={<RecipientHistory />} />

          {/* Google signup complete route */}
          <Route path="/google-signup-complete" element={<GoogleSignupComplete />} />

          {/* Help & Support route */}
          <Route path="/help" element={<HelpSupport />} />

          {/* Notifications route */}
          <Route path="/notifications" element={<Notifications />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;
