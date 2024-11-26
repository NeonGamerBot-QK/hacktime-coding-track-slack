require('dotenv').config();
const { App } = require('@slack/bolt');
const { Database } = require('secure-db');
const db = new Database('userdata');
db.security(process.env.SECURE_DB);
const heartStore = new Database('hearts');
const ms = require('ms');
const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
});
/* Add functionality here */
app.command("/config-hacktime", async ({ ack, say, body, client }) => {
  const user = body.user_id;
  const channelID = body.channel_id;
  const timestamp = body.ts;

  // Acknowledge the command request
  await ack();
const args = body.text.split(' ');
const prop = args.shift().toLowerCase();
switch (prop) {
    case 'key':
        const key = args.shift();
       await  db.set(user + ".key", key)
        await app.client.chat.postEphemeral({
            channel: channelID,
            user,
            text: `Your key is ${key}`,
            ts: timestamp,
        });
        break;
        case "channel":
            const channel = args.shift();
            if(!channel.indexOf('|') && channel.indexOf('#') !== 0) {
            return await app.client.chat.postEphemeral({
                channel: channelID,
                user,
                text: `Make sure you mention your channel!!`,
                ts: timestamp,
            });
            }
            await db.set(user + ".channel", channel.split("#")[1].split("|")[0])
            await app.client.chat.postEphemeral({
                channel: channelID,
                user,
                text: `Your channel is ${channel}`,
                ts: timestamp,
            });
        break;
        default:
            await app.client.chat.postEphemeral({
                channel: channelID,
                user,
                text: `I don't know what you mean by ${prop}`,
                ts: timestamp,
            });
}
});
function isWithinLastTwoMinutes(timestamp) {
    if(timestamp instanceof Date) timestamp = timestamp.getTime();
    const currentTime = Date.now(); // Get the current timestamp in milliseconds
    const twoMinutesInMilliseconds = 2 * 60 * 1000; // 2 minutes in milliseconds
  
    return (currentTime - timestamp) <= twoMinutesInMilliseconds;
  }
  
async function interFunc()  {
    // console.log(`i um do smthing here`)
    const users = db.all().map(e=>{
        return {
            user: e[0],
            ...e[1]
        }
    })
    for(const user of users) {
        if(!user.key || !user.channel) continue;
    const userHacktimeDat = await fetch(`https://waka.hackclub.com/api/compat/wakatime/v1/users/${user.user}/heartbeats?date=${new Date().toISOString().split('T')[0]}`, {
        headers: {
            'Authorization': `Basic ${Buffer.from(user.key).toString('base64')}`,
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
    }).then(r=>r.json()).then(r=>r.data)
    // console.log(userHacktimeDat)
const currentSession = heartStore.get(user.user)

    if(userHacktimeDat.length > 0) {
       const d  = userHacktimeDat.find(e => isWithinLastTwoMinutes(new Date(e.created_at)))
        if(d) {
// console.log(`um heartbat???`, d)
if(!currentSession) { 
app.client.chat.postMessage({
    channel: user.channel,
    text: `Looks like your coding rn <@${user.user}>`
}).then(d=> {
    heartStore.set(user.user, {
        active: true,
        m_ts: d.ts,
        created_at: Date.now()
    })
})
} 
}
     else {
        if(currentSession) {
            // check if still "active"
            if(currentSession.active) {
// set to not be active
// pretty much this is a warning: if there is no new heartbeat im nuking it.
heartStore.set(user.user + ".active" , false)
            } else{
                // send time up message
                app.client.chat.postMessage({
                    channel: user.channel,
                    text: `Looks like your done coding rn <@${user.user}>, you coded for a total of ${ms(Date.now() - currentSession.created_at)}`,
                    thread_ts: currentSession.m_ts,
                    reply_broadcast: true
                })
                // delete it
                heartStore.delete(user.user)
            }
        }
    }
}
    }
    // console.log(users)
      }

(async () => {
    // Start the app
    await app.start(process.env.PORT || 3000);
  
    console.log('⚡️ Bolt app is running!');
    setInterval(interFunc, 60 * 1000)
    interFunc()
})();
process.on('uncaughtException', console.error)
