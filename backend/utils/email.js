// utils/email.js
const nodemailer = require('nodemailer');
const { logger } = require('../middleware/loggers');

/**
 * Send email using nodemailer
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Email message (plaintext)
 * @param {string} options.html - Email HTML content (optional)
 * @returns {Promise} - Nodemailer send result
 */
const sendEmail = async (options) => {
    // 1) Create a transporter
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    // 2) Define email options
    const mailOptions = {
        from: `Medical Waste System <${process.env.EMAIL_FROM}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html
    };

    // 3) Send email
    try {
        const info = await transporter.sendMail(mailOptions);
        logger.info(`Email sent: ${info.messageId}`);
        return info;
    } catch (error) {
        logger.error(`Error sending email: ${error.message}`);
        throw error;
    }
};

/**
 * Send alert email for overfilled bins
 * @param {Object} bin - Waste bin data
 * @param {Array} recipients - List of recipient emails
 * @returns {Promise} - Nodemailer send result
 */
const sendAlertEmail = async (bin, recipients) => {
    const subject = `ALERT: Waste Bin ${bin.binId} is ${bin.fullness}% full`;

    const message = `
    Attention Required:
    
    Waste bin ${bin.binId} in ${bin.department} has reached ${bin.fullness}% capacity.
    This exceeds the alert threshold of ${bin.alertThreshold}%.
    
    Bin Details:
    - Waste Type: ${bin.wasteType}
    - Location: Floor ${bin.location.floor || '1'}, Room ${bin.location.room || 'Unknown'}
    - Last Update: ${new Date(bin.lastUpdate).toLocaleString()}
    
    Please schedule collection as soon as possible.
    
    Medical Waste Management System
  `;

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
      <h2 style="color: #d9534f;">Attention Required</h2>
      <p>Waste bin <strong>${bin.binId}</strong> in <strong>${bin.department}</strong> has reached <strong style="color: #d9534f;">${bin.fullness}%</strong> capacity.</p>
      <p>This exceeds the alert threshold of ${bin.alertThreshold}%.</p>
      
      <h3>Bin Details:</h3>
      <ul>
        <li><strong>Waste Type:</strong> ${bin.wasteType}</li>
        <li><strong>Location:</strong> Floor ${bin.location.floor || '1'}, Room ${bin.location.room || 'Unknown'}</li>
        <li><strong>Last Update:</strong> ${new Date(bin.lastUpdate).toLocaleString()}</li>
      </ul>
      
      <p style="color: #d9534f; font-weight: bold;">Please schedule collection as soon as possible.</p>
      
      <p style="margin-top: 30px; font-size: 12px; color: #777;">
        Medical Waste Management System
      </p>
    </div>
  `;

    // Send email to all recipients
    for (const email of recipients) {
        await sendEmail({
            email,
            subject,
            message,
            html
        });
    }
};

module.exports = {
    sendEmail,
    sendAlertEmail
};