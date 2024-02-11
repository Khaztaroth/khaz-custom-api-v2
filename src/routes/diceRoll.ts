function randomNumber (max: number) {
    return Math.random() * (max - 1) + 1;
}

export function DiceRoll (request: Request) {
    const dice : string = new URL(request.url).searchParams.get("dice") || "d20"
    const diceSize = dice.slice(1)
    const roll = randomNumber(+diceSize).toFixed()

    const diceTypes = ["d2", "d4", "d6", "d8", "d10", "d12", "d20", "d100"]

    if (diceTypes.includes(dice)) {
        const response = `You rolled a ${roll}`
        return new Response(response, {status: 200})
    } else {
        const response = `That's no a real dice`
        return new Response(response, {status: 200})
    }
}