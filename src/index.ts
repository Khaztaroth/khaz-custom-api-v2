import { routeRequest } from "./router"

export interface Env {
	WEATHER_KEY: string,
	DEFAULT_PLACE: string
	TIMEZONE_KEY: string
	puddle: KVNamespace
}


export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return routeRequest(request, env, ctx)
    }
}

