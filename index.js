const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const Botly = require("botly");
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SB_URL, process.env.SB_KEY, { auth: { persistSession: false} });
const port = process.env.PORT || 3000;
const botly = new Botly({
	accessToken: process.env.PAGE_ACCESS_TOKEN,
	notificationType: Botly.CONST.REGULAR,
	FB_URL: "https://graph.facebook.com/v2.6/",
});
app.get("/", function(_req, res) {
	res.sendStatus(200);
});
/* ----- ESSENTIALS ----- */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
/* ----- MAGIC ----- */
app.post('/webhook', (req, res) => {
 // console.log(req.body)
  if (req.body.message) {
    onMessage(req.body.message.sender.id, req.body.message);
  } else if (req.body.postback) {
    onPostBack(req.body.postback.message.sender.id, req.body.postback.message, req.body.postback.postback);
  }
  res.sendStatus(200);
});
/* ----- DB Qrs ----- */
async function createUser(user) {
    const { data, error } = await supabase
        .from('users')
        .insert([ user ]);
  
      if (error) {
        throw new Error('Error creating user : ', error);
      } else {
        return data
      }
  };
  
  async function updateUser(id, update) {
    const { data, error } = await supabase
      .from('users')
      .update( update )
      .eq('uid', id);
  
      if (error) {
        throw new Error('Error updating user : ', error);
      } else {
        return data
      }
  };
  
  async function userDb(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('uid', userId);
  
    if (error) {
      console.error('Error checking user:', error);
    } else {
      return data
    }
  };
/* ----- HANDELS ----- */

const onMessage = async (senderId, message) => {
    const user = await userDb(senderId);
    const timer = new Date().getTime() + 1 * 60 * 60 * 1000;
    /* ---- */
    if (message.message.text) { // message.message.text
      botly.sendAction({id: senderId, action: Botly.CONST.ACTION_TYPES.MARK_SEEN}, async () => {
        if (user[0]) {
          if (Date.now() > user[0].time) {
            var reset = [];
            const data = {
              "prompt": [
                {
                  "role": "user",
                  "content": "I want you to act as my friend named NoGPT and the full name is Noti GPT you can understand any language and replay to me by my language and also you are very smart. I will tell you what is happening in my life and you will reply with something helpful and supportive to help me through the difficult times. i will ask you about any information and you will help me always and give me correct answers. Do not write any explanations, be supportive and very helpful . My first request is: " + message.message.text
                }
              ],
              "lang": "en",
              "model": 3.5,
              "plugins": [],
              "webVersion": "0.6.3",
              "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
              "isExtension": false,
              "isSummarize": false,
              "initialMessages": null,
              "baseUrl": "",
              "maxToken": 512
            };
            botly.sendAction({id: senderId, action: Botly.CONST.ACTION_TYPES.TYPING_ON}, async () => {
              const response = await axios.post(`https://${process.env.SITE}/api/chat/stream`, data, {
                headers: {
                'content-type': 'application/json',
                'cookie': `access_token=${user[0].token}; has_token=true;`,
                'Referer': `https://${process.env.SITE}/chat`
              },
              responseType: 'stream'});
              let sentence = '';
              response.data.on('data', chunk => {
                const responseData = chunk.toString();
                const lines = responseData.split("\n");
                lines.forEach(line => {
                  if (line.startsWith("data: ")) {
                    const data = line.slice(6).trim();
                    var sh = data.replace("[SPACE]", " ").replace("[DONE]", "").replace("[NEWLINE]", "\n")
                    sentence += sh;
                  }
                });
              });
              response.data.on('end', async () => {
                reset.push({ "role": "user", "content": "I want you to act as my friend named NoGPT and the full name is Noti GPT you can understand any language and replay to me by my language and also you are very smart. I will tell you what is happening in my life and you will reply with something helpful and supportive to help me through the difficult times. i will ask you about any information and you will help me always and give me correct answers. Do not write any explanations, be supportive and very helpful . My first request is: " + message.message.text }, { "role": "assistant", "content": sentence.trim() });
                await updateUser(senderId, {time: timer, data: reset })
                .then((data, error) => {
                  if (error) {
                    botly.sendText({id: senderId, text: "حدث خطأ"});
                  }
                botly.sendAction({id: senderId, action: Botly.CONST.ACTION_TYPES.TYPING_OFF}, async () => {
                  botly.sendText({id: senderId, text: sentence.trim(),
                    quick_replies: [
                      botly.createQuickReply("👍", "up"),
                      botly.createQuickReply("👎", "down")]});
                });
                });
              });
              });
          } else {
          var conv = user[0].data;
          if (user[0].data.length > 4) {
            var reset = [];
            const data = {
              "prompt": [
                {
                  "role": "user",
                  "content": "I want you to act as my friend named NoGPT and the full name is Noti GPT you can understand any language and replay to me by my language and also you are very smart. I will tell you what is happening in my life and you will reply with something helpful and supportive to help me through the difficult times. i will ask you about any information and you will help me always and give me correct answers. Do not write any explanations, be supportive and very helpful . My first request is: " + message.message.text
                }
              ],
              "lang": "en",
              "model": 3.5,
              "plugins": [],
              "webVersion": "0.6.3",
              "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
              "isExtension": false,
              "isSummarize": false,
              "initialMessages": null,
              "baseUrl": "",
              "maxToken": 512
            };
            botly.sendAction({id: senderId, action: Botly.CONST.ACTION_TYPES.TYPING_ON}, async () => {
              const response = await axios.post(`https://${process.env.SITE}/api/chat/stream`, data, {
                headers: {
                'content-type': 'application/json',
                'cookie': `access_token=${user[0].token}; has_token=true;`,
                'Referer': `https://${process.env.SITE}/chat`
              },
              responseType: 'stream'});
              let sentence = '';
              response.data.on('data', chunk => {
                const responseData = chunk.toString();
                const lines = responseData.split("\n");
                lines.forEach(line => {
                  if (line.startsWith("data: ")) {
                    const data = line.slice(6).trim();
                    var sh = data.replace("[SPACE]", " ").replace("[DONE]", "").replace("[NEWLINE]", "\n")
                    sentence += sh;
                  }
                });
              });
              response.data.on('end', async () => {
                reset.push({ "role": "user", "content": "I want you to act as my friend named NoGPT and the full name is Noti GPT you can understand any language and replay to me by my language and also you are very smart. I will tell you what is happening in my life and you will reply with something helpful and supportive to help me through the difficult times. i will ask you about any information and you will help me always and give me correct answers. Do not write any explanations, be supportive and very helpful . My first request is: " + message.message.text }, { "role": "assistant", "content": sentence.trim() });
                await updateUser(senderId, {time: timer, data: reset })
                .then((data, error) => {
                  if (error) {
                    botly.sendText({id: senderId, text: "حدث خطأ"});
                  }
                botly.sendAction({id: senderId, action: Botly.CONST.ACTION_TYPES.TYPING_OFF}, async () => {
                  botly.sendText({id: senderId, text: sentence.trim(),
                    quick_replies: [
                      botly.createQuickReply("👍", "up"),
                      botly.createQuickReply("👎", "down")]});
                });
                });
              });
              });
          } else {
            conv.push({ "role": "user", "content": message.message.text })
          const data = {
            "prompt": conv,
            "lang": "en",
            "model": 3.5,
            "plugins": [],
            "webVersion": "0.6.3",
            "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
            "isExtension": false,
            "isSummarize": false,
            "initialMessages": null,
            "baseUrl": "",
            "maxToken": 512
          };
            botly.sendAction({id: senderId, action: Botly.CONST.ACTION_TYPES.TYPING_ON}, async () => {
              try {
                const response = await axios.post(`https://${process.env.SITE}/api/chat/stream`, data, {
                  headers: {
                  'content-type': 'application/json',
                  'cookie': `access_token=${user[0].token}; has_token=true;`,
                  'Referer': `https://${process.env.SITE}/chat`
                },
                responseType: 'stream'});
                let sentence = '';
              response.data.on('data', chunk => {
                const responseData = chunk.toString();
                const lines = responseData.split("\n");
                lines.forEach(line => {
                  if (line.startsWith("data: ")) {
                    const data = line.slice(6).trim();
                    let sh = data.replace("[SPACE]", " ").replace("[DONE]", "");
                    sh.replace("[NEWLINE]", "\n");
                    sentence += sh;
                  }
                });
              });
              response.data.on('end', async () => { // sentence.trim()
                conv.push({ "role": "assistant", "content": sentence.trim() });
              await updateUser(senderId, {time: timer, data: conv })
              .then((data, error) => {
                if (error) {
                    botly.sendText({id: senderId, text: "حدث خطأ"});
                }
                botly.sendAction({id: senderId, action: Botly.CONST.ACTION_TYPES.TYPING_OFF}, async () => {
                  botly.sendText({id: senderId, text: sentence.trim(),
                    quick_replies: [
                      botly.createQuickReply("👍", "up"),
                      botly.createQuickReply("👎", "down")]});
                });
              });
              });
              } catch (error) {
                console.log("ERR: ", error)
              }
            });
          }
          }
        } else {
          var tokenize = await axios.post(`https://${process.env.SITE}/api/login`, { email: `${senderId}@smartnator.com`}, {
              "accept": "application/json, text/plain, */*",
              "Referer": `https://${process.env.SITE}/chat`
            });
          await createUser({uid: senderId, time: timer, data: [{ "role": "user", "content": "I want you to act as my friend named NoGPT and the full name is Noti GPT you can understand any language and replay to me by my language and also you are very smart. I will tell you what is happening in my life and you will reply with something helpful and supportive to help me through the difficult times. i will ask you about any information and you will help me always and give me correct answers. Do not write any explanations, be supportive and very helpful . My first request is: مرحبا"}, { "role": "assistant", "content": "مرحبا. كيف يمكنني مساعدتك" }], token: tokenize.data.verifyToken})
            .then((data, error) => {
              botly.sendButtons({
                id: senderId,
                text: "📣 تنبيه :\nقبل إستعمال نو جيبيتي 💜\nمن فضلك إذا أردت إستمرار الصفحة. الرجاء تسجيل إعجابك 👍🏻 إذا رأيت أن الصفحة تفيدك طبعا :) \nوصل عدد المستخدمين إلى 15الف و الصفحة مازالت لم تتجاوز ألف إعجاب !",
                buttons: [
                  botly.createWebURLButton("حساب المطور 💻👤", "facebook.com/0xNoti/"),
                ],
              });
              /*
              botly.sendButtons({
                id: senderId,
                text: "مرحبا 💬.\nأنا نوتي 🤗 روبوت ذكاء صناعي مدعم بـGPT 3.5 يمكنك سؤالي عن أي معلومات تحتاجها ✨\nاستطيع مساعدتك في كتابة النصوص و حل المشاكل البرمجية 🤓.\nيمكنك الان البدأ بإستعمالي ^-^",
                buttons: [
                  botly.createWebURLButton("حساب المطور 💻👤", "facebook.com/0xNoti/"),
                ],
              });
              */
            });
        }
      });
      } else if (message.message.attachments[0].payload.sticker_id) {
        //botly.sendText({id: senderId, text: "(Y)"});
      } else if (message.message.attachments[0].type == "image") {
        botly.sendText({id: senderId, text: "المرجو إستعمال النصوص فقط"});
      } else if (message.message.attachments[0].type == "audio") {
        botly.sendText({id: senderId, text: "المرجو إستعمال النصوص فقط"});
      } else if (message.message.attachments[0].type == "video") {
        botly.sendText({id: senderId, text: "المرجو إستعمال النصوص فقط"});
      }
};
/* ----- POSTBACK ----- */

const onPostBack = async (senderId, message, postback) => {
  if (message.postback) {
    if (postback == "") {
      //
    } else if (postback == "") {
    } else if (postback == "") {
      //
    } else if (postback == "") {
      //
    } else if (postback == "") {
      //
    } else if (postback == "") {
      //
    } else if (message.postback.title == "") {
      //
    } else if (message.postback.title == "") {
      //
    } else if (message.postback.title == "") {
      //
    } else if (message.postback.title == "") {
      //
    }
  } else {
    // Quick Reply
    if (message.message.text == "") {
      //
    } else if (message.message.text == "") {
      //
    } else if (postback == "up" || postback == "down") {
      botly.sendText({id: senderId, text: "شكرا لترك التقييم ♥"});
    }
  }
};
/* ----- HANDELS ----- */
app.listen(port, () => console.log(`App is on port : 3000`));