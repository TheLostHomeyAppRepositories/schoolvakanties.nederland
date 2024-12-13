# Schoolvakanties

Check if today / yesterday / tomorrow is a (school) holiday in the Netherlands.

![image][storebackdrop]

## Conditions

- Today / Yesterday / Tomorrow it is school holiday in [Region]
- Today / Yesterday / Tomorrow it is [Holiday] in [Region]
- Today / Yesterday / Tomorrow it is [CustomHoliday]

## Regions

- North Region
- Central Region
- South Region

## Holidays

- Autumn break
- Christmas break
- Spring break
- May holidays
- Summer holidays

## Settings

- Gives an overview of all holidays per region in the Netherlands.
- You can manage your own holidays. You can add or delete custom holidays.

## Tokens

- School holiday yesterday
- School holiday today
- School holiday tomorrow

## Examples

- WHEN the alarm is going off, AND it's not a school holiday, THEN play a morning sound
- WHEN this flow starts, AND it's a Christmas holiday, THEN play a christmas music

## Acknowledgements

The open-data API from [https://www.rijksoverheid.nl/opendata/schoolvakanties](https://www.rijksoverheid.nl/opendata/schoolvakanties).

## Feedback

Please report issues at the [issues section on Github](https://github.com/elmarkou/homey.schoolvakanties.nederland/issues).

## Donate

If you like the app, you are free to sponsor.  
[![Paypal donate][pp-donate-image]][pp-donate-link]

### Release Notes

#### 2.2.0

- Truncating too long texts
- Able to update the custom holidays

#### 2.1.5

- Made widget bigger

#### 2.1.4

- Added interval to fetch data and use calendar method from momentjs

#### 2.1.3

- Fix incorrect dates inside the widget

#### 2.1.2

- Bugfixes

#### 2.1.1

- Bugfixes

#### 2.1.0

- Added widget for upcoming (school) holiday

#### 2.0.0

- You are now able to manage your own custom holidays via settings.

#### 1.1.8

- After latest holiday, fetch holidays for next year

#### 1.1.7

- Update fix for year listings
- Change settings page from iframe to data from API

#### 1.1.6

- Update settings page

#### 1.1.5

- Fix switching current years calendar

#### 1.1.4

- Fix getting correct calendar data

#### 1.1.3

- Added Regions to settingspage and change labelnames.

#### 1.1.2

- Added settingspage with overview of school holidays

#### 1.1.1

- Added caching to prevent multiple API Calls

#### 1.1.0

- Added new condition to specify the type of school holiday

#### 1.0.3

- Added token documentation

#### 1.0.2

- Added tokens for School holiday today, yesterday and tomorrow.

#### 1.0.1

- First version for app store.

[pp-donate-link]: https://www.paypal.me/elmarkouwenhoven
[pp-donate-image]: https://www.paypalobjects.com/webstatic/en_US/i/btn/png/btn_donate_92x26.png
[storebackdrop]: https://github.com/elmarkou/homey.schoolvakanties.nederland/raw/master/assets/images/large.png
