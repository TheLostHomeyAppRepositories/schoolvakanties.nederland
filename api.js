module.exports = {
  async getHolidays({ homey }) {
    return await homey.app.fetchHolidays();
  },
  async updateHoliday({ homey, params, body }) {
    return await homey.app.saveHoliday(params.id, body);
  },
  async removeHoliday({ homey, params }) {
    return await homey.app.removeHoliday(params.id);
  },
};
