"use strict";

const Homey = require("homey");
const fetch = require("node-fetch");
const Moment = require("moment");
const MomentRange = require("moment-range");
const moment = MomentRange.extendMoment(Moment); // Extend moment with moment-range

const CUSTOM_DATES_KEY = "customDates";
const DATE_FORMAT = "YYYY-MM-DD";
const DATE_PRETTY_FORMAT = "LL";
const API_ENDPOINT =
  "https://opendata.rijksoverheid.nl/v1/sources/rijksoverheid/infotypes/schoolholidays/schoolyear/";

class SchoolHolidayApp extends Homey.App {
  async onInit() {
    this.log("School Holidays Netherlands initialized");
    moment.locale(this.homey.i18n.getLanguage());

    this.schoolyear = null;
    this.cachedHolidayData = [];

    await this.initializeTokens();
    this.registerFlowCards();
  }

  async initializeTokens() {
    this.tokenYesterday = await this.createToken(
      "SchoolHolidayYesterday",
      "tokens.yesterday",
    );
    this.tokenToday = await this.createToken(
      "SchoolHolidayToday",
      "tokens.today",
    );
    this.tokenTomorrow = await this.createToken(
      "SchoolHolidayTomorrow",
      "tokens.tomorrow",
    );
  }

  async createToken(id, titleKey) {
    return this.homey.flow.createToken(id, {
      type: "boolean",
      title: this.homey.__(titleKey),
    });
  }

  registerFlowCards() {
    const flowCards = [
      { name: "is_school_holiday", handler: this.handleSchoolHolidayCondition },
      {
        name: "is_specific_school_holiday",
        handler: this.handleSpecificSchoolHolidayCondition,
      },
      { name: "is_custom_holiday", handler: this.handleCustomHolidayCondition },
    ];

    flowCards.forEach((card) => {
      const flowCard = this.homey.flow.getConditionCard(card.name);
      flowCard.registerRunListener(card.handler.bind(this));

      if (card.name === "is_custom_holiday") {
        flowCard.registerArgumentAutocompleteListener(
          "holiday",
          this.autocompleteHolidays.bind(this),
        );
      }
    });
  }

  async autocompleteHolidays(query) {
    const customDates = this.homey.settings.get(CUSTOM_DATES_KEY) || [];
    return customDates
      .filter(({ label }) => label.toLowerCase().includes(query.toLowerCase()))
      .map(({ id, label, startDate, endDate }) => ({
        name: label,
        description: `${moment(startDate).format(DATE_PRETTY_FORMAT)} - ${moment(endDate).format(DATE_PRETTY_FORMAT)}`,
        id: id,
        startDate: moment(startDate),
        endDate: moment(endDate),
      }));
  }

  async handleSchoolHolidayCondition({ day, regio }) {
    const regions = await this.resolveHolidayData();
    const holidayDates = this.processRegionData(regions, regio);
    return this.isSchoolHoliday(day, holidayDates);
  }

  async handleSpecificSchoolHolidayCondition({ regio, holiday, day }) {
    const regions = await this.resolveHolidayData();
    const filteredRegions = regions.filter(
      ({ type }) => type.trim().toLowerCase() === holiday.toLowerCase(),
    );
    const holidayDates = this.processRegionData(filteredRegions, regio);
    return this.isSchoolHoliday(day, holidayDates);
  }

  async handleCustomHolidayCondition({ day, holiday }) {
    const holidayDates = this.processData([holiday]);
    return this.isSchoolHoliday(day, holidayDates);
  }

  async isSchoolHoliday(day, dates) {
    const today = moment().format(DATE_FORMAT);
    const days = {
      today,
      yesterday: moment().subtract(1, "days").format(DATE_FORMAT),
      tomorrow: moment().add(1, "days").format(DATE_FORMAT),
    };

    await Promise.all([
      this.tokenYesterday.setValue(dates.includes(days.yesterday)),
      this.tokenToday.setValue(dates.includes(days.today)),
      this.tokenTomorrow.setValue(dates.includes(days.tomorrow)),
    ]);

    return dates.includes(days[day]);
  }

  createRangeDates(startDate, endDate) {
    return Array.from(moment.range(startDate, endDate).by("days")).map((m) =>
      m.format(DATE_FORMAT),
    );
  }

  processRegionData(regions, regionToFilter) {
    return regions
      .map(({ regions }) =>
        regions.find(
          (region) =>
            region.region === regionToFilter ||
            region.region === "heel Nederland",
        ),
      )
      .filter(Boolean)
      .flatMap(({ startdate, enddate }) =>
        this.createRangeDates(startdate, enddate),
      );
  }

  processData(datesArray) {
    return datesArray.flatMap(({ startDate, endDate }) =>
      this.createRangeDates(startDate, endDate),
    );
  }

  async resolveHolidayData() {
    if (!this.cachedHolidayData.length) {
      this.cachedHolidayData = await this.fetchHolidays();
    }
    return this.cachedHolidayData.vacations;
  }

  getLatestEndDate(data) {
    const allEndDates = data.content.flatMap((item) =>
      item.vacations.flatMap(({ regions }) =>
        regions.map(({ enddate }) => new Date(enddate)),
      ),
    );
    return new Date(Math.max(...allEndDates)).toISOString();
  }

  isTodayLaterThanLatestEndDate(latestEndDate) {
    return moment().isAfter(moment(latestEndDate), "day");
  }

  async fetchHolidays() {
    const year = moment().year();
    let schoolyear = `${year - 1}-${year}`;

    if (this.isChangedSchoolYear(schoolyear)) {
      this.cachedHolidayData = [];
    }

    if (this.cachedHolidayData.length > 0) {
      return this.cachedHolidayData;
    }

    try {
      let data = await this.fetchSchoolHolidayData(schoolyear);

      const latestEndDate = this.getLatestEndDate(data);
      if (this.isTodayLaterThanLatestEndDate(latestEndDate)) {
        schoolyear = `${year}-${year + 1}`;
        data = await this.fetchSchoolHolidayData(schoolyear);
      }

      return data.content[0];
    } catch (error) {
      this.log("Error fetching holidays:", error);
      throw error;
    }
  }

  async fetchSchoolHolidayData(schoolyear) {
    const response = await fetch(`${API_ENDPOINT}${schoolyear}?output=json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch data for school year: ${schoolyear}`);
    }
    return response.json();
  }

  isChangedSchoolYear(schoolyear) {
    return this.schoolyear !== schoolyear;
  }
}

module.exports = SchoolHolidayApp;
