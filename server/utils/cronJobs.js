const cron = require('node-cron');
const Project = require('../models/Project');
const Client = require('../models/Client');
const Invoice = require('../models/Invoice');
const Notification = require('../models/Notification');
const { sendDeadlineReminderEmail } = require('./emailService');
const { sendDeadlineReminder } = require('./whatsappService');

// Initialize all cron jobs
const initializeCronJobs = () => {
  console.log('🕐 Initializing cron jobs...');

  // Daily deadline reminders (runs at 9:00 AM every day)
  cron.schedule('0 9 * * *', async () => {
    console.log('🔔 Running daily deadline reminder job...');
    await checkUpcomingDeadlines();
  });

  // Weekly overdue project check (runs every Monday at 10:00 AM)
  cron.schedule('0 10 * * 1', async () => {
    console.log('⚠️ Running weekly overdue project check...');
    await checkOverdueProjects();
  });

  // Monthly invoice reminders (runs on the 1st of every month at 9:00 AM)
  cron.schedule('0 9 1 * *', async () => {
    console.log('💰 Running monthly invoice reminder job...');
    await sendInvoiceReminders();
  });

  // Daily cleanup of old notifications (runs at 2:00 AM every day)
  cron.schedule('0 2 * * *', async () => {
    console.log('🧹 Running daily notification cleanup...');
    await cleanupOldNotifications();
  });

  console.log('✅ All cron jobs initialized successfully');
};

// Check for upcoming deadlines (1 day, 3 days, 7 days)
const checkUpcomingDeadlines = async () => {
  try {
    const today = new Date();
    const oneDayFromNow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Projects due in 1 day
    const projectsDueIn1Day = await Project.find({
      deadline: {
        $gte: today,
        $lte: oneDayFromNow
      },
      status: { $in: ['pending', 'in-progress'] }
    }).populate('clientId');

    // Projects due in 3 days
    const projectsDueIn3Days = await Project.find({
      deadline: {
        $gte: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
        $lte: threeDaysFromNow
      },
      status: { $in: ['pending', 'in-progress'] }
    }).populate('clientId');

    // Projects due in 7 days
    const projectsDueIn7Days = await Project.find({
      deadline: {
        $gte: new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000),
        $lte: sevenDaysFromNow
      },
      status: { $in: ['pending', 'in-progress'] }
    }).populate('clientId');

    // Send reminders for 1-day deadlines (high priority)
    for (const project of projectsDueIn1Day) {
      await sendDeadlineNotifications(project, 1, 'urgent');
    }

    // Send reminders for 3-day deadlines (medium priority)
    for (const project of projectsDueIn3Days) {
      await sendDeadlineNotifications(project, 3, 'high');
    }

    // Send reminders for 7-day deadlines (low priority)
    for (const project of projectsDueIn7Days) {
      await sendDeadlineNotifications(project, 7, 'medium');
    }

    console.log(`📅 Deadline reminders sent: ${projectsDueIn1Day.length + projectsDueIn3Days.length + projectsDueIn7Days.length} projects`);
  } catch (error) {
    console.error('Error in checkUpcomingDeadlines:', error);
  }
};

// Send deadline notifications via multiple channels
const sendDeadlineNotifications = async (project, daysUntil, priority) => {
  try {
    const client = project.clientId;
    
    // Create in-app notification
    await Notification.createNotification({
      type: 'deadline_reminder',
      title: `Deadline Reminder: ${daysUntil} day${daysUntil > 1 ? 's' : ''} remaining`,
      message: `Project "${project.title}" deadline is approaching in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
      clientId: client._id,
      projectId: project._id,
      userId: project.userId || null, // Assuming you have userId in project or get from admin
      priority: priority
    });

    // Send email reminder
    try {
      await sendDeadlineReminderEmail(client, project);
    } catch (emailError) {
      console.error('Failed to send deadline reminder email:', emailError);
    }

    // Send WhatsApp reminder if client has WhatsApp number
    if (client.whatsapp) {
      try {
        await sendDeadlineReminder(client, project);
      } catch (whatsappError) {
        console.error('Failed to send WhatsApp deadline reminder:', whatsappError);
      }
    }

  } catch (error) {
    console.error('Error sending deadline notifications:', error);
  }
};

// Check for overdue projects
const checkOverdueProjects = async () => {
  try {
    const today = new Date();
    
    const overdueProjects = await Project.find({
      deadline: { $lt: today },
      status: { $in: ['pending', 'in-progress'] }
    }).populate('clientId');

    for (const project of overdueProjects) {
      const daysOverdue = Math.ceil((today - new Date(project.deadline)) / (1000 * 60 * 60 * 24));
      
      // Create overdue notification
      await Notification.createNotification({
        type: 'system_alert',
        title: `Project Overdue: ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}`,
        message: `Project "${project.title}" is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`,
        clientId: project.clientId._id,
        projectId: project._id,
        userId: project.userId || null,
        priority: 'urgent'
      });
    }

    console.log(`⚠️ Overdue project alerts created: ${overdueProjects.length} projects`);
  } catch (error) {
    console.error('Error in checkOverdueProjects:', error);
  }
};

// Send invoice payment reminders
const sendInvoiceReminders = async () => {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Find unpaid invoices older than 30 days
    const overdueInvoices = await Invoice.find({
      status: 'sent',
      dueDate: { $lt: today },
      createdAt: { $gte: thirtyDaysAgo } // Don't spam very old invoices
    }).populate('clientId').populate('projectId');

    for (const invoice of overdueInvoices) {
      const daysOverdue = Math.ceil((today - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 1000 * 24));
      
      // Create overdue invoice notification
      await Notification.createNotification({
        type: 'system_alert',
        title: `Invoice Overdue: ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}`,
        message: `Invoice ${invoice.invoiceNumber} is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`,
        clientId: invoice.clientId._id,
        invoiceId: invoice._id,
        userId: invoice.userId || null,
        priority: 'high'
      });

      // Update reminder count
      invoice.remindersSent += 1;
      invoice.lastReminderDate = today;
      await invoice.save();
    }

    console.log(`💰 Invoice reminders sent: ${overdueInvoices.length} invoices`);
  } catch (error) {
    console.error('Error in sendInvoiceReminders:', error);
  }
};

// Cleanup old notifications (older than 90 days)
const cleanupOldNotifications = async () => {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const result = await Notification.deleteMany({
      createdAt: { $lt: ninetyDaysAgo },
      status: { $in: ['read', 'archived'] }
    });

    console.log(`🧹 Cleaned up ${result.deletedCount} old notifications`);
  } catch (error) {
    console.error('Error in cleanupOldNotifications:', error);
  }
};

// Manual trigger functions for testing
const triggerDeadlineCheck = async () => {
  console.log('🔧 Manually triggering deadline check...');
  await checkUpcomingDeadlines();
};

const triggerOverdueCheck = async () => {
  console.log('🔧 Manually triggering overdue check...');
  await checkOverdueProjects();
};

const triggerInvoiceReminders = async () => {
  console.log('🔧 Manually triggering invoice reminders...');
  await sendInvoiceReminders();
};

const triggerCleanup = async () => {
  console.log('🔧 Manually triggering cleanup...');
  await cleanupOldNotifications();
};

module.exports = {
  initializeCronJobs,
  triggerDeadlineCheck,
  triggerOverdueCheck,
  triggerInvoiceReminders,
  triggerCleanup
};
