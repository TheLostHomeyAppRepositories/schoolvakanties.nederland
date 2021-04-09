# Schoolvakanties
Check if today / yesterday / tomorrow is a school holiday in the Netherlands.

![image][storebackdrop]

## Conditions
- Today / Yesterday / Tomorrow it is school holiday in [Region]
- Today / Yesterday / Tomorrow it is [Holiday] in [Region]

## Regions
- North Holland
- Central Netherlands
- South Holland

## Holidays
- Autumn break
- Christmas break
- Spring break
- May holidays
- Summer holidays

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