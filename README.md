Here live the small tools I use to create custom commands for my twitch bot from external data, or with logic that can't be implemented natively in the bot. 

- Current features:
	- Weather information response that censors a given town
 	- Dice roller that lets you pick the dice
	- Hydration calculator that takes uptime data from DecAPI and calculates how much water you should've drank
 	- Dictionary with pronunciation guide in IPA extracted rom DictionaryAPI, it also prints one or two definitions if enough are present. If no pronunciation guide is given it searches Datamuse for it.
	- Cuddle puddle keeps track of who is inside the "cuddle puddle" and how many times they've joined. Essentially it keeps track of a bunch of strings in an array, with the option to clear it.
	- Quote library that can be added to, searched by number or word, modified by either changing a quote's text or inserting a quote at any index, and deleting quotes by number.
