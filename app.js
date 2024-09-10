"use strict";

const Homey = require("homey");
const fetch = require("node-fetch");
const Moment = require("moment");
const MomentRange = require("moment-range");
const moment = MomentRange.extendMoment(Moment); // Add plugin to moment instance

const DATE_FORMAT = "YYYY-MM-DD";
const API_ENDPOINT =
  "https://opendata.rijksoverheid.nl/v1/sources/rijksoverheid/infotypes/schoolholidays/schoolyear/";

class SchoolHolidayApp extends Homey.App {
  async onInit() {
    this.log("Schoolvakanties Nederland has been initialized");

    this.schoolyear = null;
    this.cachedHolidayData = [];

    await this.initializeTokens();
    this.registerFlowCards();
  }

  async initializeTokens() {
    this.tokenYesterday = await this.createToken(
      "SchoolHolidayYesterday",
      "tokens.yesterday"
    );
    this.tokenToday = await this.createToken(
      "SchoolHolidayToday",
      "tokens.today"
    );
    this.tokenTomorrow = await this.createToken(
      "SchoolHolidayTomorrow",
      "tokens.tomorrow"
    );
  }

  async createToken(id, titleKey) {
    return this.homey.flow.createToken(id, {
      type: "boolean",
      title: this.homey.__(titleKey),
    });
  }

  // Register flow cards for checking school holidays
  registerFlowCards() {
    const isSchoolHolidayCondition =
      this.homey.flow.getConditionCard("is_school_holiday");
    const isSpecificSchoolHolidayCondition = this.homey.flow.getConditionCard(
      "is_specifiec_school_holiday"
    );

    isSchoolHolidayCondition.registerRunListener(
      this.handleSchoolHolidayCondition.bind(this)
    );
    isSpecificSchoolHolidayCondition.registerRunListener(
      this.handleSpecificSchoolHolidayCondition.bind(this)
    );
  }

  // Handle the generic school holiday condition
  async handleSchoolHolidayCondition(args) {
    const regions = await this.resolveHolidayData();
    const holidayDates = this.processData(regions, args.regio);
    return this.isSchoolHoliday(args.day, holidayDates);
  }

  // Handle the specific school holiday condition
  async handleSpecificSchoolHolidayCondition(args) {
    let regions = await this.resolveHolidayData();
    regions = regions.filter(
      (vacation) => vacation.type.trim().toLowerCase() === args.holiday
    );
    const holidayDates = this.processData(regions, args.regio);
    return this.isSchoolHoliday(args.day, holidayDates);
  }

  // Check if the given day is a school holiday
  async isSchoolHoliday(day, dates) {
    const today = moment().format(DATE_FORMAT);
    const days = {
      today,
      yesterday: moment().subtract(1, "days").format(DATE_FORMAT),
      tomorrow: moment().add(1, "days").format(DATE_FORMAT),
    };

    // Set values for yesterday, today, and tomorrow in tokens
    await Promise.all([
      this.tokenYesterday.setValue(dates.includes(days.yesterday)),
      this.tokenToday.setValue(dates.includes(days.today)),
      this.tokenTomorrow.setValue(dates.includes(days.tomorrow)),
    ]);

    return dates.includes(days[day]); // Return true if the day is a holiday
  }

  // Create an array of dates between the start and end date
  createRangeDates(startDate, endDate) {
    const range = moment.range(startDate, endDate); // Create date range using moment-range
    return Array.from(range.by("days")).map((m) => m.format(DATE_FORMAT)); // Map to formatted date strings
  }

  // Process the fetched data and return an array of dates for the given region
  processData(regions, regionToFilter) {
    return regions
      .map((vacation) =>
        vacation.regions.find(
          (region) =>
            region.region === regionToFilter ||
            region.region === "heel Nederland"
        )
      )
      .filter(Boolean) // Filter out null or undefined values
      .flatMap((region) =>
        this.createRangeDates(region.startdate, region.enddate)
      ); // Create a flat array of dates
  }

  // Fetch and cache the school holiday data if not already cached
  async resolveHolidayData() {
    if (this.cachedHolidayData.length === 0) {
      this.cachedHolidayData = await this.fetchHolidays();
    }
    return this.cachedHolidayData.vacations;
  }

  // Get the latest end date from the fetched data
  getLatestEndDate(data) {
    const allEndDates = data.content.flatMap((item) =>
      item.vacations.flatMap((vacation) =>
        vacation.regions.map((region) => new Date(region.enddate))
      )
    );
    return new Date(Math.max(...allEndDates)).toISOString(); // Return the latest end date in ISO format
  }

  // Check if today's date is later than the latest end date
  isTodayLaterThanLatestEndDate(latestEndDate) {
    return moment().isAfter(moment(latestEndDate), "day"); // Check if today is after the latest end date
  }

  // Fetch the school holiday data for the current school year
  async fetchHolidays() {
    const year = moment().year();
    let schoolyear = `${year - 1}-${year}`;

    if (this.isChangedSchoolYear(schoolyear)) {
      this.cachedHolidayData = []; // Reset cached data if the school year has changed
    }

    if (this.cachedHolidayData.length > 0) {
      return this.cachedHolidayData; // Return cached data if available
    }

    try {
      // Fetch the data for the current school year
      let data = await this.fetchSchoolHolidayData(schoolyear);

      // Check if today is later than the latest end date and fetch next year’s data if necessary
      const latestEndDate = this.getLatestEndDate(data);
      if (this.isTodayLaterThanLatestEndDate(latestEndDate)) {
        schoolyear = `${year}-${year + 1}`;
        data = await this.fetchSchoolHolidayData(schoolyear);
      }

      return data.content[0]; // Return the first item in the content array
    } catch (error) {
      this.log("Error fetching holidays:", error); // Log errors
      throw error; // Throw the error to handle it elsewhere
    }
  }

  // Helper function to fetch holiday data from the API
  async fetchSchoolHolidayData(schoolyear) {
    const response = await fetch(`${API_ENDPOINT}${schoolyear}?output=json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch data for school year: ${schoolyear}`);
    }
    return response.json(); // Parse the JSON response
  }

  // Check if the school year has changed
  isChangedSchoolYear(schoolyear) {
    return this.schoolyear !== schoolyear || !this.schoolyear; // Return true if the school year has changed
  }
}

module.exports = SchoolHolidayApp;
