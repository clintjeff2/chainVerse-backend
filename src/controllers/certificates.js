const { v4: uuidv4 } = require('uuid');
const Certificate = require("../models/certificate");
const { sendCertificateEmail } = require('../emailUtils');
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');

// POST /certificates/generate
const generateCertificate = async (req, res) => {
  try {
    const {
      studentId,
      studentFullName,
      studentEmail,
      courseTitle,
      courseInstructorName,
    } = req.body;

    const certificateId = uuidv4();
    const completionDate = new Date().toISOString();
    const verificationLink = `https://chainverse.academy/certificates/view/${certificateId}`;

    const newCertificate = new Certificate({
      certificateId,
      studentId,
      studentFullName,
      studentEmail,
      courseTitle,
      courseInstructorName,
      completionDate,
      issuedBy: 'ChainVerse Academy',
      verificationLink,
    });

    await newCertificate.save();

    await sendCertificateEmail(
      studentEmail,
      studentFullName,
      courseTitle,
      verificationLink
    );

    res.status(200).json({
      message: 'Certificate generated and email sent!',
      certificate: newCertificate,
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// GET /certificates/view/:certificateId
const viewCertificate = async (req, res) => {
  const { certificateId } = req.params;

  try {
    const certificate = await Certificate.findOne({ certificateId }); // Corrected to match `certificateId` field

    if (!certificate) {
      return res.status(404).send('Certificate not found');
    }

    const templatePath = path.join(__dirname, '../templates/certificateTemplate.html');
    const templateContent = fs.readFileSync(templatePath, 'utf-8');

    const html = ejs.render(templateContent, certificate.toObject());

    res.send(html);
  } catch (error) {
    console.error('Error viewing certificate:', error);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = {
  generateCertificate,
  viewCertificate,
};
