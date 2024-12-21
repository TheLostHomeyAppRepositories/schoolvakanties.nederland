"use strict";

const Homey = require("homey");
const fetch = require("node-fetch");
const Moment = require("moment");
const MomentRange = require("moment-range");
const moment = MomentRange.extendMoment(Moment); // Extend moment with moment-range

const SUPPORTED_LANGUAGES = ["nl", "en", "de", "fr"];
const CUSTOM_DATES_KEY = "customDates";
const DATE_FORMAT = "YYYY-MM-DD";
const DATE_PRETTY_FORMAT = "LL";
const API_ENDPOINT =
  "https://opendata.rijksoverheid.nl/v1/sources/rijksoverheid/infotypes/schoolholidays/schoolyear/";

class SchoolHolidayApp extends Homey.App {
  async onInit() {
    const language = SUPPORTED_LANGUAGES.includes(this.homey.i18n.getLanguage())
      ? this.homey.i18n.getLanguage()
      : "en";

    this.log("School Holidays Netherlands initialized");
    moment.locale(language);
    this.schoolyear = null;
    this.cachedHolidayData = [];

    await this.initializeTokens();

    this.registerWidgets();
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
          this.autocompleteHolidays.bind(this)
        );
      }
    });
  }

  async handleSchoolHolidayCondition({ day, regio }) {
    const regions = await this.resolveHolidayData();
    const holidayDates = this.processRegionData(regions, regio);
    return this.isSchoolHoliday(day, holidayDates);
  }

  async handleSpecificSchoolHolidayCondition({ regio, holiday, day }) {
    const regions = await this.resolveHolidayData();
    const filteredRegions = regions.filter(
      ({ type }) => type.trim().toLowerCase() === holiday.toLowerCase()
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
      m.format(DATE_FORMAT)
    );
  }

  processRegionData(regions, regionToFilter) {
    return regions
      .map(({ regions }) =>
        regions.find(
          (region) =>
            region.region === regionToFilter ||
            region.region === "heel Nederland"
        )
      )
      .filter(Boolean)
      .flatMap(({ startdate, enddate }) =>
        this.createRangeDates(startdate, enddate)
      );
  }

  processData(datesArray) {
    return datesArray.flatMap(({ startDate, endDate }) =>
      this.createRangeDates(startDate, endDate)
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
        regions.map(({ enddate }) => new Date(enddate))
      )
    );
    return new Date(Math.max(...allEndDates)).toISOString();
  }

  isTodayLaterThanLatestEndDate(latestEndDate) {
    return moment().isAfter(moment(latestEndDate), "day");
  }

  //  Fetch school holidays
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

  // Widget upcoming-holidays

  registerWidgets() {
    const widget = this.homey.dashboards.getWidget("upcoming-holiday");

    widget.registerSettingAutocompleteListener(
      "holiday",
      async (query, settings) => {
        const upcomingHolidays = await this.getUpcomingHolidays(
          settings.regio,
          12
        );
        return upcomingHolidays
          .filter((item) =>
            item.label.toLowerCase().includes(query.toLowerCase())
          )
          .map(({ id, label, isSchoolHoliday, startDate, endDate }) => ({
            name: label,
            description: `${moment(startDate).format(
              DATE_PRETTY_FORMAT
            )} - ${moment(endDate).format(DATE_PRETTY_FORMAT)}`,
            id: id,
            isSchoolHoliday: isSchoolHoliday,
            startDate: moment(startDate),
            endDate: moment(endDate),
          }));
      }
    );
  }

  async autocompleteHolidays(query) {
    const customDates = this.homey.settings.get(CUSTOM_DATES_KEY) || [];
    return customDates
      .filter(({ label }) => label.toLowerCase().includes(query.toLowerCase()))
      .map(({ id, label, isSchoolHoliday, startDate, endDate }) => ({
        name: label,
        description: `${moment(startDate).format(
          DATE_PRETTY_FORMAT
        )} - ${moment(endDate).format(DATE_PRETTY_FORMAT)}`,
        id: id,
        isSchoolHoliday: isSchoolHoliday,
        startDate: moment(startDate),
        endDate: moment(endDate),
      }));
  }

  async getUpcomingHolidays(region, count = 3) {
    const regions = await this.fetchHolidays();
    const upcomingHolidays = this.processUpcomingHolidays(
      regions.vacations,
      region,
      count
    );
    return upcomingHolidays;
  }

  async saveHoliday(id, data) {
    console.log("saveHoliday", id, data);

    console.log(
      "this.homey.settings.get",
      this.homey.settings.get(CUSTOM_DATES_KEY)
    );
    this.homey.api.realtime("updateHolidayEvent", data);
  }

  async removeHoliday(id) {
    // TODO: when Homey is able to setSettings() update this when a holiday is removed
    this.homey.api.realtime("removeHolidayEvent", id);
  }

  async getHolidayById(params) {
    const id = parseInt(params?.id);
    return this.homey.settings
      .get(CUSTOM_DATES_KEY)
      .find((item) => item.id === id);
  }

  async processUpcomingHolidays(regions, regionToFilter, count) {
    const customDates = (
      this.homey.settings.get(CUSTOM_DATES_KEY) || []
    ).filter((item) => {
      const endDate = moment(item.endDate, DATE_FORMAT);
      return moment().isSameOrBefore(endDate, "day");
    });
    customDates?.forEach((item) => {
      item.isActive = moment({ hours: 0 }).isBetween(
        item.startDate,
        item.endDate,
        "day"
      );
      item.isSchoolHoliday = false;
    });

    const regionDates = regions
      .map(({ type, regions }) => {
        const region = regions.find(
          ({ region }) =>
            region === regionToFilter || region === "heel Nederland"
        );
        if (region) {
          return this.createUpcomingHoliday(
            type.trim(),
            region.startdate,
            region.enddate
          );
        }
        return null;
      })
      .filter(Boolean) // Remove null values
      .filter((holiday) =>
        moment().isSameOrBefore(moment(holiday.endDate), "day")
      ); // Filter out past holidays

    const allHolidays = [...regionDates, ...customDates]
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate)) // Sort by startDate
      .slice(0, count); // Limit to the first 'count' upcoming holidays
    return allHolidays;
  }

  createUpcomingHoliday(type, startDate, endDate) {
    return {
      isActive: moment({ hours: 0 }).isBetween(startDate, endDate, "day"),
      isSchoolHoliday: true,
      label: type,
      startDate: moment(startDate).format(DATE_FORMAT),
      endDate: moment(endDate).format(DATE_FORMAT),
    };
  }
}

module.exports = SchoolHolidayApp;
