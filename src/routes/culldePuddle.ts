import { Env } from "..";

export async function PurgePuddle(request : Request, env : Env) {
    await env.puddle.delete("pile")
    
    return new Response("Puddle is now empty", {status: 200})
}

async function AddAttempt(user : string, env : Env, count? : string | null) {
    const tallyKey = `${user}-tally`
    const savedTally = await env.puddle.get(tallyKey)
        
        if (!savedTally) {
            if (!count) {
                const newTally = 1 
                await env.puddle.delete(tallyKey)
                await env.puddle.put(tallyKey, newTally.toString())

                return newTally
            } else {
                const newTally = +count + 1
                await env.puddle.delete(tallyKey)
                await env.puddle.put(tallyKey, newTally.toString())

                return newTally
            }
        } else {
            const newTally = +savedTally + 1
            await env.puddle.delete(tallyKey)
            await env.puddle.put(tallyKey, newTally.toString())

            return newTally
        }
}

async function SubstractAttempt(user : string, env : Env, count? : string | null) {
    const tallyKey = `${user}-tally`
    const savedTally = await env.puddle.get(tallyKey)
        
        if (!savedTally) {
            if (!count) {
                const newTally = 0
                await env.puddle.delete(tallyKey)
                await env.puddle.put(tallyKey, newTally.toString())

                return newTally
            } else {
                const newTally = +count - 1
                await env.puddle.delete(tallyKey)
                await env.puddle.put(tallyKey, newTally.toString())

                return newTally
            }
        } else {
            const newTally = +savedTally - 1
            await env.puddle.delete(tallyKey)
            await env.puddle.put(tallyKey, newTally.toString())

            return newTally
        }
}

export async function ClearAttempts(request : Request, env : Env) {
    const user = new URL(request.url).searchParams.get("user")
    const tallyKey = `${user}-tally`

    await env.puddle.delete(tallyKey)
    const savedTally = await env.puddle.get(tallyKey) || "0"

    return new Response(`${user} has cleared their record and is now at ${savedTally} joins.`)
}

export async function JoinPuddle (request: Request, env: Env) {
    const person = new URL(request.url).searchParams.get("user")
    const count = new URL(request.url).searchParams.get("count")

    const currentPuddle = await env.puddle.get("pile")
    const puddle: string[] = [currentPuddle || ""]
    
    if (!person) {
        if (!currentPuddle) {
            return new Response("No one here I guess ¯\\_(ツ)_/¯")
         } else {
            const puddleArray = currentPuddle?.split(",")
            const list = puddleArray.filter(pile => pile !== '').join(', ')

            const pileSize = puddleArray?.length - 1
            const message = `There's currently ${pileSize>1? `${pileSize} people` : `${pileSize} person`} in the puddle: ${list}.`

            return new Response(message, {status: 200})
         }
    } else {
        if (currentPuddle?.includes(person)) {
            const response = `${person} is already in the puddle, no double dipping`

            return new Response(response, {status: 200})
        } else {
            const tally = await AddAttempt(person, env, count)
            const newPuddle = puddle.concat(person)
            await env.puddle.put("pile", newPuddle.toString())
            const response = `${person} has jumped into the puddle, they've jumped in ${tally} times, spicy.`
            
            return new Response(response, {status: 200})
        }
                
    }
}

export async function LeavePuddle (request: Request, env: Env) {
    const user = new URL(request.url).searchParams.get("user")
    const currentPuddle = await env.puddle.get("pile")
    
    if (!user) {
        const message = "User not provided"
        
        return new Response(message)
    } else {
        if (!currentPuddle?.includes(user)) {
            const message = `You are not in the puddle ${user}, don't be silly.`
            
            return new Response(message)
        } else {
            const puddleArray = currentPuddle?.split(",")
            const filterPuddle = puddleArray?.filter(quitter => quitter !== user)
            const filteredPuddle = filterPuddle?.toString() || ''
            const pileSize = filterPuddle?.length - 1

            await env.puddle.delete("pile")
            await env.puddle.put("pile",filteredPuddle)
            const message = `${user} had enough and left the puddle. ${pileSize==0? "The puddle is now empty" : `We are down to ${pileSize} ${pileSize>1? "people" : "person"}`}`
    
            return new Response(message)
        }   
    }
}