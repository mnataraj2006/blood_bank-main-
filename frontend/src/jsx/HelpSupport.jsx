import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  Phone,
  Mail,
  MapPin,
  Clock,
  Droplet,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Heart,
  Shield,
  Info
} from 'lucide-react';
import styles from '../css/help.module.css';

const HelpSupport = () => {
  const navigate = useNavigate();
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const toggleFAQ = (index) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  const faqs = [
    {
      question: "How do I register as a blood donor?",
      answer: "Click on 'Sign Up' and select 'Blood Donor' as your role. Fill in your personal details, medical history, and blood type. You'll need to provide identification and undergo a basic health screening."
    },
    {
      question: "How do I create a blood request as a recipient?",
      answer: "Log in as a recipient, go to your dashboard, and click 'New Blood Request'. Fill in the required blood type, units needed, hospital details, and urgency level. The system will notify compatible donors."
    },
    {
      question: "What are the eligibility requirements for blood donation?",
      answer: "You must be 18-65 years old, weigh at least 50kg, be in good health, and not have donated blood in the last 56 days. Certain medical conditions may disqualify you temporarily."
    },
    {
      question: "How does the matching system work?",
      answer: "Our system matches recipients with donors based on blood type compatibility, location proximity, and availability. Donors receive notifications when a matching request is made."
    },
    {
      question: "What should I do in case of a medical emergency?",
      answer: "Contact your nearest hospital emergency department immediately. If you need blood urgently, inform the hospital staff who can coordinate through our platform."
    },
    {
      question: "How do I update my profile information?",
      answer: "Go to your dashboard and click on 'Profile' or 'Settings'. You can update your contact information, medical details, and notification preferences."
    },
    {
      question: "What happens after I respond to a blood request?",
      answer: "Once you accept a request, the recipient's hospital will contact you to schedule the donation. You'll receive confirmation and directions to the donation center."
    },
    {
      question: "How can hospitals register on the platform?",
      answer: "Hospitals can contact our support team for registration. We'll verify your credentials and set up your hospital profile with blood bank management capabilities."
    }
  ];

  const emergencyContacts = [
    { name: "National Blood Bank Helpline", number: "1800-XXXX-XXXX", available: "24/7" },
    { name: "Emergency Blood Services", number: "108", available: "24/7" },
    { name: "Local Hospital Coordination", number: "Contact your nearest hospital", available: "24/7" }
  ];

  return (
    <div className={styles['help-container']}>
      {/* Header */}
      <div className={styles['help-header']}>
        <div className={styles['header-content']}>
          <HelpCircle size={32} />
          <h1>Help & Support Center</h1>
          <p>Find answers to common questions and get the help you need</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles['quick-actions']}>
        <div className={styles['action-card']}>
          <Phone size={24} />
          <h3>Emergency Help</h3>
          <p>Need immediate assistance?</p>
          <button className={styles['emergency-btn']}>
            Call Emergency: 108
          </button>
        </div>

        <div className={styles['action-card']}>
          <Mail size={24} />
          <h3>Contact Support</h3>
          <p>Get help from our team</p>
          <button className={styles['contact-btn']}>
            support@bloodbank.com
          </button>
        </div>

        <div className={styles['action-card']}>
          <FileText size={24} />
          <h3>User Guide</h3>
          <p>Learn how to use the platform</p>
          <button className={styles['guide-btn']}>
            View Guide
          </button>
        </div>
      </div>

      {/* FAQ Section */}
      <div className={styles['faq-section']}>
        <h2>
          <Info size={24} />
          Frequently Asked Questions
        </h2>

        <div className={styles['faq-list']}>
          {faqs.map((faq, index) => (
            <div key={index} className={styles['faq-item']}>
              <button
                className={styles['faq-question']}
                onClick={() => toggleFAQ(index)}
              >
                <span>{faq.question}</span>
                {expandedFAQ === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {expandedFAQ === index && (
                <div className={styles['faq-answer']}>
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Blood Donation Guidelines */}
      <div className={styles['guidelines-section']}>
        <h2>
          <Droplet size={24} />
          Blood Donation Guidelines
        </h2>

        <div className={styles['guidelines-grid']}>
          <div className={styles['guideline-card']}>
            <Heart size={20} />
            <h3>Before Donation</h3>
            <ul>
              <li>Get adequate sleep (at least 6 hours)</li>
              <li>Eat a healthy meal</li>
              <li>Stay well-hydrated</li>
              <li>Avoid alcohol 24 hours before</li>
              <li>Bring valid ID proof</li>
            </ul>
          </div>

          <div className={styles['guideline-card']}>
            <Shield size={20} />
            <h3>During Donation</h3>
            <ul>
              <li>Relax and stay comfortable</li>
              <li>Inform staff of any discomfort</li>
              <li>The process takes 8-10 minutes</li>
              <li>You can donate 350-450ml of blood</li>
              <li>Staff will monitor your vitals</li>
            </ul>
          </div>

          <div className={styles['guideline-card']}>
            <Clock size={20} />
            <h3>After Donation</h3>
            <ul>
              <li>Rest for 10-15 minutes</li>
              <li>Have refreshments provided</li>
              <li>Avoid heavy exercise for 24 hours</li>
              <li>Keep the bandage on for 4-5 hours</li>
              <li>Stay hydrated and eat well</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className={styles['emergency-section']}>
        <h2>
          <AlertTriangle size={24} />
          Emergency Contacts
        </h2>

        <div className={styles['emergency-grid']}>
          {emergencyContacts.map((contact, index) => (
            <div key={index} className={styles['emergency-card']}>
              <Phone size={20} />
              <div>
                <h3>{contact.name}</h3>
                <p className={styles['contact-number']}>{contact.number}</p>
                <p className={styles['availability']}>Available: {contact.available}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Information */}
      <div className={styles['contact-section']}>
        <h2>
          <Users size={24} />
          Contact Us
        </h2>

        <div className={styles['contact-grid']}>
          <div className={styles['contact-card']}>
            <Mail size={20} />
            <div>
              <h3>Email Support</h3>
              <p>support@bloodbank.com</p>
              <p>Response time: 24-48 hours</p>
            </div>
          </div>

          <div className={styles['contact-card']}>
            <Phone size={20} />
            <div>
              <h3>Phone Support</h3>
              <p>1800-XXXX-XXXX</p>
              <p>Mon-Fri: 9AM-6PM</p>
            </div>
          </div>

          <div className={styles['contact-card']}>
            <MapPin size={20} />
            <div>
              <h3>Visit Us</h3>
              <p>Blood Bank Headquarters</p>
              <p>123 Medical Center Drive</p>
              <p>City, State - 123456</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={styles['help-footer']}>
        <p>Can't find what you're looking for? <a href="mailto:support@bloodbank.com">Contact our support team</a></p>
        <button
          className={styles['back-btn']}
          onClick={() => navigate(-1)}
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default HelpSupport;
