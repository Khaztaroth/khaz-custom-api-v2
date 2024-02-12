function randomNumber (max: number) {
    return Math.random() * (max - 1) + 1;
}

export function DiceRoll (request: Request) {
    const dice : string | null = new URL(request.url).searchParams.get("dice")
    const diceSize = dice?.slice(1)
    const diceTypes = ["d2", "d4", "d6", "d8", "d10", "d12", "d20", "d100"]
    
    if (!dice || !diceSize) {
        const defaultDice = "20"
        const roll = randomNumber(+defaultDice).toFixed()

        const response = `You rolled a ${roll}`
        return new Response(response, {status: 200})
    } else {
        if (diceTypes.includes(dice)) {
            const roll = randomNumber(+diceSize).toFixed()
            const response = `You rolled a ${roll}`
            return new Response(response, {status: 200})
        } else {
            const response = `That's not a real dice`
            return new Response(response, {status: 200})
        }
    }
}