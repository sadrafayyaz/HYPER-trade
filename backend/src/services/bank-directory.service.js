const { Prisma } = require("@prisma/client");
const prisma = require("../prisma");

const COUNTRY_DIRECTORY = [
  {
    "code": "AC",
    "name": "Ascension Island",
    "currency": "SHP",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "AC"
  },
  {
    "code": "AD",
    "name": "Andorra",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "AD"
  },
  {
    "code": "AE",
    "name": "United Arab Emirates",
    "currency": "AED",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "AE"
  },
  {
    "code": "AF",
    "name": "Afghanistan",
    "currency": "AFN",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "AF"
  },
  {
    "code": "AG",
    "name": "Antigua & Barbuda",
    "currency": "XCD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "AG"
  },
  {
    "code": "AI",
    "name": "Anguilla",
    "currency": "XCD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "AI"
  },
  {
    "code": "AL",
    "name": "Albania",
    "currency": "ALL",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "AL"
  },
  {
    "code": "AM",
    "name": "Armenia",
    "currency": "AMD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "AM"
  },
  {
    "code": "AO",
    "name": "Angola",
    "currency": "AOA",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "AO"
  },
  {
    "code": "AQ",
    "name": "Antarctica",
    "currency": "",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "AQ"
  },
  {
    "code": "AR",
    "name": "Argentina",
    "currency": "ARS",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "AR"
  },
  {
    "code": "AS",
    "name": "American Samoa",
    "currency": "USD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "AS"
  },
  {
    "code": "AT",
    "name": "Austria",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "AT"
  },
  {
    "code": "AU",
    "name": "Australia",
    "currency": "AUD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "AU"
  },
  {
    "code": "AW",
    "name": "Aruba",
    "currency": "AWG",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "AW"
  },
  {
    "code": "AX",
    "name": "Åland Islands",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "AX"
  },
  {
    "code": "AZ",
    "name": "Azerbaijan",
    "currency": "AZN",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "AZ"
  },
  {
    "code": "BA",
    "name": "Bosnia & Herzegovina",
    "currency": "BAM",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "BA"
  },
  {
    "code": "BB",
    "name": "Barbados",
    "currency": "BBD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "BB"
  },
  {
    "code": "BD",
    "name": "Bangladesh",
    "currency": "BDT",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "BD"
  },
  {
    "code": "BE",
    "name": "Belgium",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "BE"
  },
  {
    "code": "BF",
    "name": "Burkina Faso",
    "currency": "XOF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "BF"
  },
  {
    "code": "BG",
    "name": "Bulgaria",
    "currency": "BGN",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "BG"
  },
  {
    "code": "BH",
    "name": "Bahrain",
    "currency": "BHD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "BH"
  },
  {
    "code": "BI",
    "name": "Burundi",
    "currency": "BIF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "BI"
  },
  {
    "code": "BJ",
    "name": "Benin",
    "currency": "XOF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "BJ"
  },
  {
    "code": "BL",
    "name": "St. Barthélemy",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "BL"
  },
  {
    "code": "BM",
    "name": "Bermuda",
    "currency": "BMD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "BM"
  },
  {
    "code": "BN",
    "name": "Brunei",
    "currency": "BND",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "BN"
  },
  {
    "code": "BO",
    "name": "Bolivia",
    "currency": "BOB",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "BO"
  },
  {
    "code": "BQ",
    "name": "Caribbean Netherlands",
    "currency": "USD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "BQ"
  },
  {
    "code": "BR",
    "name": "Brazil",
    "currency": "BRL",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "BR"
  },
  {
    "code": "BS",
    "name": "Bahamas",
    "currency": "BSD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "BS"
  },
  {
    "code": "BT",
    "name": "Bhutan",
    "currency": "INR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "BT"
  },
  {
    "code": "BV",
    "name": "Bouvet Island",
    "currency": "NOK",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "BV"
  },
  {
    "code": "BW",
    "name": "Botswana",
    "currency": "BWP",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "BW"
  },
  {
    "code": "BY",
    "name": "Belarus",
    "currency": "BYN",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "BY"
  },
  {
    "code": "BZ",
    "name": "Belize",
    "currency": "BZD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "BZ"
  },
  {
    "code": "CA",
    "name": "Canada",
    "currency": "CAD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "CA"
  },
  {
    "code": "CC",
    "name": "Cocos (Keeling) Islands",
    "currency": "AUD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "CC"
  },
  {
    "code": "CD",
    "name": "Congo - Kinshasa",
    "currency": "CDF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "CD"
  },
  {
    "code": "CF",
    "name": "Central African Republic",
    "currency": "XAF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "CF"
  },
  {
    "code": "CG",
    "name": "Congo - Brazzaville",
    "currency": "XAF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "CG"
  },
  {
    "code": "CH",
    "name": "Switzerland",
    "currency": "CHF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "CH"
  },
  {
    "code": "CI",
    "name": "Côte d’Ivoire",
    "currency": "XOF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "CI"
  },
  {
    "code": "CK",
    "name": "Cook Islands",
    "currency": "NZD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "CK"
  },
  {
    "code": "CL",
    "name": "Chile",
    "currency": "CLP",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "CL"
  },
  {
    "code": "CM",
    "name": "Cameroon",
    "currency": "XAF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "CM"
  },
  {
    "code": "CN",
    "name": "China",
    "currency": "CNY",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "CN"
  },
  {
    "code": "CO",
    "name": "Colombia",
    "currency": "COP",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "CO"
  },
  {
    "code": "CP",
    "name": "Clipperton Island",
    "currency": "",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "CP"
  },
  {
    "code": "CQ",
    "name": "Sark",
    "currency": "",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "CQ"
  },
  {
    "code": "CR",
    "name": "Costa Rica",
    "currency": "CRC",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "CR"
  },
  {
    "code": "CU",
    "name": "Cuba",
    "currency": "CUP",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "CU"
  },
  {
    "code": "CV",
    "name": "Cape Verde",
    "currency": "CVE",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "CV"
  },
  {
    "code": "CW",
    "name": "Curaçao",
    "currency": "XCG",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "CW"
  },
  {
    "code": "CX",
    "name": "Christmas Island",
    "currency": "AUD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "CX"
  },
  {
    "code": "CY",
    "name": "Cyprus",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "CY"
  },
  {
    "code": "CZ",
    "name": "Czechia",
    "currency": "CZK",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "CZ"
  },
  {
    "code": "DE",
    "name": "Germany",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "DE"
  },
  {
    "code": "DG",
    "name": "Diego Garcia",
    "currency": "USD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "DG"
  },
  {
    "code": "DJ",
    "name": "Djibouti",
    "currency": "DJF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "DJ"
  },
  {
    "code": "DK",
    "name": "Denmark",
    "currency": "DKK",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "DK"
  },
  {
    "code": "DM",
    "name": "Dominica",
    "currency": "XCD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "DM"
  },
  {
    "code": "DO",
    "name": "Dominican Republic",
    "currency": "DOP",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "DO"
  },
  {
    "code": "DZ",
    "name": "Algeria",
    "currency": "DZD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "DZ"
  },
  {
    "code": "EA",
    "name": "Ceuta & Melilla",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "EA"
  },
  {
    "code": "EC",
    "name": "Ecuador",
    "currency": "USD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "EC"
  },
  {
    "code": "EE",
    "name": "Estonia",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "EE"
  },
  {
    "code": "EG",
    "name": "Egypt",
    "currency": "EGP",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "EG"
  },
  {
    "code": "EH",
    "name": "Western Sahara",
    "currency": "MAD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "EH"
  },
  {
    "code": "ER",
    "name": "Eritrea",
    "currency": "ERN",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "ER"
  },
  {
    "code": "ES",
    "name": "Spain",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "ES"
  },
  {
    "code": "ET",
    "name": "Ethiopia",
    "currency": "ETB",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "ET"
  },
  {
    "code": "EU",
    "name": "European Union",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "EU"
  },
  {
    "code": "EZ",
    "name": "Eurozone",
    "currency": "",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "EZ"
  },
  {
    "code": "FI",
    "name": "Finland",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "FI"
  },
  {
    "code": "FJ",
    "name": "Fiji",
    "currency": "FJD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "FJ"
  },
  {
    "code": "FK",
    "name": "Falkland Islands",
    "currency": "FKP",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "FK"
  },
  {
    "code": "FM",
    "name": "Micronesia",
    "currency": "USD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "FM"
  },
  {
    "code": "FO",
    "name": "Faroe Islands",
    "currency": "DKK",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "FO"
  },
  {
    "code": "FR",
    "name": "France",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "FR"
  },
  {
    "code": "GA",
    "name": "Gabon",
    "currency": "XAF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "GA"
  },
  {
    "code": "GB",
    "name": "United Kingdom",
    "currency": "GBP",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "GB"
  },
  {
    "code": "GD",
    "name": "Grenada",
    "currency": "XCD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "GD"
  },
  {
    "code": "GE",
    "name": "Georgia",
    "currency": "GEL",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "GE"
  },
  {
    "code": "GF",
    "name": "French Guiana",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "GF"
  },
  {
    "code": "GG",
    "name": "Guernsey",
    "currency": "GBP",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "GG"
  },
  {
    "code": "GH",
    "name": "Ghana",
    "currency": "GHS",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "GH"
  },
  {
    "code": "GI",
    "name": "Gibraltar",
    "currency": "GIP",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "GI"
  },
  {
    "code": "GL",
    "name": "Greenland",
    "currency": "DKK",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "GL"
  },
  {
    "code": "GM",
    "name": "Gambia",
    "currency": "GMD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "GM"
  },
  {
    "code": "GN",
    "name": "Guinea",
    "currency": "GNF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "GN"
  },
  {
    "code": "GP",
    "name": "Guadeloupe",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "GP"
  },
  {
    "code": "GQ",
    "name": "Equatorial Guinea",
    "currency": "XAF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "GQ"
  },
  {
    "code": "GR",
    "name": "Greece",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "GR"
  },
  {
    "code": "GS",
    "name": "South Georgia & South Sandwich Islands",
    "currency": "GBP",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "GS"
  },
  {
    "code": "GT",
    "name": "Guatemala",
    "currency": "GTQ",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "GT"
  },
  {
    "code": "GU",
    "name": "Guam",
    "currency": "USD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "GU"
  },
  {
    "code": "GW",
    "name": "Guinea-Bissau",
    "currency": "XOF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "GW"
  },
  {
    "code": "GY",
    "name": "Guyana",
    "currency": "GYD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "GY"
  },
  {
    "code": "HK",
    "name": "Hong Kong SAR China",
    "currency": "HKD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "HK"
  },
  {
    "code": "HM",
    "name": "Heard & McDonald Islands",
    "currency": "AUD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "HM"
  },
  {
    "code": "HN",
    "name": "Honduras",
    "currency": "HNL",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "HN"
  },
  {
    "code": "HR",
    "name": "Croatia",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "HR"
  },
  {
    "code": "HT",
    "name": "Haiti",
    "currency": "HTG",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "HT"
  },
  {
    "code": "HU",
    "name": "Hungary",
    "currency": "HUF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "HU"
  },
  {
    "code": "IC",
    "name": "Canary Islands",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "IC"
  },
  {
    "code": "ID",
    "name": "Indonesia",
    "currency": "IDR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "ID"
  },
  {
    "code": "IE",
    "name": "Ireland",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "IE"
  },
  {
    "code": "IL",
    "name": "Israel",
    "currency": "ILS",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "IL"
  },
  {
    "code": "IM",
    "name": "Isle of Man",
    "currency": "GBP",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "IM"
  },
  {
    "code": "IN",
    "name": "India",
    "currency": "INR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "IN"
  },
  {
    "code": "IO",
    "name": "British Indian Ocean Territory",
    "currency": "USD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "IO"
  },
  {
    "code": "IQ",
    "name": "Iraq",
    "currency": "IQD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "IQ"
  },
  {
    "code": "IR",
    "name": "Iran",
    "currency": "IRR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "IR"
  },
  {
    "code": "IS",
    "name": "Iceland",
    "currency": "ISK",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "IS"
  },
  {
    "code": "IT",
    "name": "Italy",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "IT"
  },
  {
    "code": "JE",
    "name": "Jersey",
    "currency": "GBP",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "JE"
  },
  {
    "code": "JM",
    "name": "Jamaica",
    "currency": "JMD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "JM"
  },
  {
    "code": "JO",
    "name": "Jordan",
    "currency": "JOD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "JO"
  },
  {
    "code": "JP",
    "name": "Japan",
    "currency": "JPY",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "JP"
  },
  {
    "code": "KE",
    "name": "Kenya",
    "currency": "KES",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "KE"
  },
  {
    "code": "KG",
    "name": "Kyrgyzstan",
    "currency": "KGS",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "KG"
  },
  {
    "code": "KH",
    "name": "Cambodia",
    "currency": "KHR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "KH"
  },
  {
    "code": "KI",
    "name": "Kiribati",
    "currency": "AUD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "KI"
  },
  {
    "code": "KM",
    "name": "Comoros",
    "currency": "KMF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "KM"
  },
  {
    "code": "KN",
    "name": "St. Kitts & Nevis",
    "currency": "XCD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "KN"
  },
  {
    "code": "KP",
    "name": "North Korea",
    "currency": "KPW",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "KP"
  },
  {
    "code": "KR",
    "name": "South Korea",
    "currency": "KRW",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "KR"
  },
  {
    "code": "KW",
    "name": "Kuwait",
    "currency": "KWD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "KW"
  },
  {
    "code": "KY",
    "name": "Cayman Islands",
    "currency": "KYD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "KY"
  },
  {
    "code": "KZ",
    "name": "Kazakhstan",
    "currency": "KZT",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "KZ"
  },
  {
    "code": "LA",
    "name": "Laos",
    "currency": "LAK",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "LA"
  },
  {
    "code": "LB",
    "name": "Lebanon",
    "currency": "LBP",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "LB"
  },
  {
    "code": "LC",
    "name": "St. Lucia",
    "currency": "XCD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "LC"
  },
  {
    "code": "LI",
    "name": "Liechtenstein",
    "currency": "CHF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "LI"
  },
  {
    "code": "LK",
    "name": "Sri Lanka",
    "currency": "LKR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "LK"
  },
  {
    "code": "LR",
    "name": "Liberia",
    "currency": "LRD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "LR"
  },
  {
    "code": "LS",
    "name": "Lesotho",
    "currency": "ZAR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "LS"
  },
  {
    "code": "LT",
    "name": "Lithuania",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "LT"
  },
  {
    "code": "LU",
    "name": "Luxembourg",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "LU"
  },
  {
    "code": "LV",
    "name": "Latvia",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "LV"
  },
  {
    "code": "LY",
    "name": "Libya",
    "currency": "LYD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "LY"
  },
  {
    "code": "MA",
    "name": "Morocco",
    "currency": "MAD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "MA"
  },
  {
    "code": "MC",
    "name": "Monaco",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "MC"
  },
  {
    "code": "MD",
    "name": "Moldova",
    "currency": "MDL",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "MD"
  },
  {
    "code": "ME",
    "name": "Montenegro",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "ME"
  },
  {
    "code": "MF",
    "name": "St. Martin",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "MF"
  },
  {
    "code": "MG",
    "name": "Madagascar",
    "currency": "MGA",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "MG"
  },
  {
    "code": "MH",
    "name": "Marshall Islands",
    "currency": "USD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "MH"
  },
  {
    "code": "MK",
    "name": "North Macedonia",
    "currency": "MKD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "MK"
  },
  {
    "code": "ML",
    "name": "Mali",
    "currency": "XOF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "ML"
  },
  {
    "code": "MM",
    "name": "Myanmar (Burma)",
    "currency": "MMK",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "MM"
  },
  {
    "code": "MN",
    "name": "Mongolia",
    "currency": "MNT",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "MN"
  },
  {
    "code": "MO",
    "name": "Macao SAR China",
    "currency": "MOP",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "MO"
  },
  {
    "code": "MP",
    "name": "Northern Mariana Islands",
    "currency": "USD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "MP"
  },
  {
    "code": "MQ",
    "name": "Martinique",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "MQ"
  },
  {
    "code": "MR",
    "name": "Mauritania",
    "currency": "MRU",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "MR"
  },
  {
    "code": "MS",
    "name": "Montserrat",
    "currency": "XCD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "MS"
  },
  {
    "code": "MT",
    "name": "Malta",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "MT"
  },
  {
    "code": "MU",
    "name": "Mauritius",
    "currency": "MUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "MU"
  },
  {
    "code": "MV",
    "name": "Maldives",
    "currency": "MVR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "MV"
  },
  {
    "code": "MW",
    "name": "Malawi",
    "currency": "MWK",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "MW"
  },
  {
    "code": "MX",
    "name": "Mexico",
    "currency": "MXN",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "MX"
  },
  {
    "code": "MY",
    "name": "Malaysia",
    "currency": "MYR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "MY"
  },
  {
    "code": "MZ",
    "name": "Mozambique",
    "currency": "MZN",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "MZ"
  },
  {
    "code": "NA",
    "name": "Namibia",
    "currency": "ZAR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "NA"
  },
  {
    "code": "NC",
    "name": "New Caledonia",
    "currency": "XPF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "NC"
  },
  {
    "code": "NE",
    "name": "Niger",
    "currency": "XOF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "NE"
  },
  {
    "code": "NF",
    "name": "Norfolk Island",
    "currency": "AUD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "NF"
  },
  {
    "code": "NG",
    "name": "Nigeria",
    "currency": "NGN",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "NG"
  },
  {
    "code": "NI",
    "name": "Nicaragua",
    "currency": "NIO",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "NI"
  },
  {
    "code": "NL",
    "name": "Netherlands",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "NL"
  },
  {
    "code": "NO",
    "name": "Norway",
    "currency": "NOK",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "NO"
  },
  {
    "code": "NP",
    "name": "Nepal",
    "currency": "NPR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "NP"
  },
  {
    "code": "NR",
    "name": "Nauru",
    "currency": "AUD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "NR"
  },
  {
    "code": "NU",
    "name": "Niue",
    "currency": "NZD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "NU"
  },
  {
    "code": "NZ",
    "name": "New Zealand",
    "currency": "NZD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "NZ"
  },
  {
    "code": "OM",
    "name": "Oman",
    "currency": "OMR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "OM"
  },
  {
    "code": "PA",
    "name": "Panama",
    "currency": "PAB",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "PA"
  },
  {
    "code": "PE",
    "name": "Peru",
    "currency": "PEN",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "PE"
  },
  {
    "code": "PF",
    "name": "French Polynesia",
    "currency": "XPF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "PF"
  },
  {
    "code": "PG",
    "name": "Papua New Guinea",
    "currency": "PGK",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "PG"
  },
  {
    "code": "PH",
    "name": "Philippines",
    "currency": "PHP",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "PH"
  },
  {
    "code": "PK",
    "name": "Pakistan",
    "currency": "PKR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "PK"
  },
  {
    "code": "PL",
    "name": "Poland",
    "currency": "PLN",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "PL"
  },
  {
    "code": "PM",
    "name": "St. Pierre & Miquelon",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "PM"
  },
  {
    "code": "PN",
    "name": "Pitcairn Islands",
    "currency": "NZD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "PN"
  },
  {
    "code": "PR",
    "name": "Puerto Rico",
    "currency": "USD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "PR"
  },
  {
    "code": "PS",
    "name": "Palestinian Territories",
    "currency": "ILS",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "PS"
  },
  {
    "code": "PT",
    "name": "Portugal",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "PT"
  },
  {
    "code": "PW",
    "name": "Palau",
    "currency": "USD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "PW"
  },
  {
    "code": "PY",
    "name": "Paraguay",
    "currency": "PYG",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "PY"
  },
  {
    "code": "QA",
    "name": "Qatar",
    "currency": "QAR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "QA"
  },
  {
    "code": "QO",
    "name": "Outlying Oceania",
    "currency": "",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "QO"
  },
  {
    "code": "RE",
    "name": "Réunion",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "RE"
  },
  {
    "code": "RO",
    "name": "Romania",
    "currency": "RON",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "RO"
  },
  {
    "code": "RS",
    "name": "Serbia",
    "currency": "RSD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "RS"
  },
  {
    "code": "RU",
    "name": "Russia",
    "currency": "RUB",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "RU"
  },
  {
    "code": "RW",
    "name": "Rwanda",
    "currency": "RWF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "RW"
  },
  {
    "code": "SA",
    "name": "Saudi Arabia",
    "currency": "SAR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "SA"
  },
  {
    "code": "SB",
    "name": "Solomon Islands",
    "currency": "SBD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "SB"
  },
  {
    "code": "SC",
    "name": "Seychelles",
    "currency": "SCR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "SC"
  },
  {
    "code": "SD",
    "name": "Sudan",
    "currency": "SDG",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "SD"
  },
  {
    "code": "SE",
    "name": "Sweden",
    "currency": "SEK",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "SE"
  },
  {
    "code": "SG",
    "name": "Singapore",
    "currency": "SGD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "SG"
  },
  {
    "code": "SH",
    "name": "St. Helena",
    "currency": "SHP",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "SH"
  },
  {
    "code": "SI",
    "name": "Slovenia",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "SI"
  },
  {
    "code": "SJ",
    "name": "Svalbard & Jan Mayen",
    "currency": "NOK",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "SJ"
  },
  {
    "code": "SK",
    "name": "Slovakia",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "SK"
  },
  {
    "code": "SL",
    "name": "Sierra Leone",
    "currency": "SLE",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "SL"
  },
  {
    "code": "SM",
    "name": "San Marino",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "SM"
  },
  {
    "code": "SN",
    "name": "Senegal",
    "currency": "XOF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "SN"
  },
  {
    "code": "SO",
    "name": "Somalia",
    "currency": "SOS",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "SO"
  },
  {
    "code": "SR",
    "name": "Suriname",
    "currency": "SRD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "SR"
  },
  {
    "code": "SS",
    "name": "South Sudan",
    "currency": "SSP",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "SS"
  },
  {
    "code": "ST",
    "name": "São Tomé & Príncipe",
    "currency": "STN",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "ST"
  },
  {
    "code": "SV",
    "name": "El Salvador",
    "currency": "USD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "SV"
  },
  {
    "code": "SX",
    "name": "Sint Maarten",
    "currency": "XCG",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "SX"
  },
  {
    "code": "SY",
    "name": "Syria",
    "currency": "SYP",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "SY"
  },
  {
    "code": "SZ",
    "name": "Eswatini",
    "currency": "SZL",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "SZ"
  },
  {
    "code": "TA",
    "name": "Tristan da Cunha",
    "currency": "GBP",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "TA"
  },
  {
    "code": "TC",
    "name": "Turks & Caicos Islands",
    "currency": "USD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "TC"
  },
  {
    "code": "TD",
    "name": "Chad",
    "currency": "XAF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "TD"
  },
  {
    "code": "TF",
    "name": "French Southern Territories",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "TF"
  },
  {
    "code": "TG",
    "name": "Togo",
    "currency": "XOF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "TG"
  },
  {
    "code": "TH",
    "name": "Thailand",
    "currency": "THB",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "TH"
  },
  {
    "code": "TJ",
    "name": "Tajikistan",
    "currency": "TJS",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "TJ"
  },
  {
    "code": "TK",
    "name": "Tokelau",
    "currency": "NZD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "TK"
  },
  {
    "code": "TL",
    "name": "Timor-Leste",
    "currency": "USD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "TL"
  },
  {
    "code": "TM",
    "name": "Turkmenistan",
    "currency": "TMT",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "TM"
  },
  {
    "code": "TN",
    "name": "Tunisia",
    "currency": "TND",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "TN"
  },
  {
    "code": "TO",
    "name": "Tonga",
    "currency": "TOP",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "TO"
  },
  {
    "code": "TR",
    "name": "Türkiye",
    "currency": "TRY",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "TR"
  },
  {
    "code": "TT",
    "name": "Trinidad & Tobago",
    "currency": "TTD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "TT"
  },
  {
    "code": "TV",
    "name": "Tuvalu",
    "currency": "AUD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "TV"
  },
  {
    "code": "TW",
    "name": "Taiwan",
    "currency": "TWD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "TW"
  },
  {
    "code": "TZ",
    "name": "Tanzania",
    "currency": "TZS",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "TZ"
  },
  {
    "code": "UA",
    "name": "Ukraine",
    "currency": "UAH",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "UA"
  },
  {
    "code": "UG",
    "name": "Uganda",
    "currency": "UGX",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "UG"
  },
  {
    "code": "UM",
    "name": "U.S. Outlying Islands",
    "currency": "USD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "UM"
  },
  {
    "code": "UN",
    "name": "United Nations",
    "currency": "",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "UN"
  },
  {
    "code": "US",
    "name": "United States",
    "currency": "USD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "US"
  },
  {
    "code": "UY",
    "name": "Uruguay",
    "currency": "UYU",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "UY"
  },
  {
    "code": "UZ",
    "name": "Uzbekistan",
    "currency": "UZS",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "UZ"
  },
  {
    "code": "VA",
    "name": "Vatican City",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "VA"
  },
  {
    "code": "VC",
    "name": "St. Vincent & Grenadines",
    "currency": "XCD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "VC"
  },
  {
    "code": "VE",
    "name": "Venezuela",
    "currency": "VES",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "VE"
  },
  {
    "code": "VG",
    "name": "British Virgin Islands",
    "currency": "USD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "VG"
  },
  {
    "code": "VI",
    "name": "U.S. Virgin Islands",
    "currency": "USD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "VI"
  },
  {
    "code": "VN",
    "name": "Vietnam",
    "currency": "VND",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "VN"
  },
  {
    "code": "VU",
    "name": "Vanuatu",
    "currency": "VUV",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "VU"
  },
  {
    "code": "WF",
    "name": "Wallis & Futuna",
    "currency": "XPF",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "WF"
  },
  {
    "code": "WS",
    "name": "Samoa",
    "currency": "WST",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "WS"
  },
  {
    "code": "XK",
    "name": "Kosovo",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "XK"
  },
  {
    "code": "YE",
    "name": "Yemen",
    "currency": "YER",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "YE"
  },
  {
    "code": "YT",
    "name": "Mayotte",
    "currency": "EUR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "YT"
  },
  {
    "code": "ZA",
    "name": "South Africa",
    "currency": "ZAR",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "ZA"
  },
  {
    "code": "ZM",
    "name": "Zambia",
    "currency": "ZMW",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "ZM"
  },
  {
    "code": "ZW",
    "name": "Zimbabwe",
    "currency": "USD",
    "kind": "COUNTRY_OR_TERRITORY",
    "bankCountryCode": "ZW"
  },
  {
    "code": "GB-ENG",
    "name": "England",
    "currency": "GBP",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "GB"
  },
  {
    "code": "GB-SCT",
    "name": "Scotland",
    "currency": "GBP",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "GB"
  },
  {
    "code": "GB-WLS",
    "name": "Wales",
    "currency": "GBP",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "GB"
  },
  {
    "code": "GB-NIR",
    "name": "Northern Ireland",
    "currency": "GBP",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "GB"
  },
  {
    "code": "US-AL",
    "name": "Alabama",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-AK",
    "name": "Alaska",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-AZ",
    "name": "Arizona",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-AR",
    "name": "Arkansas",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-CA",
    "name": "California",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-CO",
    "name": "Colorado",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-CT",
    "name": "Connecticut",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-DE",
    "name": "Delaware",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-FL",
    "name": "Florida",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-GA",
    "name": "Georgia",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-HI",
    "name": "Hawaii",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-ID",
    "name": "Idaho",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-IL",
    "name": "Illinois",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-IN",
    "name": "Indiana",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-IA",
    "name": "Iowa",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-KS",
    "name": "Kansas",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-KY",
    "name": "Kentucky",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-LA",
    "name": "Louisiana",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-ME",
    "name": "Maine",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-MD",
    "name": "Maryland",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-MA",
    "name": "Massachusetts",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-MI",
    "name": "Michigan",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-MN",
    "name": "Minnesota",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-MS",
    "name": "Mississippi",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-MO",
    "name": "Missouri",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-MT",
    "name": "Montana",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-NE",
    "name": "Nebraska",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-NV",
    "name": "Nevada",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-NH",
    "name": "New Hampshire",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-NJ",
    "name": "New Jersey",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-NM",
    "name": "New Mexico",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-NY",
    "name": "New York",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-NC",
    "name": "North Carolina",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-ND",
    "name": "North Dakota",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-OH",
    "name": "Ohio",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-OK",
    "name": "Oklahoma",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-OR",
    "name": "Oregon",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-PA",
    "name": "Pennsylvania",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-RI",
    "name": "Rhode Island",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-SC",
    "name": "South Carolina",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-SD",
    "name": "South Dakota",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-TN",
    "name": "Tennessee",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-TX",
    "name": "Texas",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-UT",
    "name": "Utah",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-VT",
    "name": "Vermont",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-VA",
    "name": "Virginia",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-WA",
    "name": "Washington",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-WV",
    "name": "West Virginia",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-WI",
    "name": "Wisconsin",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "US-WY",
    "name": "Wyoming",
    "currency": "USD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "US"
  },
  {
    "code": "CA-AB",
    "name": "Alberta",
    "currency": "CAD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "CA"
  },
  {
    "code": "CA-BC",
    "name": "British Columbia",
    "currency": "CAD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "CA"
  },
  {
    "code": "CA-MB",
    "name": "Manitoba",
    "currency": "CAD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "CA"
  },
  {
    "code": "CA-NB",
    "name": "New Brunswick",
    "currency": "CAD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "CA"
  },
  {
    "code": "CA-NL",
    "name": "Newfoundland and Labrador",
    "currency": "CAD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "CA"
  },
  {
    "code": "CA-NS",
    "name": "Nova Scotia",
    "currency": "CAD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "CA"
  },
  {
    "code": "CA-NT",
    "name": "Northwest Territories",
    "currency": "CAD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "CA"
  },
  {
    "code": "CA-NU",
    "name": "Nunavut",
    "currency": "CAD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "CA"
  },
  {
    "code": "CA-ON",
    "name": "Ontario",
    "currency": "CAD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "CA"
  },
  {
    "code": "CA-PE",
    "name": "Prince Edward Island",
    "currency": "CAD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "CA"
  },
  {
    "code": "CA-QC",
    "name": "Quebec",
    "currency": "CAD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "CA"
  },
  {
    "code": "CA-SK",
    "name": "Saskatchewan",
    "currency": "CAD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "CA"
  },
  {
    "code": "CA-YT",
    "name": "Yukon",
    "currency": "CAD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "CA"
  },
  {
    "code": "AU-ACT",
    "name": "Australian Capital Territory",
    "currency": "AUD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "AU"
  },
  {
    "code": "AU-NSW",
    "name": "New South Wales",
    "currency": "AUD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "AU"
  },
  {
    "code": "AU-NT",
    "name": "Northern Territory",
    "currency": "AUD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "AU"
  },
  {
    "code": "AU-QLD",
    "name": "Queensland",
    "currency": "AUD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "AU"
  },
  {
    "code": "AU-SA",
    "name": "South Australia",
    "currency": "AUD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "AU"
  },
  {
    "code": "AU-TAS",
    "name": "Tasmania",
    "currency": "AUD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "AU"
  },
  {
    "code": "AU-VIC",
    "name": "Victoria",
    "currency": "AUD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "AU"
  },
  {
    "code": "AU-WA",
    "name": "Western Australia",
    "currency": "AUD",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "AU"
  },
  {
    "code": "DE-BER",
    "name": "Berlin",
    "currency": "EUR",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "DE"
  },
  {
    "code": "DE-BAV",
    "name": "Bavaria",
    "currency": "EUR",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "DE"
  },
  {
    "code": "DE-HAM",
    "name": "Hamburg",
    "currency": "EUR",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "DE"
  },
  {
    "code": "DE-HES",
    "name": "Hesse",
    "currency": "EUR",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "DE"
  },
  {
    "code": "DE-NRW",
    "name": "North Rhine-Westphalia",
    "currency": "EUR",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "DE"
  },
  {
    "code": "DE-SAX",
    "name": "Saxony",
    "currency": "EUR",
    "kind": "FINANCIAL_JURISDICTION",
    "bankCountryCode": "DE"
  }
];

const FALLBACK_BANKS = {
  IR: [
  {
    "name": "بانک ملی ایران",
    "bankCode": "010",
    "swift": "MELIIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک سپه",
    "bankCode": "015",
    "swift": "SEPBIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک صادرات ایران",
    "bankCode": "019",
    "swift": "BOSAIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک تجارت",
    "bankCode": "018",
    "swift": "BTEJIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک ملت",
    "bankCode": "012",
    "swift": "BKMTIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک رفاه کارگران",
    "bankCode": "013",
    "swift": "REFAIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک مسکن",
    "bankCode": "014",
    "swift": "BMJAIRTH",
    "countryCode": "IR"
  },
  {
    "name": "پست بانک ایران",
    "bankCode": "021",
    "swift": "PBIRIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک توسعه صادرات ایران",
    "bankCode": "020",
    "swift": "EDBIIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک کشاورزی",
    "bankCode": "016",
    "swift": "BKAIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک صنعت و معدن",
    "bankCode": "011",
    "swift": "BIMIIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک توسعه تعاون",
    "bankCode": "022",
    "swift": "TTBIIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک کارآفرین",
    "bankCode": "053",
    "swift": "KARBIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک پارسیان",
    "bankCode": "054",
    "swift": "BKPIIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک پاسارگاد",
    "bankCode": "057",
    "swift": "BKPAIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک سامان",
    "bankCode": "056",
    "swift": "SABCIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک اقتصاد نوین",
    "bankCode": "055",
    "swift": "BEINIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک سینا",
    "bankCode": "059",
    "swift": "SINAIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک شهر",
    "bankCode": "061",
    "swift": "CIYBIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک دی",
    "bankCode": "066",
    "swift": "DAYBIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک آینده",
    "bankCode": "062",
    "swift": "AYBKIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک خاورمیانه",
    "bankCode": "078",
    "swift": "KHMIIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک گردشگری",
    "bankCode": "064",
    "swift": "TOSOIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک ایران زمین",
    "bankCode": "069",
    "swift": "IZBIIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک قرض الحسنه مهر ایران",
    "bankCode": "090",
    "swift": "MEIRIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک قرض الحسنه رسالت",
    "bankCode": "070",
    "swift": "RESIIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک سرمایه",
    "bankCode": "058",
    "swift": "SABCIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک حکمت ایرانیان",
    "bankCode": "065",
    "swift": "HEKMIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک ایران و ونزوئلا",
    "bankCode": "095",
    "swift": "IVBBIRTH",
    "countryCode": "IR"
  },
  {
    "name": "بانک مشترک ایران و ونزوئلا",
    "bankCode": "095",
    "swift": "IVBBIRTH",
    "countryCode": "IR"
  }
],
  AZ: [
  {
    "name": "International Bank of Azerbaijan",
    "bankCode": "",
    "swift": "IBAZAZ2X",
    "countryCode": "AZ"
  },
  {
    "name": "Kapital Bank",
    "bankCode": "",
    "swift": "AIIBAZ2X",
    "countryCode": "AZ"
  },
  {
    "name": "PASHA Bank",
    "bankCode": "",
    "swift": "PAHAAZ22",
    "countryCode": "AZ"
  },
  {
    "name": "Bank Respublika",
    "bankCode": "",
    "swift": "BRESAZ22",
    "countryCode": "AZ"
  },
  {
    "name": "ABB",
    "bankCode": "",
    "swift": "IBAZAZ2X",
    "countryCode": "AZ"
  }
],
  TR: [
  {
    "name": "Ziraat Bankası",
    "bankCode": "",
    "swift": "TCZBTR2A",
    "countryCode": "TR"
  },
  {
    "name": "Türkiye İş Bankası",
    "bankCode": "",
    "swift": "ISBKTRIS",
    "countryCode": "TR"
  },
  {
    "name": "Akbank",
    "bankCode": "",
    "swift": "AKBKTRIS",
    "countryCode": "TR"
  },
  {
    "name": "Garanti BBVA",
    "bankCode": "",
    "swift": "TGBATRIS",
    "countryCode": "TR"
  },
  {
    "name": "Yapı Kredi",
    "bankCode": "",
    "swift": "YAPITRIS",
    "countryCode": "TR"
  }
],
  US: [
  {
    "name": "JPMorgan Chase Bank",
    "bankCode": "",
    "swift": "CHASUS33",
    "countryCode": "US"
  },
  {
    "name": "Bank of America",
    "bankCode": "",
    "swift": "BOFAUS3N",
    "countryCode": "US"
  },
  {
    "name": "Citibank",
    "bankCode": "",
    "swift": "CITIUS33",
    "countryCode": "US"
  },
  {
    "name": "Wells Fargo Bank",
    "bankCode": "",
    "swift": "WFBIUS6S",
    "countryCode": "US"
  },
  {
    "name": "U.S. Bank",
    "bankCode": "",
    "swift": "USBKUS44",
    "countryCode": "US"
  }
],
  GB: [
  {
    "name": "Barclays Bank PLC",
    "bankCode": "",
    "swift": "BARCGB22",
    "countryCode": "GB"
  },
  {
    "name": "HSBC UK Bank PLC",
    "bankCode": "",
    "swift": "HBUKGB4B",
    "countryCode": "GB"
  },
  {
    "name": "Lloyds Bank",
    "bankCode": "",
    "swift": "LOYDGB2L",
    "countryCode": "GB"
  },
  {
    "name": "NatWest Bank",
    "bankCode": "",
    "swift": "NWBKGB2L",
    "countryCode": "GB"
  },
  {
    "name": "Santander UK",
    "bankCode": "",
    "swift": "ABBYGB2L",
    "countryCode": "GB"
  }
],
  DE: [
  {
    "name": "Deutsche Bank",
    "bankCode": "",
    "swift": "DEUTDEFF",
    "countryCode": "DE"
  },
  {
    "name": "Commerzbank",
    "bankCode": "",
    "swift": "COBADEFF",
    "countryCode": "DE"
  },
  {
    "name": "DZ Bank",
    "bankCode": "",
    "swift": "GENODEFF",
    "countryCode": "DE"
  },
  {
    "name": "KfW",
    "bankCode": "",
    "swift": "KFWIDEFF",
    "countryCode": "DE"
  },
  {
    "name": "ING-DiBa",
    "bankCode": "",
    "swift": "INGDDEFF",
    "countryCode": "DE"
  }
],
  AE: [
  {
    "name": "First Abu Dhabi Bank",
    "bankCode": "",
    "swift": "NBADAEAA",
    "countryCode": "AE"
  },
  {
    "name": "Emirates NBD",
    "bankCode": "",
    "swift": "EBILAEAD",
    "countryCode": "AE"
  },
  {
    "name": "Mashreq Bank",
    "bankCode": "",
    "swift": "BOMLAEAD",
    "countryCode": "AE"
  },
  {
    "name": "Abu Dhabi Commercial Bank",
    "bankCode": "",
    "swift": "ADCBAEAA",
    "countryCode": "AE"
  },
  {
    "name": "Dubai Islamic Bank",
    "bankCode": "",
    "swift": "DUIBAEAD",
    "countryCode": "AE"
  }
],
};

const BANK_DATA_API_URL =
  process.env.BANK_DATA_API_URL ||
  "https://api.apilayer.com/bank_data/banks_by_country";

const BANK_DATA_API_KEY =
  process.env.BANK_DATA_API_KEY ||
  "";

const BIN_LOOKUP_URL =
  process.env.BIN_LOOKUP_URL ||
  "https://lookup.binlist.net";

const FRANKFURTER_URL =
  process.env.FX_API_URL ||
  "https://api.frankfurter.dev/v2";

const CACHE_TTL_MS =
  Number(process.env.BANK_DIRECTORY_CACHE_TTL_MS) ||
  6 * 60 * 60 * 1000;

const bankCache = new Map();
const fxCache = new Map();
const binCache = new Map();

function normalizeCardNumber(value) {
  return String(value || "")
    .replace(/[^0-9]/g, "")
    .slice(0, 19);
}

function getBin(value) {
  const normalized = normalizeCardNumber(value);
  if (normalized.length < 6) return "";
  return normalized.slice(0, 8);
}

function getCardLast4(value) {
  const normalized = normalizeCardNumber(value);
  return normalized.length >= 4
    ? normalized.slice(-4)
    : "";
}

function findCountry(code) {
  const normalized = String(code || "").toUpperCase();
  return COUNTRY_DIRECTORY.find(
    (item) => item.code === normalized
  ) || null;
}

function getCountryList() {
  return COUNTRY_DIRECTORY.map((item) => ({
    ...item,
  }));
}

function normalizeBankRecords(records, countryCode) {
  if (!Array.isArray(records)) return [];

  return records.map((item, index) => ({
    id:
      item.id ||
      item.bank_id ||
      item.swift ||
      item.bic ||
      `${countryCode}-${index}`,
    name:
      item.bankName ||
      item.name ||
      item.institution ||
      item.bank_name ||
      "Unknown Bank",
    bankCode:
      item.bankCode ||
      item.code ||
      item.national_bank_code ||
      "",
    swift:
      item.swift ||
      item.bic ||
      item.bic8 ||
      "",
    countryCode,
    city:
      item.city ||
      "",
    branchName:
      item.branchName ||
      item.branch_name ||
      "",
    address:
      item.address ||
      "",
    source:
      item.source ||
      "directory",
  }));
}

async function getBanksByCountry(countryCode, search = "", limit = 500) {
  const country = findCountry(countryCode);
  if (!country) throw new Error("Unsupported country or jurisdiction.");

  const bankCountryCode = country.bankCountryCode;
  const normalizedSearch = String(search || "").trim().toLowerCase();
  const safeLimit = Math.min(Math.max(Number(limit) || 500, 1), 2000);
  const key = `${bankCountryCode}:${normalizedSearch}:${safeLimit}`;
  const cached = bankCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      country,
      banks: cached.banks,
      source: cached.source,
      cached: true,
    };
  }

  let banks = [];
  let source = "fallback";

  if (BANK_DATA_API_KEY) {
    try {
      const params = new URLSearchParams({
        country_code: bankCountryCode,
        page: "1",
        per_page: String(Math.min(safeLimit, 1000)),
      });

      if (normalizedSearch) {
        params.set("search_term", search.trim());
      }

      const response = await fetch(
        `${BANK_DATA_API_URL}?${params.toString()}`,
        {
          headers: {
            apikey: BANK_DATA_API_KEY,
          },
        }
      );

      if (response.ok) {
        const payload = await response.json();
        const raw =
          payload?.banks ||
          payload?.data ||
          payload?.results ||
          payload;
        banks = normalizeBankRecords(
          raw,
          bankCountryCode
        );
        source = "bank-data-api";
      }
    } catch (error) {
      console.warn(
        "Bank directory provider unavailable:",
        error.message
      );
    }
  }

  if (!banks.length) {
    banks = normalizeBankRecords(
      FALLBACK_BANKS[bankCountryCode] || [],
      bankCountryCode
    );
  }

  if (normalizedSearch) {
    banks = banks.filter((bank) =>
      `${bank.name} ${bank.bankCode} ${bank.swift} ${bank.city}`
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }

  banks = banks.slice(0, safeLimit);

  bankCache.set(key, {
    timestamp: Date.now(),
    banks,
    source,
  });

  return {
    country,
    banks,
    source,
    cached: false,
  };
}

async function lookupBin(cardNumber) {
  const bin = getBin(cardNumber);
  if (!/^\d{6,8}$/.test(bin)) {
    throw new Error("Enter at least the first 6 digits of a valid card number.");
  }

  const cached = binCache.get(bin);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { ...cached.data, cached: true };
  }

  let data = null;

  try {
    const response = await fetch(
      `${BIN_LOOKUP_URL}/${bin}`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Version": "3",
        },
      }
    );

    if (response.ok) {
      data = await response.json();
    } else if (response.status !== 404) {
      console.warn(
        "BIN lookup provider returned:",
        response.status
      );
    }
  } catch (error) {
    console.warn(
      "BIN lookup provider unavailable:",
      error.message
    );
  }

  if (!data) {
    throw new Error(
      "BIN information could not be resolved. Select the destination country and bank manually."
    );
  }

  const normalized = {
    bin,
    countryCode:
      data?.country?.alpha2 ||
      data?.country?.code ||
      null,
    countryName:
      data?.country?.name ||
      null,
    currency:
      data?.country?.currency ||
      null,
    bankName:
      data?.bank?.name ||
      data?.bank_name ||
      null,
    scheme:
      data?.scheme ||
      null,
    type:
      data?.type ||
      null,
    brand:
      data?.brand ||
      null,
    cardLast4:
      getCardLast4(cardNumber),
  };

  binCache.set(bin, {
    timestamp: Date.now(),
    data: normalized,
  });

  return {
    ...normalized,
    cached: false,
  };
}

function mapAssetToUsd(asset) {
  const normalized = String(asset || "").toUpperCase();

  if (normalized === "USDT") return 1;

  if (
    ["BTC", "ETH", "SOL", "TRX"].includes(
      normalized
    )
  ) {
    const engine = require("./internal-market.engine");
    const price = Number(
      engine.getPrice(normalized)
    );

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(
        `Internal price unavailable for ${normalized}.`
      );
    }

    return price;
  }

  if (normalized === "RIAL") return null;

  throw new Error(
    `Unsupported settlement source asset: ${normalized}`
  );
}

async function getFxRate(from, to) {
  const base = String(from || "").toUpperCase();
  const quote = String(to || "").toUpperCase();

  if (!base || !quote) {
    throw new Error("Source and destination currencies are required.");
  }

  if (base === quote) return 1;

  const key = `${base}:${quote}`;
  const cached = fxCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.rate;
  }

  const response = await fetch(
    `${FRANKFURTER_URL}/rate/${base}/${quote}`
  );

  if (!response.ok) {
    throw new Error(
      `FX rate ${base}/${quote} is unavailable.`
    );
  }

  const data = await response.json();
  const rate = Number(data?.rate);

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(
      `FX rate ${base}/${quote} is invalid.`
    );
  }

  fxCache.set(key, {
    timestamp: Date.now(),
    rate,
  });

  return rate;
}

async function calculateSettlement({
  sourceAsset,
  sourceAmount,
  destinationCurrency,
}) {
  const asset = String(
    sourceAsset || ""
  ).toUpperCase();

  const amount = new Prisma.Decimal(
    String(sourceAmount)
  );

  if (!amount.gt(0)) {
    throw new Error("Settlement amount must be greater than zero.");
  }

  const target = String(
    destinationCurrency || ""
  ).toUpperCase();

  if (!/^[A-Z]{3}$/.test(target)) {
    throw new Error("Invalid destination currency.");
  }

  let usdAmount = null;
  let sourceToUsdRate = null;

  if (asset === "RIAL") {
    const irrPerUsd = await getFxRate(
      "USD",
      "IRR"
    );

    usdAmount =
      amount.div(
        new Prisma.Decimal(
          irrPerUsd
        )
      );

    sourceToUsdRate =
      new Prisma.Decimal("1").div(
        new Prisma.Decimal(
          irrPerUsd
        )
      );
  } else {
    const usdPerAsset =
      mapAssetToUsd(asset);

    usdAmount =
      amount.mul(
        new Prisma.Decimal(
          String(usdPerAsset)
        )
      );

    sourceToUsdRate =
      new Prisma.Decimal(
        String(usdPerAsset)
      );
  }

  const usdToDestination =
    target === "USD"
      ? 1
      : await getFxRate(
          "USD",
          target
        );

  const destinationAmount =
    usdAmount.mul(
      new Prisma.Decimal(
        String(
          usdToDestination
        )
      )
    );

  return {
    sourceAsset: asset,
    sourceAmount:
      amount.toString(),
    destinationCurrency:
      target,
    sourceToUsdRate:
      sourceToUsdRate.toString(),
    usdToDestinationRate:
      String(usdToDestination),
    usdAmount:
      usdAmount.toString(),
    convertedAmount:
      destinationAmount.toString(),
    exchangeRateSource:
      "Frankfurter + Hyper Trade Internal Market Engine",
  };
}

module.exports = {
  COUNTRY_DIRECTORY,
  getCountryList,
  getBanksByCountry,
  lookupBin,
  calculateSettlement,
  normalizeCardNumber,
  getBin,
  getCardLast4,
};
