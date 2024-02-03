import { Env } from ".";
import { Weather } from "./routes/hydration";

export async function routeRequest(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url)
    const path = url.pathname.split("/").slice(1)

    switch(path[0]) {
        case "weather": 
            return Weather(request)
        case "hydration": 
            return new Response("Under construction")
        default:
            return new Response("Not found", {status: 404})
    }
}