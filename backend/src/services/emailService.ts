import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { INotice } from '../models/Notice';
import { IUser } from '../models/User';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail', // Default recommended service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendPlacementNotification = async (students: IUser[], notice: INotice, adminEmail: string): Promise<void> => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email config (EMAIL_USER/EMAIL_PASS) missing in .env. Skipping email notifications.');
    return;
  }

  const baseHtmlTemplate = (student: IUser) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
    </head>
    <body style="margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6;">
      <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-top: 4px solid #4F46E5;">
        <h1 style="color: #111827; font-size: 24px; margin-bottom: 20px;">New Placement Opportunity: ${notice.companyName}</h1>
        <p style="color: #374151; font-size: 16px;">Hello ${student.name || 'Student'},</p>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.5;">Great news! A new placement opportunity matching your profile has been posted on the portal.</p>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 6px; margin: 25px 0;">
          <div style="margin-bottom: 12px;"><span style="font-weight: 600; color: #374151;">Role:</span> <span style="color: #4b5563;">${notice.role || '-'} (${notice.jobType})</span></div>
          <div style="margin-bottom: 12px;"><span style="font-weight: 600; color: #374151;">Package:</span> <span style="color: #4b5563;">${notice.packageOffered}</span></div>
          <div style="margin-bottom: 12px;"><span style="font-weight: 600; color: #374151;">Location:</span> <span style="color: #4b5563;">${notice.location || '-'}</span></div>
          <div style="margin-bottom: 12px;"><span style="font-weight: 600; color: #374151;">Eligibility:</span> <span style="color: #4b5563;">Min CGPA: ${notice.minCGPA || 0} | Max Backlogs: ${notice.backlogCriteria || 0}</span></div>
          <div style="margin-bottom: 0;"><span style="font-weight: 600; color: #374151;">Apply By:</span> <span style="color: #dc2626; font-weight: bold;">${notice.deadline ? new Date(notice.deadline).toLocaleDateString() : 'ASAP'}</span></div>
        </div>

        <p style="color: #4b5563; font-size: 15px; line-height: 1.5;">Review the full job description and apply before the deadline using the portal link below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${notice.link}" style="display: inline-block; background: #4F46E5; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold;">View Details & Apply</a>
        </div>
        
        <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 13px; color: #9ca3af; text-align: center;">
          <p>This is an automated notification from your College Placement Portal.</p>
          <p>If you have already been placed, please ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  console.log(`Starting to dispatch ${students.length} opportunity emails.`);

  const sends = students.map(async (student) => {
    if (!student.email) return;
    try {
      const mailOptions = {
        from: `"Placement Admin" <${process.env.EMAIL_USER}>`,
        replyTo: adminEmail,
        to: student.email,
        subject: `New Placement Opportunity - ${notice.companyName} ${notice.role || ''}`,
        html: baseHtmlTemplate(student),
      };
      await transporter.sendMail(mailOptions);
    } catch (err) {
      console.error(`Failed sending mail to ${student.email}:`, err);
    }
  });

  // Await all async requests without failing fast
  await Promise.allSettled(sends);
  console.log('Finished dispatching batch placement opportunity emails.');
};
