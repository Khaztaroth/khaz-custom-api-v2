import { Env } from "..";

type TallyMarker = Record<string, number> | null | undefined

function GetParameters(request: Request) {
    const parameters = new URL(request.url).searchParams
    const channel = parameters.get("channel")
    const user = parameters.get("user")
    const count = parameters.get("count")

    return [channel, user, count]
}

async function AddAttempt(env : Env, user: string, channel: string, count?: string | null): Promise<Number | Response> {
    const ChannelPuddleName = `${channel}-puddle`
    const UserTallyName = `${user}-tally`
    const ChannelTally: TallyMarker = await env.puddle.get(ChannelPuddleName, {type: "json"})

        if (!ChannelTally) {
            return new Response("Couldn't find puddle", {status: 404})
        }
        if (ChannelTally && user) {
            let userTally = ChannelTally[UserTallyName]
            if (count && +count > userTally){userTally = +count}
            if (!userTally) {
                let tally = 1
                ChannelTally[UserTallyName] = tally
                await env.puddle.put(ChannelPuddleName, JSON.stringify(ChannelTally))
            } else {
                ChannelTally[UserTallyName] = userTally + 1
                await env.puddle.put(ChannelPuddleName, JSON.stringify(ChannelTally))
            }
            return ChannelTally[UserTallyName]
        }
        if(!user){
            return new Response("You gotta tell me who is getting in, buster", {status: 400})
        }
    return ChannelTally[UserTallyName]
}

async function SubstractAttempt(env : Env, user : string, channel: string, count? : string | null): Promise<Response | number> {
    const ChannelPuddleName = `${channel}-puddle`
    const UserTallyName = `${user}-tally`
    const ChannelTally: TallyMarker = await env.puddle.get(ChannelPuddleName, {type: "json"})

        if (!ChannelTally) {
            return new Response("Couldn't find puddle", {status: 404})
        }
        if (ChannelTally && user) {
            let userTally = ChannelTally[UserTallyName]
            if (count && +count > userTally){userTally = +count}
            if (!userTally) {
                return new Response("Can't leave if you haven't been here", {status: 400})
            } else {
                ChannelTally[UserTallyName] = userTally + 1
                await env.puddle.put(ChannelPuddleName, JSON.stringify(ChannelTally))
            }
            return userTally
        }
        if(!user){
            return new Response("You gotta tell me who is getting in, buster", {status: 400})
        }
    return ChannelTally[UserTallyName] || 0
}

export async function ClearAttempts(request : Request, env : Env): Promise<Response> {
    const [Channel, User, Count] = GetParameters(request)
    const ChannelPuddleName = `${Channel?.toLowerCase()}-puddle`
    const UserTallyKey = `${User?.toLowerCase()}-tally`

    const ChannelTally: TallyMarker = await env.puddle.get(ChannelPuddleName, {type: "json"})

        if(!ChannelTally) {
            return new Response("Couldn't find puddle", {status: 404})
        }
        if (ChannelTally){
            if (!ChannelTally[UserTallyKey]){
                return new Response("You can't leave if you haven't been here")
            } else {
                delete ChannelTally[UserTallyKey]
                env.puddle.put(ChannelPuddleName, JSON.stringify(ChannelTally))
                return new Response(`${User} has cleared their record and is now at 0. You can always join again.`)
            }
        }
    return new Response("All good I think", {status: 200})
}

export async function PurgePuddle(request : Request, env : Env): Promise<Response> {
    const [Channel] = GetParameters(request)
    const ChannelLowercase = Channel?.toLowerCase()
    const PileKeyName = `${ChannelLowercase}-pile`
    const CurrentPile = await env.puddle.get(PileKeyName)

    if (!Channel) {
        return new Response("Whose puddle?", {status: 404})
    }
    if (!CurrentPile) {
        return new Response("Puddle is already empty", {status: 404})
    }

    env.puddle.put(PileKeyName,"")
    return new Response("Pudle is now empty.", {status: 200})
}

export async function CheckPuddle (request: Request, env: Env): Promise<Response> {
    const [Channel] = GetParameters(request)
    const ChannelLowercase = Channel?.toLowerCase()
    const PileKeyName = `${ChannelLowercase}-pile`
    const CurrentPile: string | null = await env.puddle.get(PileKeyName)
    const Pile: string[] | undefined = CurrentPile?.split(',').filter((people) => people !== '')

    if (!CurrentPile) {
        return new Response("No one here I guess ¯\\_(ツ)_/¯")
    } else if (Pile) {
        const list = Pile.join(', ')
        const pileSize = Pile.length
        const message = `There's currently ${pileSize>1? `${pileSize} people` : `${pileSize} person`} in the puddle: ${list}.`

        return new Response(message, {status: 200})
    }

    return new Response("Bad request", {status: 400})
}

export async function JoinPuddle (request: Request, env: Env): Promise<Response> {
    const [Channel, User, Count] = GetParameters(request)
    const [ChannelLowercase, UserLowercase] = [Channel?.toLowerCase(), User?.toLowerCase()]
    const PileKeyName = `${ChannelLowercase}-pile`
    const CurrentPile: string | null = await env.puddle.get(PileKeyName)
    const Pile: string[] = CurrentPile?.split(',').filter((people) => people !== '') || []

    if (!Channel) {
        return new Response("What are we doing, man?", {status: 400})
    }
    if (UserLowercase && ChannelLowercase){
        if (CurrentPile?.includes(UserLowercase)) {
            const response = `${User} is already in the puddle, no double dipping`
    
            return new Response(response, {status: 200})
        } else if (User) {
        const tally = await AddAttempt(env, UserLowercase, ChannelLowercase, Count)
        let newPuddle = Pile.concat(User).toString()
        await env.puddle.put(PileKeyName, newPuddle, {expirationTtl: 43200})
        const response = `${User} has jumped into the puddle, they've jumped in ${tally} times, spicy.`
        
        return new Response(response, {status: 200})
        }
    }
    
    return new Response("Something ain't right but I don't know what", {status: 418})
}

export async function LeavePuddle (request: Request, env: Env): Promise<Response> {
    const [Channel, User] = GetParameters(request)
    const [ChannelLowercase, UserLowercase] = [Channel?.toLowerCase(), User?.toLowerCase()]
    const PileKeyName = `${ChannelLowercase}-pile`
    const CurrentPuddle: string | null = await env.puddle.get(PileKeyName)

    if (!UserLowercase) {
        return new Response("Gotta tell me who first", {status: 400})
    } 
    if (CurrentPuddle === null){
        return new Response("Couldn't find puddle", {status: 404})
    } else if (User) {
        if (!CurrentPuddle.includes(User)) {
            const message = `You are not in the puddle, ${User}, don't be silly.`
            
            return new Response(message)
        } else {
            const puddleArray = CurrentPuddle.split(',')
            const filterPuddle = puddleArray.filter((quitter) => quitter !== User)
            const filteredPuddle = filterPuddle?.toString() || ''
            const pileSize = filterPuddle?.length

            await env.puddle.put(PileKeyName,filteredPuddle)
            const message = `${User} had enough and left the puddle. ${pileSize<=0? "The puddle is now empty" : `We are down to ${pileSize} ${pileSize>1? "people" : "person"}`}`
    
            return new Response(message)
        }   
    }
    return new Response("Something went wrong but I don't know what", {status: 418})
}