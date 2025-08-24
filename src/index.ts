import { routeRequest } from "./router"

interface Users {
	"Khaztaroth315": number,
	"LeprechaunKoala": number,
}
export type Keys = Users

export interface Env {
	WEATHER_KEY: string,
	DEFAULT_PLACE: string
	TIMEZONE_KEY: string
	QUOTE_KEYS: string
	puddle: KVNamespace
	quotes: KVNamespace
}


export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response|undefined> {
		return routeRequest(request, env, ctx)
    }
}

