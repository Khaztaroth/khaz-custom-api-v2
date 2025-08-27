import { Env } from "..";
import { DateTime } from "luxon";

interface Users {
	"Khaztaroth315": string,
	"LeprechaunKoala": string,
}
type Keys = Users

type QuoteObject = Record<number, string> | null

export async function GenerateKey(request: Request) {
        var result = ''
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
        var scrambled = characters.split('').sort(() => 0.5 - Math.random()).join('')
        var charactersLength = characters.length
        for (var i = 0; i <= 16; i++) {
            result += scrambled.charAt(Math.random() * charactersLength);
        }
        return new Response(`Key: ${result}`, {status: 200})
}

export async function SaveQuote(request: Request, env: Env): Promise<Response> {
    const parameters = new URL(request.url).searchParams
    const Channel = parameters.get('channel') // Required, channel name
    const KeyParam = parameters.get('key') // Required, a key provided by the admin that will allow the data to be passed through
    const QuoteParam = parameters.get('quote') // Required, can't store a quote if you don't have any quotes
    const CategoryParam = parameters.get('category') // Optional, save which category the user was streaming in when the quote was saved
    const TimezoneParam = parameters.get('timezone') // Optional, change the timezone the quote is being saved in, useful when days roll over
    const DateFormatParam = parameters.get('format') // Optional, set what format the date is being written with, day-month-year or month-day-year
    const FormattingParam = parameters.get('formatted') // Optional, set whether or not the quote will be automatically formatted, if not, it will be passed directly
    const PersonName = parameters.get('name') // Optional, set a name to use for the "while PERSON streamed...", in case a short name is prefered over the channel name

    const UserKeys: Keys = env.QUOTE_KEYS as unknown as Keys
    if (!QuoteParam) {
        return new Response("I need to know what you're gonna quote, buster.", {status: 400})
    }
    if (!Channel) {
        return new Response("Whose channel is it tho?", {status: 400})
    }
    if(!KeyParam){
        return new Response('Key not found', {status: 401})
    }
    if (+KeyParam && UserKeys[Channel as keyof Keys] !== KeyParam) {
        console.error(KeyParam, UserKeys.Khaztaroth315)
        return new Response("Invalid key.", {status: 401})
    }

    function zoneMatch (timezone: string){
        switch(timezone) {
            case 'EST': case 'ET': case 'EDT':
                return "America/New_York"
            case 'PST': case 'PT': case 'PDT':
                return "America/Los_Angeles"
            case 'MDT': case 'MST':
                return "America/Edmonton"
            case 'CST': case 'CT': case 'CDT':
                return "America/Chicago"
            default: 'America/New_York'
        }
    }

    const ChannelDBName = `${Channel}-quotes`
    const formatting = () => {if(FormattingParam && FormattingParam.toLowerCase() == 'false') {return false} else {return true}}
    const dateFormat = () => {if(DateFormatParam && DateFormatParam.toUpperCase() == 'EU') {return 'dd/MM/yy'}else{return 'MM/dd/yy'}}
    const CurrentDate = DateTime.now().setZone(zoneMatch(TimezoneParam || '')).toFormat(dateFormat())

    async function writetoDB(quote: string, quoteDB?: Record<number, string>) {
        if (quoteDB){
                var quoteCount = Object.keys(quoteDB).length
                quoteDB[quoteCount+1] = quote
                await env.quotes.put(ChannelDBName, JSON.stringify(quoteDB))
                
        } else {
            var placeHolder: Record<number, string> = {1: ''}
            placeHolder[1] = quote
            await env.quotes.put(ChannelDBName, JSON.stringify(placeHolder))
        }
            }

    if(QuoteParam && Channel) {
        const channelQuoteDB: QuoteObject = await env.quotes.get(ChannelDBName, {type: "json"})
        var placeHolder: Record<number, string> = []
        if (formatting() == true) {
            const Quote = `${QuoteParam}, ${CategoryParam? `while ${PersonName? PersonName : Channel} streamed ${CategoryParam}, ${CurrentDate}`:  `${CurrentDate}`}`
            if (channelQuoteDB){
                await writetoDB(Quote, channelQuoteDB)
                return new Response(`Successfully saved quote #${Object.keys(channelQuoteDB).length}`, {status: 200})
            }
            if (!channelQuoteDB) {
                await writetoDB(Quote)
                return new Response(`Successfully saved quote #${Object.keys(placeHolder).length}`, {status: 200})
            }
        }
        if (formatting() == false) {
            if(channelQuoteDB) {
                writetoDB(QuoteParam, channelQuoteDB)
                return new Response(`Successfully saved quote #${Object.keys(channelQuoteDB).length}`, {status: 200})
            }
            if (!channelQuoteDB) {
                writetoDB(QuoteParam)
                return new Response(`Successfully saved quote #${Object.keys(placeHolder).length}`, {status: 200})
            }
        } 
    }
    return new Response("Something broke and I don't know what", {status: 200})
}

export async function DeleteQuote(request: Request, env: Env) {
    const parameters = new URL(request.url).searchParams
    const Channel = parameters.get('channel') // Required, channel name
    const KeyParam = parameters.get('key') // Required, a key provided by the admin that will allow the data to be passed through
    const IndexParam = parameters.get('query') // Required, need to provide index of the quote being deleted

    const UserKeys: Keys = env.QUOTE_KEYS as unknown as Keys
    if (!IndexParam) {
        return new Response("I need to know what you're looking for, buster.", {status: 400})
    }
    if (!Channel) {
        return new Response("Whose channel is it tho?", {status: 400})
    }
    if(!KeyParam){
        return new Response('Key not found', {status: 401})
    }
    if (+KeyParam && UserKeys[Channel as keyof Keys] !== KeyParam) {
        console.error(KeyParam, UserKeys.Khaztaroth315)
        return new Response("Invalid key.", {status: 401})
    }

    const ChannelDBName = `${Channel}-quotes`

    if(IndexParam) {
        const QuoteList: Record<number, string> | null = await env.quotes.get(ChannelDBName, {type: "json"})
        const number = +IndexParam
        if (QuoteList && !Number.isNaN(number)) {
            if (QuoteList[number]){
                delete QuoteList[number]
                var sorted = Object.keys(QuoteList).reduce((ob: Record<number, string>, key) => {
                    if(+key < number) {
                        ob[+key] = QuoteList[+key];
                    } else {
                        ob[+key-1] = QuoteList[+key]
                    }
                    return ob;
                }, {})
                await env.quotes.put(ChannelDBName, JSON.stringify(sorted))

                return new Response(`Succesfully removed quote ${number}`, {status: 200})
            } else {
                return new Response("No quote with that number.", {status: 400})
            }
    } else {
        return new Response("I need to know what I'm deleting.", {status: 400})
    }
    }
}

export async function ModifyQuote(request: Request, env: Env) {
    const parameters = new URL(request.url).searchParams
    const ChannelParam = parameters.get('channel') // Required, channel name
    const KeyParam = parameters.get('key') // Required, a key provided by the admin that will allow the data to be passed through
    const QuoteParam = parameters.get('quote') // Required, need to have a quote to replace the old one
    const IndexParam = parameters.get('index') // Required, have to know which quote index is being replaced, useful when replacing quotes much after

    const UserKeys: Keys = env.QUOTE_KEYS as unknown as Keys
    if (!QuoteParam) {
        return new Response("I need to know what you're looking for, buster.", {status: 400})
    }
    if (!ChannelParam) {
        return new Response("Whose channel is it tho?", {status: 400})
    }
    if(!IndexParam) {
        return new Response("No quote number.", {status: 400})
    }
    if(!KeyParam){
        return new Response('Key not found', {status: 401})
    }
    if (+KeyParam && UserKeys[ChannelParam as keyof Keys] !== KeyParam) {
        console.error(KeyParam, UserKeys.Khaztaroth315)
        return new Response("Invalid key.", {status: 401})
    }

    const ChannelDBName = `${ChannelParam}-quotes`

    if(IndexParam && QuoteParam) {
        const number = +IndexParam
        if (!Number.isNaN(number)) {
            const QuoteDB: Record<number, string> | null = await env.quotes.get(ChannelDBName, {type: "json"})
            if (QuoteDB) {
                var NewDB: Record<number,string> = QuoteDB
                NewDB[number] = QuoteParam
            } else{
                return new Response("Couldn't find your quote list.", {status: 500})
            }
            await env.quotes.put(ChannelDBName, JSON.stringify(NewDB))
            return new Response(`Succesfully changed the quote to: ${QuoteParam}`)
        }
    }
}

export async function InsertQuote(request: Request, env: Env) {
    const parameters = new URL(request.url).searchParams
    const Channel = parameters.get('channel') // Required, channel name
    const KeyParam = parameters.get('key') // Required, a key provided by the admin that will allow the data to be passed through
    const QuoteParam = parameters.get('quote') // Required, need to provide the text for the new quote
    const IndexParam = parameters.get('index') // Required, have to have an index to insert the quote in, so all the rest can be moved accordingly

    const UserKeys: Keys = env.QUOTE_KEYS as unknown as Keys
    if (!QuoteParam) {
        return new Response("I need to know what you're looking for, buster.", {status: 400})
    }
    if (!Channel) {
        return new Response("Whose channel is it tho?", {status: 400})
    }
    if(!IndexParam) {
        return new Response("No quote number.", {status: 400})
    }
    if(!KeyParam){
        return new Response('Key not found', {status: 401})
    }
    if (+KeyParam && UserKeys[Channel as keyof Keys] !== KeyParam) {
        console.error(KeyParam, UserKeys.Khaztaroth315)
        return new Response("Couldn't find that user", {status: 401})
    }

    const ChannelDBName = `${Channel}-quotes`

    if(IndexParam && QuoteParam) {
        const number = +IndexParam
        if (!Number.isNaN(number)) {
            const QuoteDB: Record<number, string> | null = await env.quotes.get(ChannelDBName, {type: "json"})
            if (QuoteDB) {
                var sorted = Object.keys(QuoteDB).reduce((ob: Record<number, string>, key) => {
                    if(+key < number) {
                        ob[+key] = QuoteDB[+key];
                    } else if (+key === number) {
                        ob[+key] = QuoteParam
                    }else {
                        ob[+key] = QuoteDB[+key-1];
                    }
                    return ob;
                }, {})
                await env.quotes.put(`${ChannelDBName}`, JSON.stringify(sorted))

                return new Response(`Succesfully inserted quote ${number}`, {status: 200})
            } else{
                return new Response("Couldn't find your quote list.", {status: 500})
            }
        }
    }
}

export async function FindQuote(request: Request, env: Env) {
    const parameters = new URL(request.url).searchParams
    const Channel = parameters.get('channel') // Required, channel name
    const KeyParam = parameters.get('key') // Required, a key provided by the admin that will allow the data to be passed through
    const QuerryParam = parameters.get('query') // Optional, if present it will check for either a number or a string and find the corresponding quote, if empty it will give a random quote

    const UserKeys: Keys = env.QUOTE_KEYS as unknown as Keys
    if (!Channel) {
        return new Response("Whose channel is it tho?", {status: 400})
    }
    if(!KeyParam){
        return new Response('Key not found', {status: 401})
    }
    if (+KeyParam && UserKeys[Channel as keyof Keys] !== KeyParam) {
        console.error(KeyParam, UserKeys.Khaztaroth315)
        return new Response("Invalid key.", {status: 401})
    }

    const ChannelDBName = `${Channel}-quotes`
    const QuoteDB: Record<number, string> | null = await env.quotes.get(ChannelDBName, {type: "json"})
    
    if(QuerryParam){
        const number = +QuerryParam
        if(QuoteDB && !Number.isNaN(number)){
            const found = QuoteDB[number]
            if (found) {
                return new Response(`#${number}. ${found}`)
            } else {
                return new Response(`No quote with that number.`, {status: 400})
            }
        } else if (QuoteDB) {
            var FoundQuotes: Object[] = []
            var randomNumber = 1
            var trailingPunctuation = new RegExp('[.,?!)_]')
            for(var i=1; Object.keys(QuoteDB).length >= i; i++) {
                var found = QuoteDB[i].toLowerCase().includes(QuerryParam.toLocaleLowerCase().split(trailingPunctuation).join())
                if (found) {
                    FoundQuotes[i] = QuoteDB[i]
                }
            }
            var MatchingList = Object.keys(FoundQuotes).filter((lines) => lines !== undefined)
            randomNumber = Math.floor(Math.random() * MatchingList.length)
            var QuoteIndex: number = +MatchingList[randomNumber]
            if (!QuoteDB[QuoteIndex]) {return new Response("No quotes with that phrase yet.", {status: 200})}

            return new Response(`#${QuoteIndex}. ${FoundQuotes[QuoteIndex]}`, {status: 200})
        }
    } else {
        if(QuoteDB) {
            var listLength = Object.keys(QuoteDB).length
            var randomNumber = Math.floor(Math.random() * listLength)

            return new Response(`#${randomNumber}. ${QuoteDB[randomNumber]}`)
        }
    }
}