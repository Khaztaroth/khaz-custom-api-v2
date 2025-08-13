import { Env } from "..";

type TallyMarker = Record<string, number> | null | undefined

function GetParameters(request: Request) {
    const parameters = new URL(request.url).searchParams
    const channel = parameters.get("channel")
    const user = parameters.get("user")
    const count = parameters.get("count")

    return [channel, user, count]
}

export async function PurgePuddle(request : Request, env : Env): Promise<Response> {
    const [channel] = GetParameters(request)
    const channelLowercase = channel?.toLowerCase()
    const PileKeyName = `${channelLowercase}-pile`
    const currentPile = await env.puddle.get(PileKeyName)

    if (!channel) {
        return new Response("Whose puddle?", {status: 404})
    }
    if (!currentPile) {
        return new Response("Puddle is already empty", {status: 404})
    }

    env.puddle.put(PileKeyName,"")
    return new Response("Pudle is now empty.", {status: 200})
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
            return userTally
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
    const [channel, user, count] = GetParameters(request)
    const ChannelPuddleName = `${channel?.toLowerCase()}-puddle`
    const UserTallyKey = `${user?.toLowerCase()}-tally`

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
                return new Response(`${user} has cleared their record and is now at 0. You can always join again.`)
            }
        }
    return new Response("All good I think", {status: 200})
}

export async function JoinPuddle (request: Request, env: Env): Promise<Response> {
    const [channel, user, count] = GetParameters(request)
    const [channelLowercase, userLowercase] = [channel?.toLowerCase(), user?.toLowerCase()]
    const PileKeyName = `${channelLowercase}-pile`
    const CurrentPile: string | null = await env.puddle.get(PileKeyName)
    const pile: string[] = [CurrentPile || ""]

    if (!userLowercase) {
        if (!CurrentPile) {
            return new Response("No one here I guess ¯\\_(ツ)_/¯")
        } else {
            const list = pile.filter(pile => pile !== '').join(', ')
            
            const pileSize = pile?.length - 1
            const message = `There's currently ${pileSize>1? `${pileSize} people` : `${pileSize} person`} in the puddle: ${list}.`
            
            return new Response(message, {status: 200})
        }
    } else {
            if (CurrentPile?.includes(userLowercase)) {
                const response = `${user} is already in the puddle, no double dipping`
    
                return new Response(response, {status: 200})
            } else if (channelLowercase) {
                const tally = await AddAttempt(env, userLowercase, channelLowercase, count)
                const newPuddle = pile.concat(userLowercase)
                await env.puddle.put(PileKeyName, JSON.stringify(newPuddle))
                const response = `${user} has jumped into the puddle, they've jumped in ${tally} times, spicy.`
                
                return new Response(response, {status: 200})
            }        
        }
        if (!channel) {
            return new Response("What are we doing, man?", {status: 400})
        }
        return new Response("All good? I think??", {status: 200})
    }

export async function LeavePuddle (request: Request, env: Env): Promise<Response> {
    const [channel, user] = GetParameters(request)
    const [channelLowercase, userLowercase] = [channel?.toLowerCase(), user?.toLowerCase()]
    const PileKeyName = `${channelLowercase}-pile`
    const currentPuddle: string | null = await env.puddle.get(PileKeyName)

    if (!userLowercase) {
        return new Response("Gotta tell me who first", {status: 400})
    } 
    if (currentPuddle === null){
        return new Response("Couldn't find puddle", {status: 404})
    } else {
        if (!currentPuddle.includes(userLowercase)) {
            const message = `You are not in the puddle, ${user}, don't be silly.`
            
            return new Response(message)
        } else {
            const puddleArray = currentPuddle.split(',')
            const filterPuddle = puddleArray.filter((quitter) => {quitter !== userLowercase})
            const filteredPuddle = filterPuddle?.toString() || ''
            const pileSize = filterPuddle?.length - 1

            await env.puddle.put(PileKeyName,filteredPuddle)
            const message = `${user} had enough and left the puddle. ${pileSize<=0? "The puddle is now empty" : `We are down to ${pileSize} ${pileSize>1? "people" : "person"}`}`
    
            return new Response(message)
        }   
    }
}