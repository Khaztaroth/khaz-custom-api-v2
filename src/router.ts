import { Env } from ".";
import { Weather } from "./routes/weather";
import { Hydration } from "./routes/hydration";
import { DiceRoll } from "./routes/diceRoll";
import { CheckPuddle, ClearAttempts, JoinPuddle, LeavePuddle, PurgePuddle } from "./routes/cuddlepuddle";
import { WordPronunciation } from "./routes/toPhonetics";
import { DeleteQuote, FindQuote, GenerateKey, InsertQuote, ModifyQuote, SaveQuote } from "./routes/quotes";

export async function routeRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response|undefined> {
    const url = new URL(request.url);
    const path = url.pathname.split("/").slice(1);
    const weather_key = env.WEATHER_KEY;
    const defaultLocation = env.DEFAULT_PLACE;

    switch (path[0]) {
      case "weather":
        return Weather(request, weather_key, defaultLocation);
      case "hydration":
        return Hydration(request);
      case "diceRoll":
        return DiceRoll(request);
      case "checkPuddle":
        return CheckPuddle(request, env);
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
      case "addquote":
        return SaveQuote(request, env)
      case "findquote":
        return FindQuote(request, env)
      case "deletequote":
        return DeleteQuote(request,env)
      case "modifyquote":
        return ModifyQuote(request, env)
      case "insertquote":
        return InsertQuote(request, env)
      case "quotekeygen":
        return GenerateKey(request)
      default:
        return new Response("Not found", { status: 404 });
    }
  }