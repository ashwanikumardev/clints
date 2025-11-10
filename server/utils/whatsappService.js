const axios = require('axios');

// Send WhatsApp message using UltraMsg API
const sendWhatsAppMessage = async (phoneNumber, message) => {
  try {
    if (!process.env.WHATSAPP_API_URL || !process.env.WHATSAPP_API_KEY) {
      console.log('WhatsApp API not configured, skipping message send');
      return null;
    }

    // Clean phone number (remove any non-digits except +)
    const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
    
    const response = await axios.post(process.env.WHATSAPP_API_URL, {
      to: cleanPhone,
      body: message
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('WhatsApp message sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('WhatsApp message error:', error.response?.data || error.message);
    throw error;
  }
};

// Send project creation notification
const sendProjectCreatedMessage = async (client, project) => {
  const message = `🎉 *New Project Created*

Hello ${client.name}!

We've created a new project for you:

📋 *Project:* ${project.title}
📅 *Deadline:* ${project.deadline.toLocaleDateString()}
💰 *Amount:* $${project.amount}
📊 *Status:* ${project.status}

We're excited to work with you on this project! We'll keep you updated on our progress.

Best regards,
AugCodex Team`;

  return await sendWhatsAppMessage(client.whatsapp, message);
};

// Send project status update
const sendProjectStatusUpdate = async (client, project, oldStatus) => {
  const statusEmojis = {
    pending: '⏳',
    'in-progress': '🚀',
    completed: '✅',
    cancelled: '❌',
    'on-hold': '⏸️'
  };

  const message = `📊 *Project Status Update*

Hello ${client.name}!

Your project status has been updated:

📋 *Project:* ${project.title}
${statusEmojis[oldStatus]} *Previous Status:* ${oldStatus}
${statusEmojis[project.status]} *New Status:* ${project.status}
📅 *Deadline:* ${project.deadline.toLocaleDateString()}

${project.status === 'completed' ? 
  '🎉 Congratulations! Your project has been completed successfully!' :
  'We\'ll continue to keep you updated on the progress.'
}

Best regards,
AugCodex Team`;

  return await sendWhatsAppMessage(client.whatsapp, message);
};

// Send deadline reminder
const sendDeadlineReminder = async (client, project) => {
  const daysUntilDeadline = Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24));
  
  const message = `⏰ *Deadline Reminder*

Hello ${client.name}!

This is a friendly reminder about your upcoming project deadline:

📋 *Project:* ${project.title}
📅 *Deadline:* ${project.deadline.toLocaleDateString()}
⏳ *Days Remaining:* ${daysUntilDeadline} day${daysUntilDeadline !== 1 ? 's' : ''}
📊 *Current Status:* ${project.status}

We're working hard to meet your deadline. If you have any questions or concerns, please don't hesitate to reach out!

Best regards,
AugCodex Team`;

  return await sendWhatsAppMessage(client.whatsapp, message);
};

// Send invoice notification
const sendInvoiceNotification = async (client, invoice, project) => {
  const message = `💰 *Invoice Generated*

Hello ${client.name}!

We've generated an invoice for your completed project:

📋 *Project:* ${project.title}
🧾 *Invoice #:* ${invoice.invoiceNumber}
💰 *Amount:* $${invoice.total.toFixed(2)}
📅 *Due Date:* ${invoice.dueDate.toLocaleDateString()}

The invoice has been sent to your email address. Please review and process payment by the due date.

Thank you for choosing AugCodex!

Best regards,
AugCodex Team`;

  return await sendWhatsAppMessage(client.whatsapp, message);
};

// Send payment confirmation
const sendPaymentConfirmation = async (client, invoice, project) => {
  const message = `✅ *Payment Received*

Hello ${client.name}!

Thank you for your payment!

📋 *Project:* ${project.title}
🧾 *Invoice #:* ${invoice.invoiceNumber}
💰 *Amount Paid:* $${invoice.total.toFixed(2)}
📅 *Payment Date:* ${invoice.paymentDate.toLocaleDateString()}

Your payment has been successfully processed. We appreciate your business and look forward to working with you again!

Best regards,
AugCodex Team`;

  return await sendWhatsAppMessage(client.whatsapp, message);
};

// Send custom message
const sendCustomMessage = async (client, message) => {
  const customMessage = `👋 Hello ${client.name}!

${message}

Best regards,
AugCodex Team`;

  return await sendWhatsAppMessage(client.whatsapp, customMessage);
};

// Validate phone number format
const validatePhoneNumber = (phoneNumber) => {
  // Basic validation for international phone numbers
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber.replace(/[^\d+]/g, ''));
};

// Format phone number for WhatsApp
const formatPhoneNumber = (phoneNumber) => {
  // Remove all non-digits except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // Add + if not present and doesn't start with +
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
};

module.exports = {
  sendWhatsAppMessage,
  sendProjectCreatedMessage,
  sendProjectStatusUpdate,
  sendDeadlineReminder,
  sendInvoiceNotification,
  sendPaymentConfirmation,
  sendCustomMessage,
  validatePhoneNumber,
  formatPhoneNumber
};
