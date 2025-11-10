const nodemailer = require('nodemailer');
const path = require('path');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Send invoice email
const sendInvoiceEmail = async (invoice) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"AugCodex" <${process.env.SMTP_USER}>`,
      to: invoice.clientId.email,
      subject: `Invoice ${invoice.invoiceNumber} from AugCodex`,
      html: generateInvoiceEmailTemplate(invoice),
      attachments: invoice.pdfPath ? [{
        filename: `invoice-${invoice.invoiceNumber}.pdf`,
        path: path.join(__dirname, '..', invoice.pdfPath)
      }] : []
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Invoice email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

// Send project notification email
const sendProjectNotificationEmail = async (client, project, message) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"AugCodex" <${process.env.SMTP_USER}>`,
      to: client.email,
      subject: `Project Update: ${project.title}`,
      html: generateProjectNotificationTemplate(client, project, message)
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Project notification email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Project notification email error:', error);
    throw error;
  }
};

// Send deadline reminder email
const sendDeadlineReminderEmail = async (client, project) => {
  try {
    const transporter = createTransporter();
    
    const daysUntilDeadline = Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    
    const mailOptions = {
      from: `"AugCodex" <${process.env.SMTP_USER}>`,
      to: client.email,
      subject: `Deadline Reminder: ${project.title}`,
      html: generateDeadlineReminderTemplate(client, project, daysUntilDeadline)
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Deadline reminder email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Deadline reminder email error:', error);
    throw error;
  }
};

// Email templates
const generateInvoiceEmailTemplate = (invoice) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .invoice-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>AugCodex</h1>
                <p>Professional Web Development Services</p>
            </div>
            <div class="content">
                <h2>Invoice ${invoice.invoiceNumber}</h2>
                <p>Dear ${invoice.clientId.name},</p>
                <p>Thank you for choosing AugCodex for your web development needs. Please find your invoice attached.</p>
                
                <div class="invoice-details">
                    <h3>Invoice Details</h3>
                    <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
                    <p><strong>Issue Date:</strong> ${invoice.issueDate.toLocaleDateString()}</p>
                    <p><strong>Due Date:</strong> ${invoice.dueDate.toLocaleDateString()}</p>
                    <p><strong>Amount:</strong> $${invoice.total.toFixed(2)}</p>
                </div>

                <p>Please review the attached invoice and process payment by the due date. If you have any questions or concerns, please don't hesitate to contact us.</p>
                
                <div class="footer">
                    <p>Best regards,<br>The AugCodex Team</p>
                    <p>Email: contact@augcodex.com | Phone: +1 (555) 123-4567</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
};

const generateProjectNotificationTemplate = (client, project, message) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Project Update: ${project.title}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .project-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-in-progress { background: #dbeafe; color: #1e40af; }
            .status-completed { background: #d1fae5; color: #065f46; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>AugCodex</h1>
                <p>Project Update Notification</p>
            </div>
            <div class="content">
                <h2>Project Update</h2>
                <p>Dear ${client.name},</p>
                <p>${message}</p>
                
                <div class="project-details">
                    <h3>Project Details</h3>
                    <p><strong>Project:</strong> ${project.title}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-${project.status}">${project.status}</span></p>
                    <p><strong>Deadline:</strong> ${project.deadline.toLocaleDateString()}</p>
                </div>

                <p>We'll continue to keep you updated on the progress of your project. If you have any questions, please feel free to reach out.</p>
                
                <div class="footer">
                    <p>Best regards,<br>The AugCodex Team</p>
                    <p>Email: contact@augcodex.com | Phone: +1 (555) 123-4567</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
};

const generateDeadlineReminderTemplate = (client, project, daysUntilDeadline) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Deadline Reminder: ${project.title}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .reminder-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .project-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>⏰ Deadline Reminder</h1>
                <p>AugCodex Project Management</p>
            </div>
            <div class="content">
                <h2>Upcoming Deadline</h2>
                <p>Dear ${client.name},</p>
                
                <div class="reminder-box">
                    <h3>⚠️ Important Reminder</h3>
                    <p>Your project deadline is approaching in <strong>${daysUntilDeadline} day${daysUntilDeadline !== 1 ? 's' : ''}</strong>.</p>
                </div>
                
                <div class="project-details">
                    <h3>Project Details</h3>
                    <p><strong>Project:</strong> ${project.title}</p>
                    <p><strong>Deadline:</strong> ${project.deadline.toLocaleDateString()}</p>
                    <p><strong>Current Status:</strong> ${project.status}</p>
                </div>

                <p>We're working diligently to meet your deadline. If you have any questions or need to discuss the timeline, please don't hesitate to contact us.</p>
                
                <div class="footer">
                    <p>Best regards,<br>The AugCodex Team</p>
                    <p>Email: contact@augcodex.com | Phone: +1 (555) 123-4567</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
};

module.exports = {
  sendInvoiceEmail,
  sendProjectNotificationEmail,
  sendDeadlineReminderEmail
};
