import { DateTime } from "luxon"
import { TimeZone, RegionName, Offset, GMT, Zone, ZoneList  } from "./extra_data/timeZones"
import timezones from "./extra_data/timeZones"

function compareTimeZones(zone1: string, zone2: string) {
    
}

function checkTime(zone1: string) {
    const place = timezones.findIndex(zone => zone.text.toLowerCase().includes(zone1))
    const offset = timezones[place].offset
    const utc = timezones[place].utc[0]

    const timeIn = DateTime.now().setZone(utc).toFormat('hh:mm')
    console.log(offset, utc)
    return timeIn
}

function checkTimeDiff(zone1: string, zone2: string) {
    const timeInPlace = (city: string, zones: ZoneList) => {
        const utc = () => {
            if(zones.some(value => value.utc.some(place => place.toLowerCase().split('/')[1] === city)))
                {
                    return zones.some(value => value.utc.some(place => place.tolow.indexOf(city)))
                }
            }
        console.log(utc())
        let index = zones.findIndex(zone => zone.utc)
        let offset = timezones[index].utc[0]


        return offset
    }

    const timeTable = {
        city1: timeInPlace(zone1, timezones),
        city2: timeInPlace(zone2, timezones)
    }

    // console.log(timeTable)

    const TimeInCity1 = DateTime.local({zone: timeTable.city1}).toFormat('hh:mm:ss')
    const TimeInCity2 = DateTime.local({zone: timeTable.city2}).toFormat('hh:mm:ss')

    // console.log(TimeInCity1, TimeInCity2)

    const timeDiff = DateTime.fromISO(TimeInCity1).diff(DateTime.fromISO(TimeInCity2)).toFormat("h 'h'our's'")

    return `There's ${timeDiff} of difference between ${zone1.toLocaleUpperCase()} and ${zone2.toLocaleUpperCase()}`
}

export function timeZone(req: Request) {
    const zone1: string | null = new URL(req.url).searchParams.get("zone1")
    const zone2: string | null = new URL(req.url).searchParams.get("zone2")

    if(zone1 && !zone2){
        const response = checkTime(zone1)
        return new Response(JSON.stringify(response))
    }
    if(zone1 && zone2){
        const response = checkTimeDiff(zone1, zone2)
        return new Response(JSON.stringify(response))
    }
}