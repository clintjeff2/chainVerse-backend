const Notification = require("../models/Notification");

class NotificationService {
  // Create notification for course updates
  async createCourseUpdateNotification(
    userId,
    courseTitle,
    updateType = "info"
  ) {
    try {
      const notification = new Notification({
        userId,
        title: "Course Updated",
        message: `The course "${courseTitle}" has been updated with new content.`,
        type: updateType,
      });
      await notification.save();
      return notification;
    } catch (error) {
      console.error("Error creating course update notification:", error);
      throw error;
    }
  }

  // Create notification for course approval
  async createCourseApprovalNotification(userId, courseTitle, approved = true) {
    try {
      const notification = new Notification({
        userId,
        title: approved ? "Course Approved" : "Course Rejected",
        message: approved
          ? `Your course "${courseTitle}" has been approved and is now live!`
          : `Your course "${courseTitle}" requires changes before approval.`,
        type: approved ? "success" : "warning",
      });
      await notification.save();
      return notification;
    } catch (error) {
      console.error("Error creating course approval notification:", error);
      throw error;
    }
  }

  // Create system notification
  async createSystemNotification(userId, title, message, type = "info") {
    try {
      const notification = new Notification({
        userId,
        title,
        message,
        type,
      });
      await notification.save();
      return notification;
    } catch (error) {
      console.error("Error creating system notification:", error);
      throw error;
    }
  }

  // Bulk create notifications for multiple users
  async createBulkNotifications(userIds, title, message, type = "info") {
    try {
      const notifications = userIds.map((userId) => ({
        userId,
        title,
        message,
        type,
      }));

      const result = await Notification.insertMany(notifications);
      return result;
    } catch (error) {
      console.error("Error creating bulk notifications:", error);
      throw error;
    }
  }

  // Clean up old archived notifications (utility method)
  async cleanupOldNotifications(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await Notification.deleteMany({
        archived: true,
        createdAt: { $lt: cutoffDate },
      });

      return result.deletedCount;
    } catch (error) {
      console.error("Error cleaning up old notifications:", error);
      throw error;
    }
  }
}

module.exports = new NotificationService();
