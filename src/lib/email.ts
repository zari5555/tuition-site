import nodemailer from "nodemailer";

function getTransporter() {
  const smtpHost = (process.env.SMTP_HOST || "smtp.gmail.com").replace(/['"\s]/g, "");
  const smtpPort = Number(process.env.SMTP_PORT) || 465;
  const smtpUser = process.env.SMTP_USER?.replace(/['"\s]/g, "");
  const smtpPass = process.env.SMTP_PASS?.replace(/['"\s]/g, "");
  const smtpFrom = process.env.SMTP_FROM ? process.env.SMTP_FROM.replace(/['"]/g, "").trim() : `Tuitionss.com <${smtpUser || "noreply@tuitionss.com"}>`;

  if (!smtpUser || !smtpPass) {
    return null;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for 587
    auth: { user: smtpUser, pass: smtpPass },
    tls: { rejectUnauthorized: false }
  });

  return { transporter, smtpFrom, smtpUser };
}

/**
 * 1. Sent when a Student or Teacher submits an application
 */
export async function sendApplicationReceivedEmail({
  to,
  name,
  role,
}: {
  to: string;
  name: string;
  role: "STUDENT" | "TEACHER";
}) {
  const mailer = getTransporter();
  if (!mailer) {
    console.log(`[Email Skipped] SMTP credentials missing in env. Target: ${to}`);
    return;
  }

  const subject = `Application Received - Tuitionss.com`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; rounded: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 32px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Tuitionss.com</h1>
        <p style="margin-top: 8px; opacity: 0.9; font-size: 14px;">Application Confirmation</p>
      </div>
      <div style="padding: 32px; color: #1e293b;">
        <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Hello ${name},</h2>
        <p style="line-height: 1.6; color: #475569;">
          Thank you for applying as a <strong>${role === "TEACHER" ? "Teacher" : "Student"}</strong> at Tuitionss.com!
        </p>
        <p style="line-height: 1.6; color: #475569;">
          We have safely received your application details. Our admissions team is currently reviewing your profile and will get back to you shortly.
        </p>
        <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 24px 0; border-radius: 8px;">
          <p style="margin: 0; font-size: 13px; color: #334155;">
            <strong>Status:</strong> Under Review ⏳<br/>
            You will receive a follow-up email with your portal credentials once approved!
          </p>
        </div>
        <p style="font-size: 13px; color: #94a3b8; margin-top: 32px; border-t: 1px solid #f1f5f9; padding-top: 16px;">
          © ${new Date().getFullYear()} Tuitionss.com. All rights reserved.
        </p>
      </div>
    </div>
  `;

  try {
    await mailer.transporter.sendMail({ from: mailer.smtpFrom, to, subject, html });
    console.log(`[Email Sent] Application received notification sent to ${to}`);
  } catch (error) {
    console.error(`[Email Error] Failed to send email to ${to}:`, error);
  }
}

/**
 * 2. Sent when Admin approves an application (provides login credentials)
 */
export async function sendApplicationApprovedEmail({
  to,
  name,
  role,
  email,
  defaultPassword,
}: {
  to: string;
  name: string;
  role: "STUDENT" | "TEACHER";
  email: string;
  defaultPassword?: string;
}) {
  const mailer = getTransporter();
  if (!mailer) {
    console.log(`[Email Skipped] SMTP credentials missing in env. Target: ${to}`);
    return;
  }

  const loginUrl = process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/login` : "https://www.tuitionss.com/login";
  const subject = `🎉 Congratulations! Your ${role === "TEACHER" ? "Teacher" : "Student"} Application Approved - Tuitionss.com`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 32px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Tuitionss.com</h1>
        <p style="margin-top: 8px; opacity: 0.9; font-size: 14px;">Application Accepted!</p>
      </div>
      <div style="padding: 32px; color: #1e293b;">
        <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Welcome, ${name}!</h2>
        <p style="line-height: 1.6; color: #475569;">
          We are thrilled to inform you that your application as a <strong>${role === "TEACHER" ? "Teacher" : "Student"}</strong> has been officially approved!
        </p>
        
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; margin: 24px 0; border-radius: 12px;">
          <h3 style="margin-top: 0; font-size: 15px; color: #166534;">🔑 Your Portal Access Credentials</h3>
          <p style="margin: 6px 0; font-size: 14px; color: #15803d;"><strong>Email:</strong> ${email}</p>
          ${defaultPassword ? `<p style="margin: 6px 0; font-size: 14px; color: #15803d;"><strong>Default Password:</strong> ${defaultPassword}</p>` : ""}
          <p style="margin-top: 12px; font-size: 12px; color: #166534;"><em>Please log in and update your password if needed.</em></p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${loginUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block;">
            Log in to Your Portal
          </a>
        </div>

        <p style="font-size: 13px; color: #94a3b8; margin-top: 32px; border-t: 1px solid #f1f5f9; padding-top: 16px;">
          © ${new Date().getFullYear()} Tuitionss.com. Empowering education worldwide.
        </p>
      </div>
    </div>
  `;

  try {
    await mailer.transporter.sendMail({ from: mailer.smtpFrom, to, subject, html });
    console.log(`[Email Sent] Application approval email sent to ${to}`);
  } catch (error) {
    console.error(`[Email Error] Failed to send email to ${to}:`, error);
  }
}

/**
 * 3. Sent when Admin creates & allots a Tuition Class to Student & Teacher
 */
export async function sendClassAllottedEmail({
  to,
  recipientName,
  subjectName,
  partnerName,
  partnerRole,
  grade,
}: {
  to: string;
  recipientName: string;
  subjectName: string;
  partnerName: string;
  partnerRole: "Instructor" | "Student";
  grade?: string;
}) {
  const mailer = getTransporter();
  if (!mailer) {
    console.log(`[Email Skipped] SMTP credentials missing in env. Target: ${to}`);
    return;
  }

  const dashboardUrl = process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/login` : "https://www.tuitionss.com/login";
  const subject = `📚 New Class Assigned: ${subjectName} - Tuitionss.com`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 32px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Tuitionss.com</h1>
        <p style="margin-top: 8px; opacity: 0.9; font-size: 14px;">New Tuition Class Assigned</p>
      </div>
      <div style="padding: 32px; color: #1e293b;">
        <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Hello ${recipientName},</h2>
        <p style="line-height: 1.6; color: #475569;">
          A new tuition class for <strong>${subjectName}</strong> has been successfully assigned to your account!
        </p>

        <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; padding: 20px; margin: 24px 0; border-radius: 12px;">
          <h3 style="margin-top: 0; font-size: 15px; color: #5b21b6;">📖 Class Details</h3>
          <p style="margin: 6px 0; font-size: 14px; color: #6d28d9;"><strong>Subject:</strong> ${subjectName}</p>
          ${grade ? `<p style="margin: 6px 0; font-size: 14px; color: #6d28d9;"><strong>Grade / Class:</strong> ${grade}</p>` : ""}
          <p style="margin: 6px 0; font-size: 14px; color: #6d28d9;"><strong>${partnerRole}:</strong> ${partnerName}</p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${dashboardUrl}" style="background-color: #4f46e5; color: white; padding: 14px 28px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block;">
            View Class & Schedule
          </a>
        </div>

        <p style="font-size: 13px; color: #94a3b8; margin-top: 32px; border-t: 1px solid #f1f5f9; padding-top: 16px;">
          © ${new Date().getFullYear()} Tuitionss.com. Empowering education worldwide.
        </p>
      </div>
    </div>
  `;

  try {
    await mailer.transporter.sendMail({ from: mailer.smtpFrom, to, subject, html });
    console.log(`[Email Sent] Class allotted notification sent to ${to}`);
  } catch (error) {
    console.error(`[Email Error] Failed to send email to ${to}:`, error);
  }
}

/**
 * 4. Sent when a user requests a password reset
 */
export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  const mailer = getTransporter();
  if (!mailer) {
    console.log(`[Email Skipped] SMTP credentials missing in env. Target: ${to}`);
    return;
  }

  const subject = `🔐 Reset Your Password - Tuitionss.com`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 32px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Tuitionss.com</h1>
        <p style="margin-top: 8px; opacity: 0.9; font-size: 14px;">Password Reset Request</p>
      </div>
      <div style="padding: 32px; color: #1e293b;">
        <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Hello ${name},</h2>
        <p style="line-height: 1.6; color: #475569;">
          We received a request to reset the password for your Tuitionss.com account. Click the button below to set a new password.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 14px 32px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block;">
            Reset My Password
          </a>
        </div>

        <div style="background-color: #fef9c3; border: 1px solid #fde68a; padding: 16px; border-radius: 10px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 13px; color: #713f12;">
            ⚠️ This link will expire in <strong>1 hour</strong>. If you did not request a password reset, please ignore this email — your account is safe.
          </p>
        </div>

        <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">
          Or copy and paste this URL into your browser:<br/>
          <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
        </p>

        <p style="font-size: 13px; color: #94a3b8; margin-top: 32px; border-t: 1px solid #f1f5f9; padding-top: 16px;">
          © ${new Date().getFullYear()} Tuitionss.com. Empowering education worldwide.
        </p>
      </div>
    </div>
  `;

  try {
    await mailer.transporter.sendMail({ from: mailer.smtpFrom, to, subject, html });
    console.log(`[Email Sent] Password reset email sent to ${to}`);
  } catch (error) {
    console.error(`[Email Error] Failed to send reset email to ${to}:`, error);
  }
}

/**
 * 5. Sent when Admin approves an application — user sets their own password via a link
 */
export async function sendSetPasswordEmail({
  to,
  name,
  role,
  setPasswordUrl,
}: {
  to: string;
  name: string;
  role: "STUDENT" | "TEACHER";
  setPasswordUrl: string;
}) {
  const mailer = getTransporter();
  if (!mailer) {
    console.log(`[Email Skipped] SMTP credentials missing in env. Target: ${to}`);
    return;
  }

  const roleLabel = role === "TEACHER" ? "Teacher" : "Student";
  const subject = `🎉 Welcome to Tuitionss.com — Set Your Password`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 32px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Tuitionss.com</h1>
        <p style="margin-top: 8px; opacity: 0.9; font-size: 14px;">Application Approved 🎉</p>
      </div>
      <div style="padding: 32px; color: #1e293b;">
        <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Welcome, ${name}!</h2>
        <p style="line-height: 1.6; color: #475569;">
          Congratulations! Your application as a <strong>${roleLabel}</strong> at Tuitionss.com has been officially approved.
        </p>
        <p style="line-height: 1.6; color: #475569;">
          To access your dashboard, please set your password using the button below. This link is valid for <strong>24 hours</strong>.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${setPasswordUrl}" style="background-color: #059669; color: white; padding: 14px 32px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block;">
            Set My Password
          </a>
        </div>

        <div style="background-color: #fef9c3; border: 1px solid #fde68a; padding: 16px; border-radius: 10px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 13px; color: #713f12;">
            ⚠️ This link expires in <strong>24 hours</strong>. If it expires, use the <a href="${process.env.NEXTAUTH_URL || "https://www.tuitionss.com"}/forgot-password" style="color: #92400e;">forgot password</a> page to request a new one.
          </p>
        </div>

        <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">
          Or copy and paste this URL into your browser:<br/>
          <a href="${setPasswordUrl}" style="color: #059669;">${setPasswordUrl}</a>
        </p>

        <p style="font-size: 13px; color: #94a3b8; margin-top: 32px; border-t: 1px solid #f1f5f9; padding-top: 16px;">
          © ${new Date().getFullYear()} Tuitionss.com. Empowering education worldwide.
        </p>
      </div>
    </div>
  `;

  try {
    await mailer.transporter.sendMail({ from: mailer.smtpFrom, to, subject, html });
    console.log(`[Email Sent] Set-password email sent to ${to}`);
  } catch (error) {
    console.error(`[Email Error] Failed to send set-password email to ${to}:`, error);
  }
}
