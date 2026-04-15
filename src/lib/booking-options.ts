import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

const flagFromCountryCode = (countryCode: CountryCode) =>
  countryCode.replace(/./g, (char) =>
    String.fromCodePoint(127397 + char.charCodeAt(0)),
  );

export const COUNTRY_OPTIONS = getCountries()
  .map((countryCode) => ({
    countryCode,
    dialCode: `+${getCountryCallingCode(countryCode)}`,
    flag: flagFromCountryCode(countryCode),
    name: regionNames.of(countryCode) ?? countryCode,
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

export const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";
  const value = `${String(hour).padStart(2, "0")}:${minute}`;
  const labelHour = hour % 12 || 12;
  const period = hour < 12 ? "AM" : "PM";

  return {
    value,
    label: `${labelHour}:${minute} ${period}`,
  };
});
