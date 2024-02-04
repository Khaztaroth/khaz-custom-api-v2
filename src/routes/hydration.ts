async function GetUptime(channel: string) {
    if (channel?.toLowerCase() !== "khaztaroth315") {
      const apiUrl = `https://decapi.me/twitch/uptime/${channel}`;
      const res = fetch(apiUrl);
      const body = (await res).text();
      return await body;
    } else {
      const apiUrl = `https://decapi.me/twitch/uptime/Khaztaroth315`;
      const res = fetch(apiUrl);
      const body = (await res).text();
      return await body;
    }
  }
  function toSeconds(minutes: number, hours?: number) {
    if (hours) {
      const seconds = hours * 3600 + minutes * 60;
      return seconds;
    } else {
      const seconds = minutes * 60;
      return seconds;
    }
  }

  export type Volume = {
    L?: string,
    oz: string,
    mL: string,
  }

  async function HydrationCalc(uptime: string) {
    const timeSplit = uptime.split(" ");
    const mlPerHour = 154.166;
    const mlPerSecond = mlPerHour / 3600;
    const OzPerML = 0.033814027;

    switch (timeSplit.length) {
      case 2: {
        const uptimeObj = {
          secondsNum: +timeSplit[0]
        };
        const volume = uptimeObj.secondsNum * mlPerSecond;
        const totalOz = volume * OzPerML;
        const total = {
          oz: totalOz.toFixed(2),
          mL: volume.toFixed(2)
        };
        return total;
      }
      case 4: {
        const uptimeObj = {
          minutesNum: +timeSplit[0],
          secondsNum: +timeSplit[2]
        };
        const volume = (toSeconds(uptimeObj.minutesNum || 0) + uptimeObj.secondsNum) * mlPerSecond;
        if (volume >= 1e3) {
          const totalL = volume / 1e3;
          const totalOz = volume * OzPerML;
          const total = {
            L: totalL.toFixed(2),
            oz: totalOz.toFixed(2),
            mL: volume.toFixed(2)
          };
          return total;
        } else {
          const totalOz = volume * OzPerML;
          const total = {
            oz: totalOz.toFixed(2),
            mL: volume.toFixed(2)
          };
          return total;
        }
      }
      case 6: {
        const uptimeObj = {
          hoursNum: +timeSplit[0],
          minutesNum: +timeSplit[2],
          secondsNum: +timeSplit[4]
        };
        const volume = (toSeconds(uptimeObj.minutesNum || 0, uptimeObj.hoursNum) + uptimeObj.secondsNum) * mlPerSecond;
        if (volume >= 1e3) {
          const totalL = volume / 1e3;
          const totalOz = volume * OzPerML;
          const total = {
            L: totalL.toFixed(2),
            oz: totalOz.toFixed(2),
            mL: volume.toFixed(2)
          };
          return total;
        } else {
          const totalOz = volume * OzPerML;
          const total = {
            oz: totalOz.toFixed(2),
            mL: volume.toFixed(2)
          };
          return total;
        }
      }
    }
  }

  export async function Hydration(request: Request, defaultChannel: string) {
    try {
      const channel = new URL(request.url).searchParams.get("channel") || defaultChannel;
      const channelUptime = await GetUptime(channel);
      const quantity: Volume | undefined = await HydrationCalc(channelUptime);

      if (channelUptime.includes("offline", 2)) {
        const response = `Channel is offline but you should drink water anyways, for safety`;
        return new Response(response, { status: 200 });
      } else {
        const response = `${channel} has been lilve for ${channelUptime}. At this point they should've drunk ${quantity?.L ? `${quantity.L}L` : `${quantity?.mL}mL`}/${quantity?.oz}oz of water`;
        return new Response(response, { status: 200 });
      }
    } catch (err) {
      return new Response("Main func error", { status: 500 });
    }
  }
  