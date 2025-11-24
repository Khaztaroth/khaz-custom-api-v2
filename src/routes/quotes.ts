import { Env } from '..';
import { DateTime } from 'luxon';

interface Users {
	khaztaroth315: string;
	leprechaunkoala: string;
}
type Keys = Users;

type QuoteObject = { quote: string; author: string | null; category: string | null; date: string } | null;
type QuoteDatabase = Record<number, QuoteObject>;

function formatDate(format: string): string {
	if (format === 'EU') {
		return 'MM-dd-yy';
	} else {
		return 'dd-MM-yy';
	}
}

export async function GenerateKey(request: Request) {
	var result = '';
	var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
	var scrambled = characters
		.split('')
		.sort(() => 0.5 - Math.random())
		.join('');
	var charactersLength = characters.length;
	for (var i = 0; i <= 16; i++) {
		result += scrambled.charAt(Math.random() * charactersLength);
	}
	return new Response(`Key: ${result}`, { status: 200 });
}

export async function SaveQuote(request: Request, env: Env): Promise<Response> {
	const parameters = new URL(request.url).searchParams;
	const Channel = parameters.get('channel'); // Required, channel name
	const KeyParam = parameters.get('key'); // Required, a key provided by the admin that will allow the data to be passed through
	const QuoteParam = parameters.get('quote'); // Required, can't store a quote if you don't have any quotes
	const CategoryParam = parameters.get('category'); // Optional, save which category the user was streaming in when the quote was saved
	const FormattingParam = parameters.get('formatted'); // Optional, set whether or not the quote will be automatically formatted, if not, it will be passed directly

	async function writetoDB(quote: QuoteObject, formmated: Boolean = true, quoteDB?: QuoteDatabase) {
		if (quoteDB) {
			var quoteCount = Object.keys(quoteDB).length;
			quoteDB[quoteCount + 1] = quote;
			await env.quotes.put(ChannelDBName, JSON.stringify(quoteDB));
		} else {
			var placeHolder: QuoteDatabase = { 1: quote };
			await env.quotes.put(ChannelDBName, JSON.stringify(placeHolder));
		}
	}

	const UserKeys: Keys = env.QUOTE_KEYS as unknown as Keys;
	if (!QuoteParam) {
		return new Response("I need to know what you're gonna quote, buster.", { status: 400 });
	}
	if (!Channel) {
		return new Response('Whose channel is it tho?', { status: 400 });
	}
	if (!KeyParam) {
		return new Response('Key not found', { status: 401 });
	}
	if (+KeyParam && UserKeys[Channel as keyof Keys] !== KeyParam) {
		console.error(KeyParam, UserKeys[Channel as keyof Users]);
		return new Response('Invalid key.', { status: 401 });
	}

	const ChannelDBName = `${Channel}-quotes`;
	const formatting = () => {
		if (FormattingParam && FormattingParam.toLowerCase() == 'false') {
			return false;
		} else {
			return true;
		}
	};

	if (QuoteParam && Channel) {
		const channelQuoteDB: QuoteDatabase | null = await env.quotes.get(ChannelDBName, { type: 'json' });
		const quoteSegments = QuoteParam.split('-');
		const quoteText = quoteSegments[0].replace(/(^")/g, '').replace(/(" $)/g, '');
		const quoteAuthor = quoteSegments[1];
		const CurrentDate = DateTime.now().toISO();
		await env.quotes.put(`${ChannelDBName}-backup`, JSON.stringify(channelQuoteDB));
		const Quote = {
			quote: quoteText,
			author: quoteAuthor,
			category: CategoryParam,
			date: CurrentDate,
		};

		if (channelQuoteDB) {
			if (formatting() == true) {
				await writetoDB(Quote, true, channelQuoteDB);
				return new Response(`Quote ${Object.keys(channelQuoteDB).length} added successfully`, { status: 200 });
			} else {
				await writetoDB(Quote, false, channelQuoteDB);
				return new Response(`Quote ${Object.keys(channelQuoteDB).length} added successfully`, { status: 200 });
			}
		} else {
			await writetoDB(Quote, false);
			return new Response(`Quote 1 added successfully`, { status: 200 });
		}
	}
	return new Response("Something broke and I don't know what: ", { status: 500 });
}

export async function DeleteQuote(request: Request, env: Env) {
	const parameters = new URL(request.url).searchParams;
	const Channel = parameters.get('channel'); // Required, channel name
	const KeyParam = parameters.get('key'); // Required, a key provided by the admin that will allow the data to be passed through
	const IndexParam = parameters.get('query'); // Required, need to provide index of the quote being deleted

	const UserKeys: Keys = env.QUOTE_KEYS as unknown as Keys;
	if (!IndexParam) {
		return new Response("I need to know what you're looking for, buster.", { status: 400 });
	}
	if (!Channel) {
		return new Response('Whose channel is it tho?', { status: 400 });
	}
	if (!KeyParam) {
		return new Response('Key not found', { status: 401 });
	}
	if (+KeyParam && UserKeys[Channel as keyof Keys] !== KeyParam) {
		console.error(KeyParam, UserKeys[Channel as keyof Users]);
		return new Response('Invalid key.', { status: 401 });
	}

	const ChannelDBName = `${Channel}-quotes`;
	const QuoteList: QuoteDatabase | null = await env.quotes.get(ChannelDBName, { type: 'json' });
	await env.quotes.put(`${ChannelDBName}-backup`, JSON.stringify(QuoteList));

	if (IndexParam) {
		const number = +IndexParam;
		if (QuoteList && !Number.isNaN(number)) {
			if (QuoteList[number]) {
				delete QuoteList[number];
				var sorted = Object.keys(QuoteList).reduce((ob: Record<number, QuoteObject>, key) => {
					if (+key < number) {
						ob[+key] = QuoteList[+key];
					} else {
						ob[+key - 1] = QuoteList[+key];
					}
					return ob;
				}, {});
				await env.quotes.put(ChannelDBName, JSON.stringify(sorted));

				return new Response(`Succesfully removed quote ${number}`, { status: 200 });
			} else {
				return new Response('No quote with that number.', { status: 400 });
			}
		} else {
			return new Response("I need to know what I'm deleting.", { status: 400 });
		}
	}
}

export async function ModifyQuote(request: Request, env: Env) {
	const parameters = new URL(request.url).searchParams;
	const ChannelParam = parameters.get('channel'); // Required, channel name
	const KeyParam = parameters.get('key'); // Required, a key provided by the admin that will allow the data to be passed through
	const QuoteParam = parameters.get('quote'); // Required, need to have a quote to replace the old one
	const IndexParam = parameters.get('index'); // Required, have to know which quote index is being replaced, useful when replacing quotes much after

	const UserKeys: Keys = env.QUOTE_KEYS as unknown as Keys;
	if (!QuoteParam) {
		return new Response("I need to know what you're looking for, buster.", { status: 400 });
	}
	if (!ChannelParam) {
		return new Response('Whose channel is it tho?', { status: 400 });
	}
	if (!IndexParam) {
		return new Response('No quote number.', { status: 400 });
	}
	if (!KeyParam) {
		return new Response('Key not found', { status: 401 });
	}
	if (+KeyParam && UserKeys[ChannelParam as keyof Keys] !== KeyParam) {
		console.error(KeyParam, UserKeys[ChannelParam as keyof Users]);
		return new Response('Invalid key.', { status: 401 });
	}

	const ChannelDBName = `${ChannelParam}-quotes`;

	if (IndexParam && QuoteParam) {
		const number = +IndexParam;
		if (!Number.isNaN(number)) {
			const QuoteDB: Record<number, QuoteObject> | null = await env.quotes.get(ChannelDBName, { type: 'json' });
			if (QuoteDB) {
				var NewDB: Record<number, QuoteObject> = QuoteDB;
				if (NewDB[number]) {
					NewDB[number].quote = QuoteParam;
				}
			} else {
				return new Response("Couldn't find your quote list.", { status: 500 });
			}
			await env.quotes.put(ChannelDBName, JSON.stringify(NewDB));
			return new Response(`Succesfully changed the quote to: ${QuoteParam}`);
		}
	}
}

// Gotta find a way to make this not explode
// export async function InsertQuote(request: Request, env: Env) {
// 	const parameters = new URL(request.url).searchParams;
// 	const Channel = parameters.get('channel'); // Required, channel name
// 	const KeyParam = parameters.get('key'); // Required, a key provided by the admin that will allow the data to be passed through
// 	const QuoteParam = parameters.get('quote'); // Required, need to provide the text for the new quote
// 	const IndexParam = parameters.get('index'); // Required, have to have an index to insert the quote in, so all the rest can be moved accordingly

// 	const UserKeys: Keys = env.QUOTE_KEYS as unknown as Keys;
// 	if (!QuoteParam) {
// 		return new Response("I need to know what you're looking for, buster.", { status: 400 });
// 	}
// 	if (!Channel) {
// 		return new Response('Whose channel is it tho?', { status: 400 });
// 	}
// 	if (!IndexParam) {
// 		return new Response('No quote number.', { status: 400 });
// 	}
// 	if (!KeyParam) {
// 		return new Response('Key not found', { status: 401 });
// 	}
// 	if (+KeyParam && UserKeys[Channel as keyof Keys] !== KeyParam) {
// 		console.error(KeyParam, UserKeys[Channel as keyof Users]);
// 		return new Response("Couldn't find that user", { status: 401 });
// 	}

// 	const ChannelDBName = `${Channel}-quotes`;

// 	if (IndexParam && QuoteParam) {
// 		const number = +IndexParam;
// 		if (!Number.isNaN(number)) {
// 			const QuoteDB: QuoteDatabase | null = await env.quotes.get(ChannelDBName, { type: 'json' });
// 			if (QuoteDB) {
// 				var sorted = Object.keys(QuoteDB).reduce((ob: Record<number, QuoteObject>, key: string) => {
// 					var keyNumb = +key;
// 					if (ob)
// 						if (keyNumb < number) {
// 							ob[keyNumb] = QuoteDB[keyNumb];
// 						} else if (keyNumb === number) {
// 							ob[keyNumb] = {...QuoteDB[keyNumb], quote: QuoteParam}; \\ ob[keyNumb] is marked as potentially null and I don't know how to make it so it knows it won't be.
// 						} else {
// 							ob[keyNumb] = QuoteDB[keyNumb - 1];
// 						}
// 					return ob;
// 				}, {});
// 				await env.quotes.put(`${ChannelDBName}`, JSON.stringify(sorted));

// 				return new Response(`Succesfully inserted quote ${number}`, { status: 200 });
// 			} else {
// 				return new Response("Couldn't find your quote list.", { status: 500 });
// 			}
// 		}
// 	}
// }

export async function FindQuote(request: Request, env: Env) {
	const parameters = new URL(request.url).searchParams;
	const Channel = parameters.get('channel'); // Required, channel name
	const KeyParam = parameters.get('key'); // Required, a key provided by the admin that will allow the data to be passed through
	const LocaleParam = parameters.get('locale'); // Optional, set the quote to be displayed in MM/DD/YY or DD/MM/YY
	const QuerryParam = parameters.get('query'); // Optional, if present it will check for either a number or a string and find the corresponding quote, if empty it will give a random quote
	const ChannelShortName = parameters.get('name'); // Optional, set a name to use for the "while PERSON streamed...", in case a short name is prefered over the channel name

	const UserKeys: Keys = env.QUOTE_KEYS as unknown as Keys;
	if (!Channel) {
		return new Response('Whose channel is it tho?', { status: 400 });
	}
	if (!KeyParam) {
		return new Response('Key not found', { status: 401 });
	}
	if (+KeyParam && UserKeys[Channel as keyof Keys] !== KeyParam) {
		console.error(KeyParam, UserKeys[Channel as keyof Users]);
		return new Response('Invalid key.', { status: 401 });
	}

	const setLocale = () => {
		if (!LocaleParam) {
			return 'en-US';
		}
		if (LocaleParam === 'US') {
			return 'en-US';
		}
		if (LocaleParam === 'GB') {
			return 'en-GB';
		}
		return 'en-US';
	};

	const ChannelDBName = `${Channel}-quotes`;
	const QuoteDB: QuoteDatabase | null = await env.quotes.get(ChannelDBName, { type: 'json' });
	const formatDate = (quoteDate: string | undefined): string => {
		if (quoteDate) {
			var DatedateRegex = new RegExp('^[0-9]{1,2}/[0-9]{1,2}/[0-9]{2}$');
			var YearRegex = new RegExp('^[0-9]{4}$');
			if (quoteDate.length > 10) {
				return DateTime.fromISO(quoteDate).setLocale(setLocale()).toLocaleString();
			}
			if (DatedateRegex.test(quoteDate)) {
				var dateSegments = quoteDate.split('/');
				var formatting = { month: 'MM', day: 'dd', year: 'y' };
				if (dateSegments[0].length === 1) {
					formatting.month = 'M';
				}
				if (dateSegments[1].length === 1) {
					formatting.day = 'd';
				}
				var format = `${formatting.month}/${formatting.day}/${formatting.year}`;
				return DateTime.fromFormat(quoteDate, format).setLocale(setLocale()).toLocaleString();
			}
			if (YearRegex.test(quoteDate)) {
				return quoteDate;
			} else {
				return 'Unknown';
			}
		}
		return 'Unknown';
	};

	if (QuerryParam) {
		const number = +QuerryParam;
		if (QuoteDB && !Number.isNaN(number)) {
			const found = QuoteDB[number];
			const streamer = ChannelShortName || Channel;
			const quote = found?.quote;
			const author = found?.author;
			const game = found?.category;
			const date = formatDate(found?.date);

			console.log(quote);
			if (found) {
				return new Response(`#${number}. "${quote}" -${author} while ${streamer}, streamed ${game}, ${date}`);
			} else {
				return new Response(`No quote with that number.`, { status: 400 });
			}
		} else if (QuoteDB) {
			var FoundQuotes: QuoteDatabase = [];
			var randomNumber = 1;
			var trailingPunctuation = new RegExp('[.,?!)_]');
			for (var i = 1; Object.keys(QuoteDB).length >= i; i++) {
				var found = QuoteDB[i]?.quote.toLowerCase().includes(QuerryParam.toLocaleLowerCase().split(trailingPunctuation).join());
				if (found && QuoteDB[i] !== null) {
					FoundQuotes[i] = QuoteDB[i];
				}
			}
			var MatchingList = Object.keys(FoundQuotes).filter((lines) => lines !== undefined);
			randomNumber = Math.floor(Math.random() * MatchingList.length);
			var QuoteIndex: number = +MatchingList[randomNumber];
			if (!QuoteDB[QuoteIndex]) {
				return new Response('No quotes with that phrase yet.', { status: 200 });
			}
			const streamer = ChannelShortName || Channel;
			const quote = FoundQuotes[QuoteIndex]?.quote;
			const author = FoundQuotes[QuoteIndex]?.author;
			const game = FoundQuotes[QuoteIndex]?.category;
			const date = formatDate(FoundQuotes[QuoteIndex]?.date);

			return new Response(`#${QuoteIndex}. "${quote}" -${author} while ${streamer}, streamed ${game}, ${date}`, { status: 200 });
		}
	} else {
		if (QuoteDB) {
			var listLength = Object.keys(QuoteDB).length;
			var randomNumber = Math.floor(Math.random() * listLength);
			if (randomNumber === 0) {
				randomNumber = 1;
			}
			const quotetoshow = QuoteDB[randomNumber];
			const streamer = ChannelShortName || Channel;
			const date = formatDate(quotetoshow?.date);

			return new Response(
				`#${randomNumber}. "${quotetoshow?.quote}" -${quotetoshow?.author} while ${streamer}, streamed ${quotetoshow?.category || 'Unknown'}, ${date}`,
				{ status: 200 },
			);
		}
		return new Response('No quotes found.', { status: 404 });
	}
}

export async function ListQuotes(request: Request, env: Env) {
	const parameters = new URL(request.url).searchParams;
	const Channel = parameters.get('channel');
	const ChannelDBName = `${Channel}-quotes`;

	const quoteObject: unknown = await env.quotes.get(ChannelDBName, { type: 'json' });

	let response = new Response(JSON.stringify(quoteObject), { status: 200 });
	response.headers.set('Access-Control-Allow-Origin', '*');
	response.headers.append('Vary', 'Origin');

	if (quoteObject) {
		return response;
	}

	return new Response("Couldn't find a list from that channel", { status: 500 });
}
