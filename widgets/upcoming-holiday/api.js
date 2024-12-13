"use strict";

module.exports = {
  async getUpcomingHolidays({ homey, body }) {
    return await homey.app.getUpcomingHolidays(body);
  },
  async getHolidayById({ homey, params }) {
    return await homey.app.getHolidayById(params);
  },
};
