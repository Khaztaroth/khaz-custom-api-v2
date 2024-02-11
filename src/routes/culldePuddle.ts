import { Env } from "..";

export async function PurgePuddle(request:Request, env: Env) {
    await env.puddle.delete("pile")
    
    return new Response("Puddle is now empty", {status: 200})
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
            const newPuddle = puddle.concat(person)
            await env.puddle.put("pile", newPuddle.toString())
            const response = `${person} has jumped into the puddle, they've jumped in ${count} times, spicy.`
            
            return new Response(response, {status: 200})
        }
                
    }
}

export async function LeavePuddle (request: Request, env: Env) {
    const user = new URL(request.url).searchParams.get("user")

    const currentPuddle = await env.puddle.get("pile")
    const puddleArray = currentPuddle?.split(",")

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
            const pileSize = filterPuddle?.length -1

            await env.puddle.delete("pile")
            await env.puddle.put("pile",filteredPuddle)
            const message = `${user} had enough and left the puddle. ${pileSize==0? "The puddle is now empty" : `We are down to ${pileSize} ${pileSize>1? "people" : "person"}`}`
    
            return new Response(message)
        }   
    }
}