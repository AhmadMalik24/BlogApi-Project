// client.js
import nodemailer from 'nodemailer';
import sgTransport from 'nodemailer-sendgrid-transport';
import dotenv from 'dotenv';

dotenv.config();

// ✅ Create transporter with SendGrid
const transporter = nodemailer.createTransport(
  sgTransport({
    auth: {
      api_key: process.env.SENDGRID_API_KEY
    }
  })
);

// ✅ Send email function
export const sendEmail = async (to, subject, htmlContent) => {
  try {
    const mailOptions = {
      from: process.env.SENDGRID_FROM_EMAIL,  // ✅ Your verified email
      to: to,
      subject: subject,
      html: htmlContent,  // ✅ Use html for formatting
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}`);
    console.log('Message ID:', info.messageId);
    return info;
    
  } catch (error) {
    console.error(`❌ Error sending email to ${to}:`, error);
    throw error;
  }
};