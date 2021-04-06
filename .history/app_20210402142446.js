'use strict';

const Homey = require('homey'),
Moment = require("moment"),
MomentRange = require("moment-range"), 
moment = MomentRange.extendMoment(Moment); /*add plugin to moment instance*/ 
const holidayDates = [];

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

  createRangeDates(startDate, endDate) {
    let range = moment().range(startDate, endDate), /*can handle leap year*/ 
    array = Array.from(range.by("days")); /*days, hours, years, etc.*/ 
  
    array.map(m => {
        console.log(m.format("YYYY-MM-DD")); /*or any format you like*/
    });
  }

 

  async getHolidays () {
    let response = await fetch('https://opendata.rijksoverheid.nl/v1/sources/rijksoverheid/infotypes/schoolholidays/schoolyear/2020-2021?output=json');
    let data = await response.json();
    return data.content[0].vacations;
  }
}

module.exports = MyApp;