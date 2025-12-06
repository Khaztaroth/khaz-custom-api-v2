import { Env } from '..';
import { DateTime } from 'luxon';

interface Users {
	khaztaroth315: string;
	leprechaunkoala: string;
}
type Keys = Users;

type QuoteObject = { quote: string; author: string | null; extra_data: string | null; category: string | null; date: string } | null;
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
		const segmentationIndex = QuoteParam.lastIndexOf('-');
		const quoteText = QuoteParam.slice(0, segmentationIndex).replace(/(^")/g, '').replace(/(" $)/g, '');
		const quoteAtributionWhole = QuoteParam.slice(segmentationIndex + 1);
		const quoteAtributionSegments = quoteAtributionWhole.split(' ');
		const quoteAuthor = quoteAtributionSegments[0].replace(/,\s*$/, '');
		const extraData = () => {
			var i = 0;
			var extraBits = [];
			while (i < quoteAtributionSegments.length) {
				extraBits.push(quoteAtributionSegments[i + 1]);
				i++;
			}
			return extraBits.join(' ');
		};

		const CurrentDate = DateTime.now().setZone('America/New_York').toFormat('MM/dd/yy');
		await env.quotes.put(`${ChannelDBName}-backup`, JSON.stringify(channelQuoteDB));
		const Quote = {
			quote: quoteText,
			author: quoteAuthor,
			extra_data: extraData(),
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
				var sorted = Object.keys(QuoteList).reduce((ob: QuoteDatabase, key) => {
					// Reconstructing the list by shifting indices to avoid ghost quotes.
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
			const QuoteDB: QuoteDatabase | null = await env.quotes.get(ChannelDBName, { type: 'json' });
			if (QuoteDB) {
				var NewDB: QuoteDatabase = QuoteDB;
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
	return new Response('Invalid request.', { status: 400 });
}

export async function InsertQuote(request: Request, env: Env) {
	const parameters = new URL(request.url).searchParams;
	const Channel = parameters.get('channel'); // Required, channel name
	const KeyParam = parameters.get('key'); // Required, a key provided by the admin that will allow the data to be passed through
	const QuoteParam = parameters.get('quote'); // Required, need to provide the text for the new quote
	const IndexParam = parameters.get('index'); // Required, have to have an index to insert the quote in, so all the rest can be moved accordingly

	const UserKeys: Keys = env.QUOTE_KEYS as unknown as Keys;
	if (!QuoteParam) {
		return new Response("I need to know what you're looking for, buster.", { status: 400 });
	}
	if (!Channel) {
		return new Response('Whose channel is it tho?', { status: 400 });
	}
	if (!IndexParam) {
		return new Response('No quote number.', { status: 400 });
	}
	if (!KeyParam) {
		return new Response('Key not found', { status: 401 });
	}
	if (+KeyParam && UserKeys[Channel as keyof Keys] !== KeyParam) {
		console.error(KeyParam, UserKeys[Channel as keyof Users]);
		return new Response("Couldn't find that user", { status: 401 });
	}

	const ChannelDBName = `${Channel}-quotes`;

	if (IndexParam && QuoteParam) {
		const number = +IndexParam;
		if (!Number.isNaN(number)) {
			const QuoteDB: QuoteDatabase | null = await env.quotes.get(ChannelDBName, { type: 'json' });
			if (QuoteDB) {
				var sorted = Object.keys(QuoteDB).reduce((ob: QuoteDatabase, key: string) => {
					var keyNumb = +key;
					if (ob)
						if (keyNumb < number) {
							ob[keyNumb] = QuoteDB[keyNumb];
						} else if (keyNumb === number) {
							ob[keyNumb] = QuoteDB[keyNumb];
						} else {
							ob[keyNumb] = QuoteDB[keyNumb - 1];
						}
					return ob;
				}, {});
				await env.quotes.put(`${ChannelDBName}`, JSON.stringify(sorted));

				return new Response(`Succesfully inserted quote ${number}`, { status: 200 });
			} else {
				return new Response("Couldn't find your quote list.", { status: 500 });
			}
		}
		return new Response('Invalid request, index not a number', { status: 400 });
	}
	return new Response('Invalid request.', { status: 400 });
}

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
		switch (LocaleParam) {
			case 'US':
				return 'en-US';
			case 'GB':
				return 'en-GB';
			default:
				return 'en-US';
		}
	};

	const ChannelDBName = `${Channel}-quotes`;
	const QuoteDB: QuoteDatabase | null = await env.quotes.get(ChannelDBName, { type: 'json' });

	if (!QuoteDB) {
		return new Response('No quotes available.', { status: 404 });
	}

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
				return DateTime.fromFormat(quoteDate, format).setLocale(setLocale()).toFormat('MM/dd/yy');
			}
			if (YearRegex.test(quoteDate)) {
				return quoteDate;
			} else {
				return 'At some point';
			}
		}
		return 'At some point';
	};

	const findCategory = (category: string) => {
		if (category.toLowerCase() === 'n/a') {
			return 'Something';
		}
		return category;
	};

	const craftResponse = (
		number: string,
		quote: string | undefined,
		author: string | undefined | null,
		extra_data: string | undefined | null,
		category: string | undefined | null,
		channel: string,
		date: string,
	) => {
		if (author == 'gimmick') {
			return new Response(quote, { status: 200 });
		}
		return new Response(
			`#${number}. "${quote}" ${author ? `-${author}` : ''},${extra_data ? extra_data : ''} while ${channel} streamed ${findCategory(category || '')}, ${date}`,
			{ status: 200 },
		);
	};

	if (QuerryParam) {
		const number = +QuerryParam;
		if (!Number.isNaN(number)) {
			const found: QuoteObject = QuoteDB[number];
			if (!found) {
				return new Response(`No quote with that number.`, { status: 400 });
			}
			const streamer = ChannelShortName || Channel;
			const quote = found.quote;
			const author = found.author;
			const extra_data = found.extra_data;
			const category = found.category;
			const date = formatDate(found?.date);

			return craftResponse(number.toString(), quote, author, extra_data, category, streamer, date);
		} else {
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
			const extra_data = FoundQuotes[QuoteIndex]?.extra_data;
			const category = FoundQuotes[QuoteIndex]?.category;
			const date = formatDate(FoundQuotes[QuoteIndex]?.date);

			return craftResponse(randomNumber.toString(), quote, author, extra_data, category, streamer, date);
		}
	} else {
		var listLength = Object.keys(QuoteDB).length;
		var randomNumber = Math.floor(Math.random() * listLength);
		if (randomNumber === 0) {
			randomNumber = 1;
		}
		const quote = QuoteDB[randomNumber]?.quote;
		const author = QuoteDB[randomNumber]?.author;
		const extra_data = QuoteDB[randomNumber]?.extra_data;
		const category = QuoteDB[randomNumber]?.category;
		const streamer = ChannelShortName || Channel;
		const date = formatDate(QuoteDB[randomNumber]?.date);

		return craftResponse(randomNumber.toString(), quote, author, extra_data, category, streamer, date);
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
