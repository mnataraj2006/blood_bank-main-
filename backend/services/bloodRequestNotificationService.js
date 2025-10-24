import User from '../models/user.js';
import { sendBloodRequestNotification } from './emailService.js';

// Function to notify matching donors when a new blood request is created
export const notifyMatchingDonors = async (bloodRequest) => {
  try {
    console.log('🔔 Starting donor notification process for blood request:', bloodRequest._id);

    // Find all active donors with matching blood group
    const matchingDonors = await User.find({
      role: 'donor',
      bloodGroup: bloodRequest.requestedGroup,
      // Add any additional filters if needed (e.g., location-based matching)
    }).select('fullName email bloodGroup phoneNumber city state');

    console.log(`📧 Found ${matchingDonors.length} matching donors for blood group ${bloodRequest.requestedGroup}`);

    if (matchingDonors.length === 0) {
      console.log('⚠️ No matching donors found for this blood request');
      return { success: true, notifiedCount: 0, message: 'No matching donors found' };
    }

    // Prepare request details for email
    const requestDetails = {
      bloodGroup: bloodRequest.requestedGroup,
      unitsNeeded: bloodRequest.unitsNeeded,
      urgencyLevel: bloodRequest.urgencyLevel,
      hospitalName: bloodRequest.hospitalName,
      hospitalAddress: bloodRequest.hospitalAddress,
      patientName: bloodRequest.patientName,
      requiredDate: bloodRequest.requiredDate,
      purpose: bloodRequest.purpose,
      medicalCondition: bloodRequest.medicalCondition
    };

    // Send notification emails to all matching donors
    const emailPromises = matchingDonors.map(async (donor) => {
      try {
        console.log(`📤 Sending notification to donor: ${donor.fullName} (${donor.email})`);
        const result = await sendBloodRequestNotification(donor.email, donor.fullName, requestDetails);

        // Add a small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

        return { donorId: donor._id, email: donor.email, success: true, messageId: result.messageId };
      } catch (error) {
        console.error(`❌ Failed to send notification to ${donor.email}:`, error.message);
        return { donorId: donor._id, email: donor.email, success: false, error: error.message };
      }
    });

    // Wait for all email notifications to be sent
    const results = await Promise.allSettled(emailPromises);

    // Count successful notifications
    const successfulNotifications = results.filter(result =>
      result.status === 'fulfilled' && result.value.success
    ).length;

    const failedNotifications = results.filter(result =>
      result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)
    ).length;

    console.log(`✅ Blood request notifications completed:`);
    console.log(`   - Total matching donors: ${matchingDonors.length}`);
    console.log(`   - Successful notifications: ${successfulNotifications}`);
    console.log(`   - Failed notifications: ${failedNotifications}`);

    return {
      success: true,
      notifiedCount: successfulNotifications,
      totalMatchingDonors: matchingDonors.length,
      failedCount: failedNotifications,
      message: `Notified ${successfulNotifications} out of ${matchingDonors.length} matching donors`
    };

  } catch (error) {
    console.error('❌ Error in notifyMatchingDonors:', error);
    throw new Error(`Failed to notify donors: ${error.message}`);
  }
};

// Function to manually trigger donor notifications for testing (admin only)
export const triggerManualDonorNotification = async (requestId) => {
  try {
    console.log('🔧 Manual donor notification trigger requested for request:', requestId);

    // Import BloodRequest here to avoid circular dependency
    const BloodRequest = (await import('../models/bloodRequest.js')).default;

    const bloodRequest = await BloodRequest.findById(requestId);
    if (!bloodRequest) {
      throw new Error('Blood request not found');
    }

    const result = await notifyMatchingDonors(bloodRequest);
    return result;

  } catch (error) {
    console.error('❌ Manual donor notification failed:', error);
    throw error;
  }
};

export default { notifyMatchingDonors, triggerManualDonorNotification };
