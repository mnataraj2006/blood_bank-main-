import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import styles from "../css/bloodreqform.module.css";
import DashboardHeader from "./recipentheader";

const displayName = JSON.parse(localStorage.getItem("user"))?.name || "User";
const displayBloodGroup = JSON.parse(localStorage.getItem("user"))?.blood_group || "Not specified";

function BloodRequestForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    patientName: "",
    patientAge: "",
    patientGender: "",
    bloodGroup: "",
    hospitalName: "",
    hospitalAddress: "",
    doctorName: "",
    contactPerson: "",
    contactNumber: "",
    email: "",
    hemoglobinLevel: "",
    additionalNotes: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const response = await axios.get("${process.env.REACT_APP_API_URL || 'https://blood-bank-backend.onrender.com'}/hospitals/verified");
        setHospitals(response.data);
      } catch (error) {
        console.error("Error fetching hospitals:", error);
        alert("❌ Error loading hospitals. Please refresh the page.");
      } finally {
        setLoadingHospitals(false);
      }
    };

    fetchHospitals();
  }, []);

  const getRecipientId = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    return user ? user.id : null;
  };

  const validateForm = () => {
    if (!formData.patientName || !formData.patientAge || !formData.patientGender || !formData.bloodGroup || !formData.hospitalName || !formData.doctorName || !formData.contactNumber) {
      alert("⚠️ Please fill in all required fields.");
      return false;
    }
    if (isNaN(formData.patientAge) || formData.patientAge <= 0) {
      alert("⚠️ Please enter a valid patient age.");
      return false;
    }
    if (!/^[0-9]{10}$/.test(formData.contactNumber)) {
      alert("⚠️ Please enter a valid 10-digit contact number.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const requestData = {
      recipient_id: getRecipientId(),
      requested_group: formData.bloodGroup,
      units_needed: 1,
      urgency_level: "critical",
      hospital_name: formData.hospitalName,
      hospital_address: formData.hospitalAddress,
      doctor_name: formData.doctorName,
      contact_person: formData.contactPerson,
      contact_number: formData.contactNumber,
      email: formData.email,
      hemoglobin_level: formData.hemoglobinLevel ? parseFloat(formData.hemoglobinLevel) : undefined,
      patient_age: parseInt(formData.patientAge),
      patient_gender: formData.patientGender,
      patient_name: formData.patientName,
      additional_notes: formData.additionalNotes,
    };

    try {
      setIsLoading(true);
      const response = await axios.post(
        "${process.env.REACT_APP_API_URL || 'https://blood-bank-backend.onrender.com'}/requests",
        requestData
      );
      alert("✅ Blood request submitted successfully!");
      console.log("Server response:", response.data);
      navigate('/recipient-dashboard');
    } catch (error) {
      console.error("Error submitting form:", error);
      if (error.response && error.response.data) {
        console.error("Server response:", error.response.data);
        alert("❌ Error: " + (error.response.data.message || "Server error"));
      } else {
        alert("❌ Error submitting request. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  return (
    <div className={styles['blood-request-wrapper']}>
      <DashboardHeader
        onNavigate={navigate}
        displayName={displayName}
        displayBloodGroup={displayBloodGroup}
        userRole="recipient"
      />

      <div className={styles['blood-request-container']}>
        <div className={styles['form-header']}>
          <div className={styles['header-icon']}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
            </svg>
          </div>
          <h1 className={styles['form-title']}>Blood Request Form</h1>
          <p className={styles['form-subtitle']}>Help us process your request quickly and efficiently</p>
        </div>

        <div className={styles['progress-bar']}>
          <div className={styles['progress-steps']}>
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className={`${styles['progress-step']} ${currentStep >= step ? styles['active'] : ''}`}>
                <div className={styles['step-circle']}>{step}</div>
                <span className={styles['step-label']}>
                  {step === 1 && 'Patient'}
                  {step === 2 && 'Hospital'}
                  {step === 3 && 'Contact'}
                  {step === 4 && 'Review'}
                </span>
              </div>
            ))}
          </div>
          <div className={styles['progress-line']}>
            <div className={styles['progress-fill']} style={{ width: `${((currentStep - 1) / 3) * 100}%` }}></div>
          </div>
        </div>

        <form className={styles['blood-request-form']} onSubmit={handleSubmit}>
          {currentStep === 1 && (
            <div className={`${styles['form-step']} ${styles['active']}`}>
              <h2 className={styles['step-title']}>Patient Information</h2>
              <div className={styles['form-grid']}>
                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Patient Name <span className={styles['required']}>*</span></label>
                  <input
                    type="text"
                    className={styles['form-input']}
                    value={formData.patientName}
                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                    placeholder="Enter patient's full name"
                    required
                  />
                </div>
                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Patient Age <span className={styles['required']}>*</span></label>
                  <input
                    type="number"
                    className={styles['form-input']}
                    value={formData.patientAge}
                    onChange={(e) => setFormData({ ...formData, patientAge: e.target.value })}
                    placeholder="Age in years"
                    required
                  />
                </div>
                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Gender <span className={styles['required']}>*</span></label>
                  <select
                    className={styles['form-select']}
                    value={formData.patientGender}
                    onChange={(e) => setFormData({ ...formData, patientGender: e.target.value })}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Blood Group Required <span className={styles['required']}>*</span></label>
                  <select
                    className={`${styles['form-select']} ${styles['blood-group-select']}`}
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    required
                  >
                    <option value="">Select Blood Group</option>
                    {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((group) => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles['urgency-badge']}>
                <span className={styles['badge-icon']}>⚡</span>
                <span>All requests are marked as Critical Priority (1 Unit)</span>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className={`${styles['form-step']} ${styles['active']}`}>
              <h2 className={styles['step-title']}>Hospital Information</h2>
              <div className={styles['form-grid']}>
                <div className={`${styles['form-group']} ${styles['full-width']}`}>
                  <label className={styles['form-label']}>Hospital Name <span className={styles['required']}>*</span></label>
                  {loadingHospitals ? (
                    <div className={styles['loading-hospitals']}>
                      <div className={styles['spinner']}></div>
                      <span>Loading hospitals...</span>
                    </div>
                  ) : (
                    <select
                      className={styles['form-select']}
                      value={formData.hospitalName}
                      onChange={(e) => {
                        const selectedHospital = hospitals.find(h => h.name === e.target.value);
                        setFormData({
                          ...formData,
                          hospitalName: e.target.value,
                          hospitalAddress: selectedHospital ? `${selectedHospital.address}, ${selectedHospital.city}, ${selectedHospital.state} ${selectedHospital.pincode}` : ""
                        });
                      }}
                      required
                    >
                      <option value="">Select Hospital</option>
                      {hospitals.map((hospital) => (
                        <option key={hospital._id} value={hospital.name}>
                          {hospital.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className={`${styles['form-group']} ${styles['full-width']}`}>
                  <label className={styles['form-label']}>Hospital Address</label>
                  <input
                    type="text"
                    className={styles['form-input']}
                    value={formData.hospitalAddress}
                    onChange={(e) => setFormData({ ...formData, hospitalAddress: e.target.value })}
                    placeholder="Hospital address"
                    readOnly
                  />
                </div>
                <div className={`${styles['form-group']} ${styles['full-width']}`}>
                  <label className={styles['form-label']}>Doctor Name <span className={styles['required']}>*</span></label>
                  <input
                    type="text"
                    className={styles['form-input']}
                    value={formData.doctorName}
                    onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                    placeholder="Attending physician's name"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className={`${styles['form-step']} ${styles['active']}`}>
              <h2 className={styles['step-title']}>Contact Information</h2>
              <div className={styles['form-grid']}>
                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Contact Person</label>
                  <input
                    type="text"
                    className={styles['form-input']}
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Name of contact person"
                  />
                </div>
                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Contact Number <span className={styles['required']}>*</span></label>
                  <input
                    type="text"
                    className={styles['form-input']}
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    placeholder="10-digit mobile number"
                    required
                  />
                </div>
                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Email (Optional)</label>
                  <input
                    type="email"
                    className={styles['form-input']}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Hemoglobin Level (Optional)</label>
                  <input
                    type="number"
                    step="0.1"
                    className={styles['form-input']}
                    value={formData.hemoglobinLevel}
                    onChange={(e) => setFormData({ ...formData, hemoglobinLevel: e.target.value })}
                    placeholder="e.g., 12.5 g/dL"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className={`${styles['form-step']} ${styles['active']}`}>
              <h2 className={styles['step-title']}>Additional Information</h2>
              <div className={`${styles['form-group']} ${styles['full-width']}`}>
                <label className={styles['form-label']}>Additional Notes</label>
                <textarea
                  className={styles['form-textarea']}
                  value={formData.additionalNotes}
                  onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                  rows="6"
                  placeholder="Any special requirements or additional information..."
                />
              </div>

              <div className={styles['review-summary']}>
                <h3>Request Summary</h3>
                <div className={styles['summary-grid']}>
                  <div className={styles['summary-item']}>
                    <span className={styles['summary-label']}>Patient:</span>
                    <span className={styles['summary-value']}>{formData.patientName || 'Not provided'}</span>
                  </div>
                  <div className={styles['summary-item']}>
                    <span className={styles['summary-label']}>Blood Group:</span>
                    <span className={`${styles['summary-value']} ${styles['blood-badge']}`}>{formData.bloodGroup || 'Not selected'}</span>
                  </div>
                  <div className={styles['summary-item']}>
                    <span className={styles['summary-label']}>Hospital:</span>
                    <span className={styles['summary-value']}>{formData.hospitalName || 'Not selected'}</span>
                  </div>
                  <div className={styles['summary-item']}>
                    <span className={styles['summary-label']}>Contact:</span>
                    <span className={styles['summary-value']}>{formData.contactNumber || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={styles['form-navigation']}>
            {currentStep > 1 && (
              <button type="button" className={`${styles['btn']} ${styles['btn-secondary']}`} onClick={prevStep}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Previous
              </button>
            )}
            {currentStep < 4 ? (
              <button type="button" className={`${styles['btn']} ${styles['btn-primary']}`} onClick={nextStep}>
                Next
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                className={`${styles['btn']} ${styles['btn-submit']} ${isLoading ? styles['loading'] : ''}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className={styles['spinner-small']}></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Submit Request
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default BloodRequestForm;