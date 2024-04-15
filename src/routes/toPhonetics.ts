type tags = [
    pron: string,
    ipa_pron: string,
    f: string
]

type WordData = {
    word: string
    score: number
    tags: Array<tags>
  }

export type WordPronunciation = [
    WordData?: WordData
]

async function fetchWordPronunciation(wrd: string) {
    const DatamuseURL = 'https://api.datamuse.com/words'
    const word = wrd?.toLowerCase();
    const maxResults = "4"
    const requestURL = `${DatamuseURL}?sp=${word}&max=${maxResults}&md=fr&ipa=1`

    try {
        const req = await fetch(requestURL)
        if (req.ok) {
            const data: WordPronunciation = await req.json();
            const Pronunciation = ` /${data[0]?.tags[1].toString().split(":")[1]}/`
            return Pronunciation
        } else {
            throw new Error("Request failed with status:" + req.status)
        }
    } catch (err) {
        console.log("There was an issue fetching the data", err)
        throw new Error("Error fetching data")
    }
}

export type WordMeaning = Array<{
    word: string
    phonetic: string
    phonetics: Array<{
      text: string
      audio: string
      sourceUrl?: string
      license?: {
        name: string
        url: string
      }
    }>
    meanings: Array<{
      partOfSpeech: string
      definitions: Array<{
        definition: string
        synonyms: Array<any>
        antonyms: Array<any>
        example?: string
      }>
      synonyms: Array<string>
      antonyms: Array<any>
    }>
    license: {
      name: string
      url: string
    }
    sourceUrls: Array<string>
  }>

async function FetchWordData(wrd: string) {
    const word = wrd?.toLowerCase();
    const requestURL = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`

    function capitilize(str: string) {
        return str.charAt(0).toUpperCase() + str.slice(1)
    }

    try {
        const req = await fetch(requestURL)
        if (req.ok) {
            const data: WordMeaning = await req.json();

            const wordSpelling: string = data[0].word
            const ipa: string = data[0].phonetic
            const firstDef: string = data[0].meanings[0].definitions[0].definition
            const firstPOS: string = data[0].meanings[0].partOfSpeech
            const secondDef: string | undefined = data[0].meanings[1]?.definitions[0].definition || ''
            const secondPOS: string | undefined = data[0].meanings[1]?.partOfSpeech || ''

            const Pronunciation = `${capitilize(wordSpelling)},${ipa? ` pronounced ${ipa}.` : await fetchWordPronunciation(word)} ${capitilize(firstPOS)}, ${firstDef} ${secondDef? `${capitilize(secondPOS)}, ${secondDef}` : ''} `
            return Pronunciation
        } else {
            throw new Error("Request failed with status:" + req.status)
        }
    } catch (err) {
        console.log("There was an issue fetching the data", err)
        throw new Error("Error fetching data")
    }
}

export async function WordPronunciation(request: Request) {
    try {
        const word = new URL(request.url).searchParams.get("word") || ''
        const wordData = await FetchWordData(word)
        return new Response(wordData)
    } catch (err) {
        console.log("Error", err)
        return new Response ("Internal server error", {status: 500})
    }
}