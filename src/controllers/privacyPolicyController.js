const PrivacyPolicy = require('../models/privacyPolicy');
const { sanitizeHtmlContent } = require('../utils/sanitizeHtmlContent'); // Corrected import

// Create Privacy Policy
exports.createPrivacyPolicy = async (req, res) => {
  try {
    const { title, content } = req.body;

    // Validate input
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }

    // Sanitize content
    const sanitizedContent = sanitizeHtmlContent(content); // Use sanitizeHtmlContent instead of sanitizeHtml

    const newPolicy = new PrivacyPolicy({ title, content: sanitizedContent });
    await newPolicy.save();

    res.status(201).json({ message: 'Privacy policy created successfully.', data: newPolicy });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create privacy policy.', details: error.message });
  }
};

// Retrieve All Privacy Policies
exports.getAllPrivacyPolicies = async (req, res) => {
  try {
    const policies = await PrivacyPolicy.find().sort({ createdAt: -1 });
    res.status(200).json({ data: policies });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve privacy policies.', details: error.message });
  }
};

// Retrieve Privacy Policy by ID
exports.getPrivacyPolicyById = async (req, res) => {
  try {
    const { id } = req.params;
    const policy = await PrivacyPolicy.findById(id);

    if (!policy) {
      return res.status(404).json({ error: 'Privacy policy not found.' });
    }

    res.status(200).json({ data: policy });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve privacy policy.', details: error.message });
  }
};

// Update Privacy Policy
exports.updatePrivacyPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    // Validate input
    if (!title && !content) {
      return res.status(400).json({ error: 'At least one field (title or content) is required for update.' });
    }

    // Sanitize content
    const sanitizedContent = content ? sanitizeHtmlContent(content) : undefined; // Use sanitizeHtmlContent instead of sanitizeHtml

    const updatedPolicy = await PrivacyPolicy.findByIdAndUpdate(
      id,
      { title, content: sanitizedContent, updatedAt: Date.now() },
      { new: true }
    );

    if (!updatedPolicy) {
      return res.status(404).json({ error: 'Privacy policy not found.' });
    }

    res.status(200).json({ message: 'Privacy policy updated successfully.', data: updatedPolicy });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update privacy policy.', details: error.message });
  }
};

// Delete Privacy Policy
exports.deletePrivacyPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPolicy = await PrivacyPolicy.findByIdAndDelete(id);

    if (!deletedPolicy) {
      return res.status(404).json({ error: 'Privacy policy not found.' });
    }

    res.status(200).json({ message: 'Privacy policy deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete privacy policy.', details: error.message });
  }
};