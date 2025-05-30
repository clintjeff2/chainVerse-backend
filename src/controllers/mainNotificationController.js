const Notification = require("../models/Notification");
const {
  createNotificationDto,
  getNotificationsQueryDto,
} = require("../dto/notificationDto");
const mongoose = require("mongoose");

class NotificationController {
  // Create a new notification
  async createNotification(req, res) {
    try {
      const { error, value } = createNotificationDto.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      // Verify userId is valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(value.userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID format",
        });
      }

      const notification = new Notification(value);
      await notification.save();

      // Populate user info for response
      await notification.populate("userId", "name email");

      res.status(201).json({
        success: true,
        message: "Notification created successfully",
        data: notification,
      });
    } catch (error) {
      console.error("Create notification error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create notification",
      });
    }
  }

  // Get notifications with filtering
  async getNotifications(req, res) {
    try {
      const { error, value } = getNotificationsQueryDto.validate(req.query);

      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      const { unread, archived, page, limit, type } = value;
      const userId = req.user._id;

      // Build query
      const query = { userId };

      if (unread) {
        query.read = false;
      }

      // Default behavior: don't show archived unless explicitly requested
      if (archived === true) {
        query.archived = true;
      } else if (archived === false) {
        query.archived = false;
      } else {
        query.archived = false; // Default: hide archived
      }

      if (type) {
        query.type = type;
      }

      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        Notification.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Notification.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve notifications",
      });
    }
  }

  // Get archived notifications
  async getArchivedNotifications(req, res) {
    try {
      const { error, value } = getNotificationsQueryDto.validate(req.query);

      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.details.map((detail) => detail.message),
        });
      }

      const { page, limit, type } = value;
      const userId = req.user._id;

      const query = { userId, archived: true };

      if (type) {
        query.type = type;
      }

      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        Notification.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Notification.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      });
    } catch (error) {
      console.error("Get archived notifications error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve archived notifications",
      });
    }
  }

  // Mark single notification as read
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid notification ID format",
        });
      }

      const notification = await Notification.findOneAndUpdate(
        { _id: id, userId },
        { read: true },
        { new: true, runValidators: true }
      );

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification not found or access denied",
        });
      }

      res.json({
        success: true,
        message: "Notification marked as read",
        data: notification,
      });
    } catch (error) {
      console.error("Mark as read error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mark notification as read",
      });
    }
  }

  // Mark all notifications as read
  async markAllAsRead(req, res) {
    try {
      const userId = req.user._id;

      const result = await Notification.updateMany(
        { userId, read: false },
        { read: true }
      );

      res.json({
        success: true,
        message: `${result.modifiedCount} notifications marked as read`,
        data: {
          modifiedCount: result.modifiedCount,
        },
      });
    } catch (error) {
      console.error("Mark all as read error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mark all notifications as read",
      });
    }
  }

  // Archive notification
  async archiveNotification(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid notification ID format",
        });
      }

      const notification = await Notification.findOneAndUpdate(
        { _id: id, userId },
        { archived: true },
        { new: true, runValidators: true }
      );

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification not found or access denied",
        });
      }

      res.json({
        success: true,
        message: "Notification archived successfully",
        data: notification,
      });
    } catch (error) {
      console.error("Archive notification error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to archive notification",
      });
    }
  }

  // Get notification statistics
  async getNotificationStats(req, res) {
    try {
      const userId = req.user._id;

      const stats = await Notification.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            unread: { $sum: { $cond: [{ $eq: ["$read", false] }, 1, 0] } },
            archived: { $sum: { $cond: [{ $eq: ["$archived", true] }, 1, 0] } },
            byType: {
              $push: {
                type: "$type",
                read: "$read",
                archived: "$archived",
              },
            },
          },
        },
      ]);

      const result = stats[0] || {
        total: 0,
        unread: 0,
        archived: 0,
        byType: [],
      };

      // Calculate type breakdown
      const typeStats = result.byType.reduce((acc, item) => {
        if (!acc[item.type]) {
          acc[item.type] = { total: 0, unread: 0 };
        }
        acc[item.type].total += 1;
        if (!item.read && !item.archived) {
          acc[item.type].unread += 1;
        }
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          total: result.total,
          unread: result.unread,
          archived: result.archived,
          active: result.total - result.archived,
          typeBreakdown: typeStats,
        },
      });
    } catch (error) {
      console.error("Get notification stats error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve notification statistics",
      });
    }
  }
}

module.exports = new NotificationController();
