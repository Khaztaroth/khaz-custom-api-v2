import { Env } from ".";
import { Weather } from "./routes/weather";
import { Hydration } from "./routes/hydration";
import { DiceRoll } from "./routes/diceRoll";
import { ClearAttempts, JoinPuddle, LeavePuddle, PurgePuddle } from "./routes/cuddlepuddle";
import { WordPronunciation } from "./routes/toPhonetics";
import { timeZone } from "./routes/timeZone";

export async function routeRequest(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const path = url.pathname.split("/").slice(1);
    const weather_key = env.WEATHER_KEY;
    const defaultLocation = env.DEFAULT_PLACE;
    const defaultChannel = "khaztaroth315";

    switch (path[0]) {
      case "weather":
        return Weather(request, weather_key, defaultLocation);
      case "timezone":
        return timeZone(request)
      case "hydration":
        return Hydration(request, defaultChannel);
      case "diceRoll":
        return DiceRoll(request);
      case "joinPuddle": 
        return JoinPuddle(request, env);
      case "cleanPuddle": 
        return PurgePuddle(request, env);
      case "leavePuddle":
        return LeavePuddle(request, env)
      case "cleanRecord": 
        return ClearAttempts(request, env)
      case "pronunciation":
        return WordPronunciation(request)
      default:
        return new Response("Not found", { status: 404 });
    }
  }