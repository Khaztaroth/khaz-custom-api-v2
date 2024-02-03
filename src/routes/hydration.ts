const weatherUrl: string = "http://api.weatherapi.com/v1/current.json";
const WeatherKey: string = "c7548475ea364c1a903230343230208";
const birbland: string = "Chillan";

export interface WeatherData {
    location: Location;
    current: Current;
}

export interface Location {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    tz_id: string;
    localtime_epoch: number;
    localtime: string;
}

export interface Current {
    temp_c: number;
    temp_f: number;
    condition: Condition;
    wind_mph: number;
    wind_kph: number;
    wind_dir: string;
    humidity: number;
    feelslike_c: number;
    feelslike_f: number;
    uv: number;
}

export interface Condition {
    text: string;
}

async function fetchWeatherData(place: string): Promise<string> {
    const reqUrl = `${weatherUrl}?key=${WeatherKey}&q=${place}&aqi=no`;

    try {
        const req = await fetch(reqUrl);

        if (req.ok) {
            const data: WeatherData = await req.json();
            const weatherMessage = (place !== birbland)
                ? `Current weather in ${data.location.name}, ${data.location.region} is ${data.current.temp_c}°C/${data.current.temp_f}°F and ${data.current.condition.text.toLowerCase()} skies, with a temperature sensation of ${data.current.feelslike_c}°C/${data.current.feelslike_f}°F and a humidity of ${data.current.humidity}%.The wind is headed ${data.current.wind_dir} at ${data.current.wind_kph}KPH/${data.current.wind_mph}MPH.`

                : `Current weather in Birbland is ${data.current.temp_c}°C/${data.current.temp_f}°F and ${data.current.condition.text.toLowerCase()} skies, with a temperature sensation of ${data.current.feelslike_c}°C/${data.current.feelslike_f}°F and a humidity of ${data.current.humidity}%. The wind is headed ${data.current.wind_dir} at ${data.current.wind_kph}KPH/${data.current.wind_mph}MPH.`

            return weatherMessage;
            } else {
                throw new Error("Request failed with status: " + req.status);
        }
    } catch (err) {
        console.log("There was an issue fetching the data", err);
        throw new Error("Error fetching data");
    }
};

export async function Weather(request: Request) {
    try {
        const place = new URL(request.url).searchParams.get('place') || birbland;
        const weatherData = await fetchWeatherData(place);
        console.log(weatherData);
        return new Response(weatherData);
    } catch (err) {
        console.error("Error", err);
        return new Response("Internal server error", { status: 500 });
    }
};

