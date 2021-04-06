'use strict';

const Homey = require('homey'),
  fetch = require('node-fetch'),
  Moment = require("moment"),
  MomentRange = require("moment-range"),
  moment = MomentRange.extendMoment(Moment); /*add plugin to moment instance*/

const dateFormat = "YYYY-MM-DD";

class MyApp extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */

  async onInit() {
    this.log('Schoolvakanties Nederland has been initialized');
    let isSchoolHolidayCondition = this.homey.flow.getConditionCard('is_school_holiday');

    isSchoolHolidayCondition.registerRunListener(async (args, state) => {
      let holidayDates;
      const regions = await this.resolveHolidayData();
      holidayDates = this.processData(regions, args.region)
      return this.isSchoolHoliday(args.day, holidayDates);
    });
  }

  isSchoolHoliday(day, dates) {
    const day;
    const day = moment(new Date()).format(dateFormat);
    return dates.includes(day);
  }

  createRangeDates(startDate, endDate) {
    let holidayRanges = [],
      range = moment().range(startDate, endDate),
      array = Array.from(range.by("days"));

    array.map(m => holidayRanges.push(m.format(dateFormat)));
    return holidayRanges;
  }

  processData(regions, regionToFilter) {
    let holidayRegionDates = [],
      holidayDates = [];

    regions.map((vacation) => {
      const regionObj = vacation.regions.filter(region => region.region === regionToFilter || region.region === "heel Nederland");
      regionObj.length > 0 && holidayRegionDates.push(regionObj[0]);
    });

    holidayRegionDates.map(obj => (holidayDates = holidayDates.concat(this.createRangeDates(obj.startdate, obj.enddate))));
    return holidayDates;
  }

  async resolveHolidayData() {
    const holidayData = await this.getHolidays()
    return holidayData;
  }

  async getHolidays() {
    const apiEndpoint = "https://opendata.rijksoverheid.nl/v1/sources/rijksoverheid/infotypes/schoolholidays/schoolyear/2020-2021?output=json",
      response = await fetch(apiEndpoint),
      data = await response.json();
    return data.content[0].vacations;
  }
}

module.exports = MyApp;