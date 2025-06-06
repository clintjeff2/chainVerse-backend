// Email template functions for course notifications

const createApprovalEmailTemplate = (tutorName, courseTitle) => {
	return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Course Approved - ChainVerse Academy</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
            .success-icon { font-size: 48px; margin-bottom: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="success-icon">🎉</div>
                <h1>Course Approved!</h1>
            </div>
            <div class="content">
                <p>Dear <strong>${tutorName}</strong>,</p>
                
                <p>Congratulations! We're excited to inform you that your course "<strong>${courseTitle}</strong>" has been approved by our admin team.</p>
                
                <h3>What's Next?</h3>
                <ul>
                    <li>Your course is now ready to be published</li>
                    <li>You can make it available to students on ChainVerse Academy</li>
                    <li>Start earning from your educational content</li>
                </ul>
                
                <p>Thank you for contributing valuable content to our learning community. We appreciate your dedication to quality education.</p>
                
                <a href="#" class="button">View Your Course</a>
                
                <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
            </div>
            <div class="footer">
                <p>Best regards,<br><strong>ChainVerse Academy Team</strong></p>
                <p>This email was sent because you are a registered tutor on ChainVerse Academy.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

const createRejectionEmailTemplate = (
	tutorName,
	courseTitle,
	rejectionReason
) => {
	return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Course Review Required - ChainVerse Academy</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ff6b6b, #ee5a5a); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
            .warning-icon { font-size: 48px; margin-bottom: 10px; }
            .rejection-box { background: #fff3cd; border: 1px solid #ffeaa7; border-left: 4px solid #fdcb6e; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .rejection-title { color: #856404; font-weight: bold; margin-bottom: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="warning-icon">📝</div>
                <h1>Course Review Required</h1>
            </div>
            <div class="content">
                <p>Dear <strong>${tutorName}</strong>,</p>
                
                <p>Thank you for submitting your course "<strong>${courseTitle}</strong>" to ChainVerse Academy.</p>
                
                <p>After careful review, our admin team has identified some areas that need attention before your course can be approved.</p>
                
                <div class="rejection-box">
                    <div class="rejection-title">📋 Feedback from our Review Team:</div>
                    <p>${rejectionReason}</p>
                </div>
                
                <h3>Next Steps:</h3>
                <ul>
                    <li>Review the feedback provided above</li>
                    <li>Make the necessary updates to your course</li>
                    <li>Resubmit your course for review</li>
                    <li>Our team will review your updated submission promptly</li>
                </ul>
                
                <p>We appreciate your understanding and look forward to helping you create an outstanding learning experience for our students.</p>
                
                <a href="#" class="button">Edit Your Course</a>
                
                <p>If you have questions about the feedback or need clarification, please contact our support team.</p>
            </div>
            <div class="footer">
                <p>Best regards,<br><strong>ChainVerse Academy Team</strong></p>
                <p>This email was sent because you are a registered tutor on ChainVerse Academy.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

const createCourseSubmissionEmailTemplate = (tutorName, courseTitle) => {
	return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Course Submitted for Review - ChainVerse Academy</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
            .info-icon { font-size: 48px; margin-bottom: 10px; }
            .timeline { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .timeline-item { margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #eee; }
            .timeline-item:last-child { border-bottom: none; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="info-icon">⏳</div>
                <h1>Course Submitted for Review</h1>
            </div>
            <div class="content">
                <p>Dear <strong>${tutorName}</strong>,</p>
                
                <p>Thank you for submitting your course "<strong>${courseTitle}</strong>" to ChainVerse Academy!</p>
                
                <p>Your course has been successfully received and is now in our review queue.</p>
                
                <div class="timeline">
                    <h3>Review Process Timeline:</h3>
                    <div class="timeline-item">
                        <strong>✅ Submitted:</strong> Your course is now in review
                    </div>
                    <div class="timeline-item">
                        <strong>⏳ Under Review:</strong> Our team will evaluate your content (2-3 business days)
                    </div>
                    <div class="timeline-item">
                        <strong>📧 Notification:</strong> You'll receive an email with the review results
                    </div>
                    <div class="timeline-item">
                        <strong>🚀 Publication:</strong> Once approved, you can publish your course
                    </div>
                </div>
                
                <p>We review courses based on quality, accuracy, and alignment with our community standards. You'll hear from us within 2-3 business days.</p>
                
                <p>Thank you for your patience and for contributing to our educational community!</p>
            </div>
            <div class="footer">
                <p>Best regards,<br><strong>ChainVerse Academy Team</strong></p>
                <p>This email was sent because you are a registered tutor on ChainVerse Academy.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

module.exports = {
	createApprovalEmailTemplate,
	createRejectionEmailTemplate,
	createCourseSubmissionEmailTemplate,
};
