module.exports = {
  async getHolidays({ homey }) {
    return await homey.app.fetchHolidays();
  },
};
