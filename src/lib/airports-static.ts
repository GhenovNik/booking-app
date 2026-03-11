/**
 * Static fallback airport list.
 * Used when the TA port cache is empty (before API key is configured).
 * Covers Turkish Airlines' main destinations.
 */
export interface Airport {
  iataCode: string;
  name: string;
  city: string;
  country: string;
}

export const STATIC_AIRPORTS: Airport[] = [
  // ── Turkey ─────────────────────────────────────────────────────────────────
  { iataCode: "IST", name: "Istanbul Airport", city: "Istanbul", country: "TR" },
  { iataCode: "SAW", name: "Sabiha Gökçen Airport", city: "Istanbul", country: "TR" },
  { iataCode: "ESB", name: "Esenboğa Airport", city: "Ankara", country: "TR" },
  { iataCode: "AYT", name: "Antalya Airport", city: "Antalya", country: "TR" },
  { iataCode: "ADB", name: "Adnan Menderes Airport", city: "Izmir", country: "TR" },
  { iataCode: "TZX", name: "Trabzon Airport", city: "Trabzon", country: "TR" },
  { iataCode: "GZT", name: "Gaziantep Airport", city: "Gaziantep", country: "TR" },
  // ── Western Europe ──────────────────────────────────────────────────────────
  { iataCode: "LHR", name: "Heathrow Airport", city: "London", country: "GB" },
  { iataCode: "LGW", name: "Gatwick Airport", city: "London", country: "GB" },
  { iataCode: "CDG", name: "Charles de Gaulle Airport", city: "Paris", country: "FR" },
  { iataCode: "ORY", name: "Orly Airport", city: "Paris", country: "FR" },
  { iataCode: "AMS", name: "Schiphol Airport", city: "Amsterdam", country: "NL" },
  { iataCode: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "DE" },
  { iataCode: "MUC", name: "Munich Airport", city: "Munich", country: "DE" },
  { iataCode: "TXL", name: "Berlin Brandenburg Airport", city: "Berlin", country: "DE" },
  { iataCode: "BER", name: "Berlin Brandenburg Airport", city: "Berlin", country: "DE" },
  { iataCode: "MAD", name: "Barajas Airport", city: "Madrid", country: "ES" },
  { iataCode: "BCN", name: "El Prat Airport", city: "Barcelona", country: "ES" },
  { iataCode: "FCO", name: "Fiumicino Airport", city: "Rome", country: "IT" },
  { iataCode: "MXP", name: "Malpensa Airport", city: "Milan", country: "IT" },
  { iataCode: "ZRH", name: "Zurich Airport", city: "Zurich", country: "CH" },
  { iataCode: "GVA", name: "Geneva Airport", city: "Geneva", country: "CH" },
  { iataCode: "VIE", name: "Vienna Airport", city: "Vienna", country: "AT" },
  { iataCode: "BRU", name: "Brussels Airport", city: "Brussels", country: "BE" },
  { iataCode: "LIS", name: "Humberto Delgado Airport", city: "Lisbon", country: "PT" },
  { iataCode: "ATH", name: "Eleftherios Venizelos Airport", city: "Athens", country: "GR" },
  { iataCode: "HEL", name: "Helsinki Airport", city: "Helsinki", country: "FI" },
  { iataCode: "ARN", name: "Arlanda Airport", city: "Stockholm", country: "SE" },
  { iataCode: "OSL", name: "Gardermoen Airport", city: "Oslo", country: "NO" },
  { iataCode: "CPH", name: "Copenhagen Airport", city: "Copenhagen", country: "DK" },
  { iataCode: "DUB", name: "Dublin Airport", city: "Dublin", country: "IE" },
  // ── Eastern Europe ──────────────────────────────────────────────────────────
  { iataCode: "WAW", name: "Chopin Airport", city: "Warsaw", country: "PL" },
  { iataCode: "KRK", name: "John Paul II Airport", city: "Kraków", country: "PL" },
  { iataCode: "PRG", name: "Václav Havel Airport", city: "Prague", country: "CZ" },
  { iataCode: "BUD", name: "Ferenc Liszt Airport", city: "Budapest", country: "HU" },
  { iataCode: "OTP", name: "Henri Coandă Airport", city: "Bucharest", country: "RO" },
  { iataCode: "SOF", name: "Sofia Airport", city: "Sofia", country: "BG" },
  { iataCode: "BEG", name: "Nikola Tesla Airport", city: "Belgrade", country: "RS" },
  { iataCode: "LJU", name: "Jože Pučnik Airport", city: "Ljubljana", country: "SI" },
  { iataCode: "ZAG", name: "Zagreb Airport", city: "Zagreb", country: "HR" },
  { iataCode: "SKP", name: "Skopje Airport", city: "Skopje", country: "MK" },
  { iataCode: "TIA", name: "Rinas Airport", city: "Tirana", country: "AL" },
  { iataCode: "KIV", name: "Chișinău International Airport", city: "Chișinău", country: "MD" },
  { iataCode: "KBP", name: "Boryspil Airport", city: "Kyiv", country: "UA" },
  { iataCode: "RIX", name: "Riga Airport", city: "Riga", country: "LV" },
  { iataCode: "TLL", name: "Tallinn Airport", city: "Tallinn", country: "EE" },
  { iataCode: "VNO", name: "Vilnius Airport", city: "Vilnius", country: "LT" },
  { iataCode: "MSQ", name: "Minsk National Airport", city: "Minsk", country: "BY" },
  { iataCode: "SVO", name: "Sheremetyevo Airport", city: "Moscow", country: "RU" },
  { iataCode: "DME", name: "Domodedovo Airport", city: "Moscow", country: "RU" },
  { iataCode: "LED", name: "Pulkovo Airport", city: "St. Petersburg", country: "RU" },
  // ── Caucasus & Central Asia ────────────────────────────────────────────────
  { iataCode: "TBS", name: "Tbilisi Airport", city: "Tbilisi", country: "GE" },
  { iataCode: "EVN", name: "Zvartnots Airport", city: "Yerevan", country: "AM" },
  { iataCode: "GYD", name: "Heydar Aliyev Airport", city: "Baku", country: "AZ" },
  { iataCode: "TAS", name: "Islam Karimov Airport", city: "Tashkent", country: "UZ" },
  { iataCode: "ALA", name: "Almaty Airport", city: "Almaty", country: "KZ" },
  { iataCode: "NQZ", name: "Nursultan Nazarbayev Airport", city: "Astana", country: "KZ" },
  // ── Middle East ─────────────────────────────────────────────────────────────
  { iataCode: "DXB", name: "Dubai International Airport", city: "Dubai", country: "AE" },
  { iataCode: "AUH", name: "Abu Dhabi Airport", city: "Abu Dhabi", country: "AE" },
  { iataCode: "DOH", name: "Hamad International Airport", city: "Doha", country: "QA" },
  { iataCode: "RUH", name: "King Khalid Airport", city: "Riyadh", country: "SA" },
  { iataCode: "JED", name: "King Abdulaziz Airport", city: "Jeddah", country: "SA" },
  { iataCode: "KWI", name: "Kuwait International Airport", city: "Kuwait City", country: "KW" },
  { iataCode: "BAH", name: "Bahrain International Airport", city: "Manama", country: "BH" },
  { iataCode: "MCT", name: "Muscat International Airport", city: "Muscat", country: "OM" },
  { iataCode: "AMM", name: "Queen Alia Airport", city: "Amman", country: "JO" },
  { iataCode: "BEY", name: "Rafic Hariri Airport", city: "Beirut", country: "LB" },
  { iataCode: "TLV", name: "Ben Gurion Airport", city: "Tel Aviv", country: "IL" },
  { iataCode: "BGW", name: "Baghdad Airport", city: "Baghdad", country: "IQ" },
  { iataCode: "IKA", name: "Imam Khomeini Airport", city: "Tehran", country: "IR" },
  // ── Africa ──────────────────────────────────────────────────────────────────
  { iataCode: "CAI", name: "Cairo International Airport", city: "Cairo", country: "EG" },
  { iataCode: "CMN", name: "Mohammed V Airport", city: "Casablanca", country: "MA" },
  { iataCode: "TUN", name: "Carthage Airport", city: "Tunis", country: "TN" },
  { iataCode: "ALG", name: "Houari Boumediene Airport", city: "Algiers", country: "DZ" },
  { iataCode: "ADD", name: "Bole Airport", city: "Addis Ababa", country: "ET" },
  { iataCode: "NBO", name: "Jomo Kenyatta Airport", city: "Nairobi", country: "KE" },
  { iataCode: "JNB", name: "O.R. Tambo Airport", city: "Johannesburg", country: "ZA" },
  { iataCode: "LOS", name: "Murtala Muhammed Airport", city: "Lagos", country: "NG" },
  { iataCode: "ACC", name: "Kotoka Airport", city: "Accra", country: "GH" },
  { iataCode: "DAR", name: "Julius Nyerere Airport", city: "Dar es Salaam", country: "TZ" },
  // ── Asia ────────────────────────────────────────────────────────────────────
  { iataCode: "DEL", name: "Indira Gandhi Airport", city: "New Delhi", country: "IN" },
  { iataCode: "BOM", name: "Chhatrapati Shivaji Airport", city: "Mumbai", country: "IN" },
  { iataCode: "BLR", name: "Kempegowda Airport", city: "Bangalore", country: "IN" },
  { iataCode: "PEK", name: "Capital Airport", city: "Beijing", country: "CN" },
  { iataCode: "PVG", name: "Pudong Airport", city: "Shanghai", country: "CN" },
  { iataCode: "CAN", name: "Baiyun Airport", city: "Guangzhou", country: "CN" },
  { iataCode: "HKG", name: "Hong Kong Airport", city: "Hong Kong", country: "HK" },
  { iataCode: "NRT", name: "Narita Airport", city: "Tokyo", country: "JP" },
  { iataCode: "HND", name: "Haneda Airport", city: "Tokyo", country: "JP" },
  { iataCode: "ICN", name: "Incheon Airport", city: "Seoul", country: "KR" },
  { iataCode: "BKK", name: "Suvarnabhumi Airport", city: "Bangkok", country: "TH" },
  { iataCode: "SIN", name: "Changi Airport", city: "Singapore", country: "SG" },
  { iataCode: "KUL", name: "KLIA", city: "Kuala Lumpur", country: "MY" },
  { iataCode: "CGK", name: "Soekarno–Hatta Airport", city: "Jakarta", country: "ID" },
  { iataCode: "MNL", name: "Ninoy Aquino Airport", city: "Manila", country: "PH" },
  { iataCode: "SGN", name: "Tan Son Nhat Airport", city: "Ho Chi Minh City", country: "VN" },
  { iataCode: "HAN", name: "Noi Bai Airport", city: "Hanoi", country: "VN" },
  { iataCode: "KHI", name: "Jinnah Airport", city: "Karachi", country: "PK" },
  { iataCode: "LHE", name: "Allama Iqbal Airport", city: "Lahore", country: "PK" },
  { iataCode: "ISB", name: "Islamabad Airport", city: "Islamabad", country: "PK" },
  { iataCode: "DAC", name: "Hazrat Shahjalal Airport", city: "Dhaka", country: "BD" },
  { iataCode: "CMB", name: "Bandaranaike Airport", city: "Colombo", country: "LK" },
  { iataCode: "KTM", name: "Tribhuvan Airport", city: "Kathmandu", country: "NP" },
  // ── North America ───────────────────────────────────────────────────────────
  { iataCode: "JFK", name: "John F. Kennedy Airport", city: "New York", country: "US" },
  { iataCode: "EWR", name: "Newark Liberty Airport", city: "New York", country: "US" },
  { iataCode: "LAX", name: "Los Angeles Airport", city: "Los Angeles", country: "US" },
  { iataCode: "ORD", name: "O'Hare Airport", city: "Chicago", country: "US" },
  { iataCode: "ATL", name: "Hartsfield-Jackson Airport", city: "Atlanta", country: "US" },
  { iataCode: "MIA", name: "Miami Airport", city: "Miami", country: "US" },
  { iataCode: "BOS", name: "Logan Airport", city: "Boston", country: "US" },
  { iataCode: "SFO", name: "San Francisco Airport", city: "San Francisco", country: "US" },
  { iataCode: "IAD", name: "Dulles Airport", city: "Washington DC", country: "US" },
  { iataCode: "DFW", name: "Dallas/Fort Worth Airport", city: "Dallas", country: "US" },
  { iataCode: "SEA", name: "Sea-Tac Airport", city: "Seattle", country: "US" },
  { iataCode: "PDX", name: "Portland International Airport", city: "Portland", country: "US" },
  { iataCode: "YYZ", name: "Pearson Airport", city: "Toronto", country: "CA" },
  { iataCode: "YVR", name: "Vancouver Airport", city: "Vancouver", country: "CA" },
  { iataCode: "YUL", name: "Trudeau Airport", city: "Montreal", country: "CA" },
  // ── South America ────────────────────────────────────────────────────────────
  { iataCode: "GRU", name: "Guarulhos Airport", city: "São Paulo", country: "BR" },
  { iataCode: "EZE", name: "Ezeiza Airport", city: "Buenos Aires", country: "AR" },
  { iataCode: "SCL", name: "Arturo Merino Benítez Airport", city: "Santiago", country: "CL" },
  { iataCode: "BOG", name: "El Dorado Airport", city: "Bogotá", country: "CO" },
  { iataCode: "LIM", name: "Jorge Chávez Airport", city: "Lima", country: "PE" },
];

/** Search airports by IATA prefix, city or name (case-insensitive). Max 10 results. */
export function searchStaticAirports(q: string): Airport[] {
  const query = q.toLowerCase().trim();
  if (query.length < 2) return [];

  const byCode = STATIC_AIRPORTS.filter((a) =>
    a.iataCode.toLowerCase().startsWith(query)
  );
  const byCity = STATIC_AIRPORTS.filter(
    (a) =>
      !a.iataCode.toLowerCase().startsWith(query) &&
      (a.city.toLowerCase().includes(query) || a.name.toLowerCase().includes(query))
  );

  return [...byCode, ...byCity].slice(0, 10);
}
