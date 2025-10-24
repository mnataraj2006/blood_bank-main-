import cron from 'node-cron';
import User from '../models/user.js';
import { sendDonationReminder } from './emailService.js';

// Function to check and send donation reminders
export const checkAndSendReminders = async () => {
  try {
    console.log('🔄 Starting donation reminder check...');

    // Calculate the date 90 days ago
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Find donors who:
    // 1. Have role 'donor'
    // 2. Have a lastDonationDate that is 90+ days ago
    // 3. Haven't received a reminder in the last 30 days (to avoid spam)
    const eligibleDonors = await User.find({
      role: 'donor',
      lastDonationDate: { $lte: ninetyDaysAgo },
      $or: [
        { lastReminderSent: { $exists: false } },
        { lastReminderSent: { $lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } // 30 days ago
      ]
    });

    console.log(`📊 Found ${eligibleDonors.length} eligible donors for reminders`);

    let successCount = 0;
    let failureCount = 0;

    // Send reminders to each eligible donor
    for (const donor of eligibleDonors) {
      try {
        await sendDonationReminder(donor.email, donor.fullName || donor.email);

        // Update the lastReminderSent field
        await User.findByIdAndUpdate(donor._id, {
          lastReminderSent: new Date()
        });

        successCount++;
        console.log(`✅ Reminder sent to ${donor.email}`);
      } catch (error) {
        console.error(`❌ Failed to send reminder to ${donor.email}:`, error.message);
        failureCount++;
      }

      // Add a small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`📈 Reminder batch completed: ${successCount} sent, ${failureCount} failed`);

    return {
      totalEligible: eligibleDonors.length,
      sent: successCount,
      failed: failureCount
    };

  } catch (error) {
    console.error('❌ Error in donation reminder service:', error);
    throw error;
  }
};

// Function to start the automated reminder scheduler
export const startReminderScheduler = () => {
  // Schedule to run every day at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Running scheduled donation reminder check...');
    try {
      const result = await checkAndSendReminders();
      console.log('✅ Scheduled reminder check completed:', result);
    } catch (error) {
      console.error('❌ Scheduled reminder check failed:', error);
    }
  }, {
    timezone: "Asia/Kolkata" // Adjust timezone as needed
  });

  console.log('🚀 Donation reminder scheduler started - will run daily at 9:00 AM');
};

// Function to manually trigger reminder check (for testing)
export const triggerManualReminderCheck = async () => {
  console.log('🔧 Manual reminder check triggered...');
  try {
    const result = await checkAndSendReminders();
    console.log('✅ Manual reminder check completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Manual reminder check failed:', error);
    throw error;
  }
};

export default {
  startReminderScheduler,
  checkAndSendReminders,
  triggerManualReminderCheck
};
