// Notification Service - Handles Chrome notifications
export class NotificationService {
  constructor() {
    this.notificationId = 0;
  }

  async show(options) {
    const {
      title,
      message,
      icon = 'assets/icons/icon48.png',
      type = 'basic',
      buttons = [],
      priority = 0,
      silent = false
    } = options;

    const notificationOptions = {
      type,
      iconUrl: icon,
      title,
      message,
      buttons,
      priority,
      silent
    };

    const id = `notification_${++this.notificationId}`;

    return new Promise((resolve, reject) => {
      chrome.notifications.create(id, notificationOptions, (notificationId) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(notificationId);
        }
      });
    });
  }

  async clear(notificationId) {
    return new Promise((resolve, reject) => {
      chrome.notifications.clear(notificationId, (wasCleared) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(wasCleared);
        }
      });
    });
  }

  async update(notificationId, options) {
    return new Promise((resolve, reject) => {
      chrome.notifications.update(notificationId, options, (wasUpdated) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(wasUpdated);
        }
      });
    });
  }

  async getAll() {
    return new Promise((resolve, reject) => {
      chrome.notifications.getAll((notifications) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(notifications);
        }
      });
    });
  }

  // Predefined notification types
  async showSuccess(message, title = 'Success') {
    return this.show({
      title,
      message,
      icon: 'assets/icons/success.png'
    });
  }

  async showError(message, title = 'Error') {
    return this.show({
      title,
      message,
      icon: 'assets/icons/error.png',
      priority: 2
    });
  }

  async showInfo(message, title = 'Information') {
    return this.show({
      title,
      message,
      icon: 'assets/icons/info.png'
    });
  }

  async showWarning(message, title = 'Warning') {
    return this.show({
      title,
      message,
      icon: 'assets/icons/warning.png',
      priority: 1
    });
  }
}
