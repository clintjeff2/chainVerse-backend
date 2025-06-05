const nodemailer = require('nodemailer');

// Create a reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.EMAIL_USER, // Your email from .env
		pass: process.env.EMAIL_PASS, // Your app password from .env
	},
});

// Function to send email
const sendCertificateEmail = async (
	to_email,
	student_name,
	course_title,
	verification_link
) => {
	const mailOptions = {
		from: process.env.EMAIL_USER, // Sender's email
		to: to_email, // Recipient's email
		subject: `Your Certificate for ${course_title}`,
		html: `
      <h3>Congratulations, ${student_name}!</h3>
      <p>You have successfully completed the course: <strong>${course_title}</strong>.</p>
      <p>Click the link below to verify your certificate:</p>
      <a href="${verification_link}">Verify Certificate</a>
    `,
	};

	try {
		await transporter.sendMail(mailOptions);
		console.log('Certificate email sent!');
	} catch (error) {
		console.error('Error sending email:', error);
		throw new Error('Failed to send certificate email.');
	}
};

// Create email transporter
const createTransporter = () => {
	return nodemailer.createTransporter({
		host: process.env.SMTP_HOST || 'smtp.gmail.com',
		port: process.env.SMTP_PORT || 587,
		secure: false, // true for 465, false for other ports
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASS,
		},
	});
};

// Send email function
exports.sendEmailTutorCourseAlert = async (to, subject, html, text = null) => {
	try {
		if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
			console.warn('SMTP credentials not configured. Email not sent.');
			return;
		}

		const transporter = createTransporter();

		const mailOptions = {
			from: `"ChainVerse Academy" <${process.env.SMTP_USER}>`,
			to,
			subject,
			html,
			text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
		};

		const info = await transporter.sendMail(mailOptions);
		console.log('Email sent successfully:', info.messageId);
		return info;
	} catch (error) {
		console.error('Error sending email:', error);
		throw error;
	}
};

// Send bulk emails
exports.sendBulkEmailTutorCourseAlert = async (
	recipients,
	subject,
	html,
	text = null
) => {
	try {
		const promises = recipients.map((recipient) =>
			this.sendEmail(recipient, subject, html, text)
		);

		const results = await Promise.allSettled(promises);

		const successful = results.filter(
			(result) => result.status === 'fulfilled'
		).length;
		const failed = results.filter(
			(result) => result.status === 'rejected'
		).length;

		console.log(
			`Bulk email results: ${successful} successful, ${failed} failed`
		);
		return { successful, failed };
	} catch (error) {
		console.error('Error sending bulk emails:', error);
		throw error;
	}
};

module.exports = {
	sendCertificateEmail,
	sendEmailTutorCourseAlert,
	sendBulkEmailTutorCourseAlert,
};
