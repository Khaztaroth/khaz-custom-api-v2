import { Env } from "..";
import { DateTime, Zone } from "luxon";

interface Users {
	"Khaztaroth315": string,
	"LeprechaunKoala": string,
}
type Keys = Users

type QuoteObject = Record<number, string> | null

export async function GenerateKey(request: Request) {
        var result = ''
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        var charactersLength = characters.length
        for (var i = 0; i <= 16; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }

        return new Response(`Key: ${result}`, {status: 200})
}

export async function SaveQuote(request: Request, env: Env): Promise<Response> {
    const parameters = new URL(request.url).searchParams
    const Channel = parameters.get('channel')
    const QuoteParam = parameters.get('quote')
    const KeyParam = parameters.get('key')
    const CategoryParam = parameters.get('category')
    const TimezoneParam = parameters.get('timezone') || ''
    const DateFormatParam = parameters.get('format') || ''
    const FormattingParam = parameters.get('short') || ''
    const PersonName = parameters.get('name') || ''

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
    const formatting = () => {if(FormattingParam.toLowerCase() == 'false') {return false} else {return true}}
    const dateFormat = () => {if(DateFormatParam.toUpperCase() == 'EU') {return 'dd/MM/yy'}else{return 'MM/dd/yy'}}
    const CurrentDate = DateTime.now().setZone(zoneMatch(TimezoneParam)).toFormat(dateFormat())

    function writetoDB(quote: string, quoteDB?: Record<number, string>) {
        if (quoteDB){
                var quoteCount = Object.keys(quoteDB).length
                quoteDB[quoteCount+1] = quote
                env.quotes.put(ChannelDBName, JSON.stringify(quoteDB))
        } else {
            var placeHolder: Record<number, string> = {1: ''}
            placeHolder[1] = quote
            env.quotes.put(ChannelDBName, JSON.stringify(placeHolder))
        }
            }

    if(QuoteParam && Channel) {
        const channelQuoteDB: QuoteObject = await env.quotes.get(ChannelDBName, {type: "json"})
        var placeHolder: Record<number, string> = []
        if (formatting() == true) {
            const Quote = `${QuoteParam}, ${CategoryParam? `while ${PersonName? PersonName : Channel} streamed ${CategoryParam}, ${CurrentDate}`:  `${CurrentDate}`}`
            if (channelQuoteDB){
                writetoDB(Quote, channelQuoteDB)
                return new Response(`Successfully saved quote #${Object.keys(channelQuoteDB).length}`, {status: 200})
            }
            if (!channelQuoteDB) {
                writetoDB(Quote)
                return new Response(`Successfully saved quote #${Object.keys(placeHolder).length}`, {status: 200})
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
    } else {
    }   
    }
    return new Response("Something broke and I don't know what", {status: 200})
}

export async function DeleteQuote(request: Request, env: Env) {
    const parameters = new URL(request.url).searchParams
    const Channel = parameters.get('channel')
    const QueryParam = parameters.get('query')    
    const KeyParam = parameters.get('key')

    const UserKeys: Keys = env.QUOTE_KEYS as unknown as Keys
    if (!QueryParam) {
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

    if(QueryParam) {
        const QuoteList: Record<number, string> | null = await env.quotes.get(ChannelDBName, {type: "json"})
        const number = +QueryParam
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
                env.quotes.put(ChannelDBName, JSON.stringify(sorted))

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
    const Channel = parameters.get('channel')
    const QuoteParam = parameters.get('quote')
    const IndexParam = parameters.get('index') 
    const KeyParam = parameters.get('key')

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
        return new Response("Invalid key.", {status: 401})
    }

    const ChannelDBName = `${Channel}-quotes`

    if(IndexParam && QuoteParam) {
        const number = +IndexParam
        if (!Number.isNaN(number)) {
            const QuoteDB: Record<number, string> | null = await env.quotes.get(ChannelDBName)
            if (QuoteDB) {
                QuoteDB[number] = QuoteParam
            } else{
                return new Response("Couldn't find your quote list.", {status: 500})
            }
            env.quotes.put(ChannelDBName, JSON.stringify(QuoteDB))
            return new Response(`Succesfully changed the quote to: ${QuoteParam}`)
        }
    }
}

export async function InsertQuote(request: Request, env: Env) {
    const parameters = new URL(request.url).searchParams
    const Channel = parameters.get('channel')
    const QuoteParam = parameters.get('quote')
    const IndexParam = parameters.get('index') 
    const KeyParam = parameters.get('key')

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
                env.quotes.put(`${ChannelDBName}`, JSON.stringify(sorted))

                return new Response(`Succesfully inserted quote ${number}`, {status: 200})
            } else{
                return new Response("Couldn't find your quote list.", {status: 500})
            }
        }
    }
}

export async function FindQuote(request: Request, env: Env) {
    const parameters = new URL(request.url).searchParams
    const Channel = parameters.get('channel')
    const QuerryParam = parameters.get('query')    
    const KeyParam = parameters.get('key')

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
            var Quote: Object[] = []
            var QuoteNumbers: Object[] = []
            var randomNumber = 1
            for(var i=1; Object.keys(QuoteDB).length >= i; i++) {
                var found = QuoteDB[i].toLowerCase().includes(QuerryParam.toLocaleLowerCase().split('.', 1).join())
                if (found) {
                    QuoteNumbers = [...QuoteNumbers, i]
                    Quote[i] = QuoteDB[i]
                }
                randomNumber = Math.floor(Math.random() * QuoteNumbers.length)
            }
            var QuoteIndex: number = QuoteNumbers[randomNumber] as number
            if (!Quote[QuoteIndex]) {return new Response("No quotes with that phrase yet.", {status: 200})}

            return new Response(`#${QuoteIndex}. ${Quote[QuoteIndex]}`, {status: 200})
        }
    } else {
        if(QuoteDB) {
            var listLength = Object.keys(QuoteDB).length
            var randomNumber = Math.floor(Math.random() * listLength)

            return new Response(`#${randomNumber}. ${QuoteDB[randomNumber]}`)
        }
    }
}