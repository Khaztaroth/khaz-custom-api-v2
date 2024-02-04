var weatherUrl = "http://api.weatherapi.com/v1/current.json";

export interface WeatherData {
    location: Location
    current: Current
  }
  
  export interface Location {
    name: string
    region: string
    country: string
    lat: number
    lon: number
    tz_id: string
    localtime_epoch: number
    localtime: string
  }
  
  export interface Current {
    temp_c: number
    temp_f: number
    condition: Condition
    wind_mph: number
    wind_kph: number
    wind_dir: string
    humidity: number
    feelslike_c: number
    feelslike_f: number
    uv: number
  }
  
  export interface Condition {
    text: string
  }
  

async function fetchWeatherData(local: string, key: string, defaultPlace: string) {
  const location = local?.toLowerCase();
  const birbland = defaultPlace.toLowerCase();
  const reqUrl = `${weatherUrl}?key=${key}&q=${location}&aqi=no`;
  try {
    const req = await fetch(reqUrl);
    if (req.ok) {
      const data: WeatherData = await req.json();
      const weatherMessage = location !== birbland && location !== null ? `Current weather in ${data.location.name}, ${data.location.region} is ${data.current.temp_c}\xB0C/${data.current.temp_f}\xB0F and ${data.current.condition.text.toLowerCase()} skies, with a temperature sensation of ${data.current.feelslike_c}\xB0C/${data.current.feelslike_f}\xB0F and a humidity of ${data.current.humidity}%.The wind is headed ${data.current.wind_dir} at ${data.current.wind_kph}KPH/${data.current.wind_mph}MPH.` : `Current weather in Birbland, Somewhere is ${data.current.temp_c}\xB0C/${data.current.temp_f}\xB0F and ${data.current.condition.text.toLowerCase()} skies, with a temperature sensation of ${data.current.feelslike_c}\xB0C/${data.current.feelslike_f}\xB0F and a humidity of ${data.current.humidity}%. The wind is headed ${data.current.wind_dir} at ${data.current.wind_kph}KPH/${data.current.wind_mph}MPH.`;
      return weatherMessage;
    } else {
      throw new Error("Request failed with status: " + req.status);
    }
  } catch (err) {
    console.log("There was an issue fetching the data", err);
    throw new Error("Error fetching data");
  }
}
export async function Weather(request: Request, key: string, defaultLocation: string) {
  try {
    const location = new URL(request.url).searchParams.get("location") || defaultLocation;
    const weatherData = await fetchWeatherData(location, key, defaultLocation);
    return new Response(weatherData);
  } catch (err) {
    console.error("Error", err);
    return new Response("Internal server error", { status: 500 });
  }
}
