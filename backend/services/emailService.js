import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can change this to your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Function to send donation reminder email
export const sendDonationReminder = async (donorEmail, donorName) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: donorEmail,
    subject: 'Blood Donation Reminder - Your Help is Needed!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">LifeShare</h1>
          <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Blood Bank Management System</p>
        </div>

        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${donorName}!</h2>

          <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
            It's been 90 days since your last blood donation. Your generous contributions have helped save lives,
            and now we need your help again!
          </p>

          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3 style="color: #dc2626; margin-top: 0;">Why Donate Now?</h3>
            <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
              <li>You can donate blood every 56 days for whole blood</li>
              <li>Your blood type is always in demand</li>
              <li>One donation can save up to 3 lives</li>
              <li>The process is safe and takes only 10-15 minutes</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/book-donation-slot"
               style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                      color: white;
                      padding: 15px 30px;
                      text-decoration: none;
                      border-radius: 8px;
                      font-weight: bold;
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);">
              Schedule Your Donation
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
            If you have any questions or need assistance, please contact us at
            <a href="mailto:support@lifeshare.com" style="color: #3b82f6;">support@lifeshare.com</a>
          </p>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p>This is an automated reminder. Please do not reply to this email.</p>
          <p>© 2024 LifeShare Blood Bank. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Donation reminder email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending donation reminder email:', error);
    throw error;
  }
};

// Function to send notification to donors about new blood request
export const sendBloodRequestNotification = async (donorEmail, donorName, requestDetails) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: donorEmail,
    subject: 'Urgent Blood Request - Your Blood Type is Needed!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">LifeShare</h1>
          <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 16px;">Blood Bank Management System</p>
        </div>

        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${donorName}!</h2>

          <p style="color: #4b5563; line-height: 1.6; font-size: 16px;">
            We urgently need your help! A patient requires blood type <strong>${requestDetails.bloodGroup}</strong>,
            and your blood type matches this critical need.
          </p>

          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3 style="color: #b91c1c; margin-top: 0;">Request Details:</h3>
            <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
              <li><strong>Blood Type Needed:</strong> ${requestDetails.bloodGroup}</li>
              <li><strong>Units Required:</strong> ${requestDetails.unitsNeeded}</li>
              <li><strong>Urgency:</strong> ${requestDetails.urgencyLevel}</li>
              <li><strong>Hospital:</strong> ${requestDetails.hospitalName}</li>
              <li><strong>Location:</strong> ${requestDetails.hospitalAddress}</li>
              <li><strong>Patient:</strong> ${requestDetails.patientName || 'Not specified'}</li>
              <li><strong>Required Date:</strong> ${new Date(requestDetails.requiredDate).toLocaleDateString()}</li>
            </ul>
          </div>

          <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3 style="color: #0c4a6e; margin-top: 0;">Why Your Donation Matters:</h3>
            <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
              <li>You can donate blood every 56 days for whole blood</li>
              <li>Your specific blood type is critically needed right now</li>
              <li>One donation can save this patient's life</li>
              <li>The donation process is safe and takes only 10-15 minutes</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/donor-dashboard"
               style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
                      color: white;
                      padding: 15px 30px;
                      text-decoration: none;
                      border-radius: 8px;
                      font-weight: bold;
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);">
              View Request & Respond
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
            If you can help, please respond to this request through your donor dashboard.
            Your generosity can make a life-saving difference!
          </p>

          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            For questions, contact us at
            <a href="mailto:support@lifeshare.com" style="color: #3b82f6;">support@lifeshare.com</a>
          </p>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p>This is an automated notification. Please do not reply to this email.</p>
          <p>© 2024 LifeShare Blood Bank. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Blood request notification email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending blood request notification email:', error);
    throw error;
  }
};

// Function to send expiry reminder email
export const sendExpiryReminder = async (staffEmail, staffName, expiryDetails) => {
  const unitType = expiryDetails.type === 'blood' ? 'Blood Unit' : 'Plasma Unit';
  const unitName = expiryDetails.type === 'blood' ? 'blood' : 'plasma';

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: staffEmail,
    subject: `Urgent: ${unitType} Expiring Soon - Action Required`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">LifeShare</h1>
          <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">Blood Bank Management System</p>
        </div>

        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${staffName}!</h2>

          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3 style="color: #92400e; margin-top: 0;">⚠️ ${unitType} Expiring Soon</h3>
            <p style="color: #4b5563; margin: 10px 0;">
              A ${unitName} unit at your hospital is expiring within 2 days. Please take immediate action to prevent waste.
            </p>
            <ul style="color: #4b5563; margin: 10px 0; padding-left: 20px;">
              <li><strong>Blood Type:</strong> ${expiryDetails.bloodGroup}</li>
              <li><strong>Units Available:</strong> ${expiryDetails.unitsAvailable}</li>
              <li><strong>Expiry Date:</strong> ${new Date(expiryDetails.expiryDate).toLocaleDateString()}</li>
              <li><strong>Hospital:</strong> ${expiryDetails.hospitalName}</li>
            </ul>
          </div>

          <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3 style="color: #0c4a6e; margin-top: 0;">Recommended Actions:</h3>
            <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
              ${expiryDetails.type === 'blood' ?
                `<li>Check if the blood can be used for transfusions</li>
                 <li>Consider separating plasma from the blood unit</li>
                 <li>Contact recipients who need this blood type</li>` :
                `<li>Use the plasma for medical treatments immediately</li>
                 <li>Contact plasma-dependent patients</li>
                 <li>Check with other hospitals for urgent needs</li>`
              }
              <li>Document any disposal if the unit cannot be used</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/hospital-dashboard"
               style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                      color: white;
                      padding: 15px 30px;
                      text-decoration: none;
                      border-radius: 8px;
                      font-weight: bold;
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);">
              View Inventory Dashboard
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
            This is an automated expiry reminder. Please take immediate action to prevent blood/plasma waste.
          </p>

          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            For questions, contact us at
            <a href="mailto:support@lifeshare.com" style="color: #3b82f6;">support@lifeshare.com</a>
          </p>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p>This is an automated reminder. Please do not reply to this email.</p>
          <p>© 2024 LifeShare Blood Bank. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Expiry reminder email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending expiry reminder email:', error);
    throw error;
  }
};

// Function to test email configuration
export const testEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('Email service is ready to send messages');
    return true;
  } catch (error) {
    console.error('Email service configuration error:', error);
    return false;
  }
};

export default transporter;
