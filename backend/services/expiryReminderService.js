import cron from 'node-cron';
import User from '../models/user.js';
import BloodInventory from '../models/bloodInventory.js';
import PlasmaInventory from '../models/plasmaInventory.js';
import Notification from '../models/notification.js';
import { sendExpiryReminder } from './emailService.js';

// Function to check and send expiry reminders for blood units
export const checkBloodExpiryReminders = async () => {
  try {
    console.log('🔄 Checking blood expiry reminders...');

    // Calculate dates: 2 days from now
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    // Find blood units expiring within 2 days
    const expiringBloodUnits = await BloodInventory.find({
      expiryDate: { $lte: twoDaysFromNow, $gt: new Date() },
      unitsAvailable: { $gt: 0 }
    }).populate('hospitalId', 'name email');

    console.log(`📊 Found ${expiringBloodUnits.length} blood units expiring within 2 days`);

    let reminderCount = 0;

    // Send reminders for each expiring unit
    for (const unit of expiringBloodUnits) {
      try {
        // Check if reminder already sent for this unit in last 24 hours
        const recentNotification = await Notification.findOne({
          type: 'blood_expiry_reminder',
          'details.unitId': unit._id,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        if (!recentNotification) {
          // Send notification to hospital staff
          const hospitalStaff = await User.find({
            hospitalId: unit.hospitalId._id,
            role: 'hospital_staff'
          });

          for (const staff of hospitalStaff) {
            const notification = new Notification({
              userId: staff._id,
              type: 'blood_expiry_reminder',
              title: 'Blood Unit Expiring Soon',
              message: `${unit.bloodGroup} blood unit (${unit.unitsAvailable} units) expires on ${unit.expiryDate.toLocaleDateString()}. Please use or separate plasma soon.`,
              details: {
                unitId: unit._id,
                bloodGroup: unit.bloodGroup,
                unitsAvailable: unit.unitsAvailable,
                expiryDate: unit.expiryDate,
                hospitalId: unit.hospitalId._id
              }
            });
            await notification.save();

            // Send email reminder
            try {
              await sendExpiryReminder(staff.email, staff.fullName, {
                type: 'blood',
                bloodGroup: unit.bloodGroup,
                unitsAvailable: unit.unitsAvailable,
                expiryDate: unit.expiryDate,
                hospitalName: unit.hospitalId.name
              });
            } catch (emailError) {
              console.error(`Failed to send email reminder to ${staff.email}:`, emailError.message);
            }
          }

          reminderCount++;
          console.log(`✅ Expiry reminder sent for ${unit.bloodGroup} blood unit at ${unit.hospitalId.name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to process expiry reminder for blood unit ${unit._id}:`, error.message);
      }
    }

    return {
      expiringUnits: expiringBloodUnits.length,
      remindersSent: reminderCount
    };

  } catch (error) {
    console.error('❌ Error in blood expiry reminder service:', error);
    throw error;
  }
};

// Function to check and send expiry reminders for plasma units
export const checkPlasmaExpiryReminders = async () => {
  try {
    console.log('🔄 Checking plasma expiry reminders...');

    // Calculate dates: 2 days from now
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    // Find plasma units expiring within 2 days
    const expiringPlasmaUnits = await PlasmaInventory.find({
      expiryDate: { $lte: twoDaysFromNow, $gt: new Date() },
      unitsAvailable: { $gt: 0 }
    }).populate('hospitalId', 'name email');

    console.log(`📊 Found ${expiringPlasmaUnits.length} plasma units expiring within 2 days`);

    let reminderCount = 0;

    // Send reminders for each expiring unit
    for (const unit of expiringPlasmaUnits) {
      try {
        // Check if reminder already sent for this unit in last 24 hours
        const recentNotification = await Notification.findOne({
          type: 'plasma_expiry_reminder',
          'details.unitId': unit._id,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        if (!recentNotification) {
          // Send notification to hospital staff
          const hospitalStaff = await User.find({
            hospitalId: unit.hospitalId._id,
            role: 'hospital_staff'
          });

          for (const staff of hospitalStaff) {
            const notification = new Notification({
              userId: staff._id,
              type: 'plasma_expiry_reminder',
              title: 'Plasma Unit Expiring Soon',
              message: `${unit.bloodGroup} plasma unit (${unit.unitsAvailable} units) expires on ${unit.expiryDate.toLocaleDateString()}. Please use immediately.`,
              details: {
                unitId: unit._id,
                bloodGroup: unit.bloodGroup,
                unitsAvailable: unit.unitsAvailable,
                expiryDate: unit.expiryDate,
                hospitalId: unit.hospitalId._id
              }
            });
            await notification.save();

            // Send email reminder
            try {
              await sendExpiryReminder(staff.email, staff.fullName, {
                type: 'plasma',
                bloodGroup: unit.bloodGroup,
                unitsAvailable: unit.unitsAvailable,
                expiryDate: unit.expiryDate,
                hospitalName: unit.hospitalId.name
              });
            } catch (emailError) {
              console.error(`Failed to send email reminder to ${staff.email}:`, emailError.message);
            }
          }

          reminderCount++;
          console.log(`✅ Expiry reminder sent for ${unit.bloodGroup} plasma unit at ${unit.hospitalId.name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to process expiry reminder for plasma unit ${unit._id}:`, error.message);
      }
    }

    return {
      expiringUnits: expiringPlasmaUnits.length,
      remindersSent: reminderCount
    };

  } catch (error) {
    console.error('❌ Error in plasma expiry reminder service:', error);
    throw error;
  }
};

// Function to start the automated expiry reminder scheduler
export const startExpiryReminderScheduler = () => {
  // Schedule to run every day at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Running scheduled expiry reminder check...');
    try {
      const bloodResult = await checkBloodExpiryReminders();
      const plasmaResult = await checkPlasmaExpiryReminders();
      console.log('✅ Scheduled expiry reminder check completed:', { bloodResult, plasmaResult });
    } catch (error) {
      console.error('❌ Scheduled expiry reminder check failed:', error);
    }
  }, {
    timezone: "Asia/Kolkata" // Adjust timezone as needed
  });

  console.log('🚀 Expiry reminder scheduler started - will run daily at 8:00 AM');
};

// Function to manually trigger expiry reminder check (for testing)
export const triggerManualExpiryCheck = async () => {
  console.log('🔧 Manual expiry reminder check triggered...');
  try {
    const bloodResult = await checkBloodExpiryReminders();
    const plasmaResult = await checkPlasmaExpiryReminders();
    console.log('✅ Manual expiry reminder check completed:', { bloodResult, plasmaResult });
    return { bloodResult, plasmaResult };
  } catch (error) {
    console.error('❌ Manual expiry reminder check failed:', error);
    throw error;
  }
};

export default {
  startExpiryReminderScheduler,
  checkBloodExpiryReminders,
  checkPlasmaExpiryReminders,
  triggerManualExpiryCheck
};
