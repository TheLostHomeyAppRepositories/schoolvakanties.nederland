"use strict";

module.exports = {
  async getUpcomingHolidays({ homey, body }) {
    return await homey.app.getUpcomingHolidays(body);
  },
};
