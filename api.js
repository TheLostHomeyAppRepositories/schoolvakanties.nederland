module.exports = {
  async getHolidays({ homey }) {
    // you can access the App instance through homey.app
    const result = await homey.app.fetchHolidays();
    return result;
  },
};
