'use strict';

const Homey = require('homey');

class MyApp extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('MyApp has been initialized');

    let isHolidayCondition = this.homey.flow.getConditionCard('is_holiday');
    isHolidayCondition.registerRunListener(async (args, state) => {
      let isHoliday = rain.isHoliday(); // true or false
      return isHoliday;
    });
  }
}

module.exports = MyApp;