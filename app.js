'use strict';

const Homey = require('homey'),
  fetch = require('node-fetch'),
  Moment = require("moment"),
  MomentRange = require("moment-range"),
  moment = MomentRange.extendMoment(Moment); /*add plugin to moment instance*/

const dateFormat = "YYYY-MM-DD";

class SchoolHolidayApp extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */

  async onInit() {
    this.log('Schoolvakanties Nederland has been initialized');
    let isSchoolHolidayCondition = this.homey.flow.getConditionCard('is_school_holiday');
    let isSpecificSchoolHolidayCondition = this.homey.flow.getConditionCard('is_specifiec_school_holiday');

    // CachedData
    this.schoolyear;
    this.cachedHolidayData = [];

    // Tokens
    this.tokenYesterday = await this.homey.flow.createToken('SchoolHolidayYesterday', {
      type: 'boolean',
      title: this.homey.__('tokens.yesterday')
    });
    this.tokenToday = await this.homey.flow.createToken('SchoolHolidayToday', {
      type: 'boolean',
      title: this.homey.__('tokens.today')
    });
    this.tokenTomorrow = await this.homey.flow.createToken('SchoolHolidayTomorrow', {
      type: 'boolean',
      title: this.homey.__('tokens.tomorrow')
    });

    isSchoolHolidayCondition.registerRunListener(async (args, state) => {
      let holidayDates;
      const regions = await this.resolveHolidayData();
      holidayDates = this.processData(regions, args.regio)
      return this.isSchoolHoliday(args.day, holidayDates);
    });

    isSpecificSchoolHolidayCondition.registerRunListener(async (args, state) => {
      let holidayDates;
      let regions = await this.resolveHolidayData();
      regions = regions.filter(vacation => vacation.type.trim().toLowerCase() === args.holiday);
      holidayDates = this.processData(regions, args.regio)
      return this.isSchoolHoliday(args.day, holidayDates);
    });
  }

  async isSchoolHoliday(day, dates) {
    const days = {
      today: moment(new Date()).format(dateFormat),
      yesterday: moment(new Date()).subtract(1, "days").format(dateFormat),
      tomorrow: moment(new Date()).subtract(-1, "days").format(dateFormat)
    }
    // Set Tokens
    await this.tokenYesterday.setValue(dates.includes(days['yesterday']));
    await this.tokenToday.setValue(dates.includes(days['today']));
    await this.tokenTomorrow.setValue(dates.includes(days['tomorrow']));
    return dates.includes(days[day]);
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
    this.cachedHolidayData = await this.fetchHolidays()
    return this.cachedHolidayData;
  }

  isChangedSchoolYear(schoolyear) {
    return this.schoolyear !== schoolyear || this.schoolyear === undefined
  }

  async fetchHolidays() {
    // Get Schoolyear
    const schoolyear = `${moment().get('year')}-${moment().get('year') + 1}`;
    // Check for changse
    if (this.isChangedSchoolYear(schoolyear)) {
      this.cachedHolidayData = [];
    }
    // Return cachedData to prevent extra Api calls
    if (this.cachedHolidayData.length > 0) {      
      return this.cachedHolidayData;
    }
    // Set Schoolyear
    this.schoolyear = schoolyear;
    // Call API
    const apiEndpoint = `https://opendata.rijksoverheid.nl/v1/sources/rijksoverheid/infotypes/schoolholidays/schoolyear/${schoolyear}?output=json`,
      response = await fetch(apiEndpoint),
      data = await response.json();
    return data.content[0].vacations;
  }
}

module.exports = SchoolHolidayApp;