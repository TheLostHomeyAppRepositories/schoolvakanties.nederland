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
    this.log('MyApp has been initialized');

    let isHolidayCondition = this.homey.flow.getConditionCard('is_holiday');
   
    isHolidayCondition.registerRunListener(async (args, state) => {
      this.log('isHolidayCondition', args, state)
      let isHoliday;
      this.filterRegion(args.regio).then((dates) => {
        this.log('dates', dates);
        isHoliday = this.isHoliday(dates);
        this.log('isHoliday', isHoliday);
      });
      this.log('return', isHoliday)
      return isHoliday;
    });

  }
  isHoliday(dates) {
    this.log('isHoliday', dates);
    const today = moment(new Date()).format(dateFormat);
    this.log('today', today);
    return dates.includes(today);
  }
  
  createRangeDates(startDate, endDate) {
    let holidayRanges = [];
    let range = moment().range(startDate, endDate),
      /*can handle leap year*/
      array = Array.from(range.by("days")); /*days, hours, years, etc.*/
  
    array.map((m) => {
      return holidayRanges.push(
        m.format(dateFormat)
      ); /*or any format you like*/
    });
  
    return holidayRanges;
  }
  
  processData(regions, regionToFilter) {
    let holidayRegionDates = [];
    let holidayDates = [];
  
    regions.map((vacation) => {
      const regionObj = vacation.regions.filter(
        (region) =>
          region.region === regionToFilter || region.region === "heel Nederland"
      );
      regionObj.length > 0 && holidayRegionDates.push(regionObj[0]);
    });
  
    holidayRegionDates.map(
      (obj) =>
        (holidayDates = holidayDates.concat(
          this.createRangeDates(obj.startdate, obj.enddate)
        ))
    );
    return holidayDates;
  }
  
  async filterRegion(regionToFilter) {
    const a = await this.getHolidays().then((regions) =>
      this.processData(regions, regionToFilter)
    );
    return a;
  }
  
  async getHolidays() {
    const apiEndpoint = "https://opendata.rijksoverheid.nl/v1/sources/rijksoverheid/infotypes/schoolholidays/schoolyear/2020-2021?output=json";
    let response = await fetch(apiEndpoint);
    let data = await response.json();
    return data.content[0].vacations;
  }
}

module.exports = MyApp;
