// template.js

// Password Reset Email Template
const getPasswordResetTemplate = (resetLink, userName = 'User') => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 10px;
        }
        .header { 
          background: #4CAF50; 
          color: white; 
          padding: 10px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background: #4CAF50;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          margin-top: 20px;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🔐 Password Reset Request</h2>
        </div>
        
        <div style="padding: 20px;">
          <p>Hi <strong>${userName}</strong>,</p>
          
          <p>We received a request to reset your password. 
          Click the button below to create a new password:</p>
          
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
          </div>
          
          <p>Or copy this link into your browser:</p>
          <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 5px;">
            ${resetLink}
          </p>
          
          <p>⚠️ This link will expire in <strong>1 hour</strong>.</p>
          
          <p>If you didn't request this, please ignore this email.</p>
        </div>
        
        <div class="footer">
          <p>© 2026 Your Company. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Welcome Email Template (example)
const getWelcomeTemplate = (userName, loginLink) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Welcome ${userName}! 🎉</h2>
        <p>Thank you for joining us!</p>
        <a href="${loginLink}">Login to your account</a>
      </div>
    </body>
    </html>
  `;
};

// Export all templates
export {
    getPasswordResetTemplate,
    getWelcomeTemplate
};