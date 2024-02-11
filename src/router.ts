import { Env } from ".";
import { Weather } from "./routes/weather";
import { Hydration } from "./routes/hydration";
import { DiceRoll } from "./routes/diceRoll";

export async function routeRequest(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const path = url.pathname.split("/").slice(1);
    const key = env.WEATHER_KEY;
    const defaultLocation = env.DEFAULT_PLACE;
    const defaultChannel = "khaztaroth315";

    switch (path[0]) {
      case "weather":
        return Weather(request, key, defaultLocation);
      case "hydration":
        return Hydration(request, defaultChannel);
      case "diceRoll":
        return DiceRoll(request);
      default:
        return new Response("Not found", { status: 404 });
    }
  }