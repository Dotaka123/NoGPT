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
const headers = {
    'Accept': 'text/event-stream',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Content-type': 'application/json',
    'Host': 'shuttleproxy.com:6999',
    'Origin': 'http://shuttleproxy.com:6999',
    'Referer': 'http://shuttleproxy.com:6999/chat/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
  };
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
    if (message.message.text) {
      botly.sendAction({id: senderId, action: Botly.CONST.ACTION_TYPES.MARK_SEEN}, async () => {
        if (user[0]) {
          if (Date.now() > user[0].time) {
            var reset = [];
            const data = {
              action: "_ask",
              model: "gpt-3.5-turbo",
              jailbreak: "default",
              meta: {
                id: "",
                content: {
                  conversation: reset,
                  internet_access: false,
                  content_type: "text",
                  parts: [{ content: message.message.text, role: "user" }]
                }
              }
            };
            botly.sendAction({id: senderId, action: Botly.CONST.ACTION_TYPES.TYPING_ON}, async () => {
              const response = await axios.post('http://shuttleproxy.com:6999/backend-api/v2/conversation', data, { headers });
              reset.push({ "role": "user", "content": message.message.text }, { "role": "assistant", "content": response.data });
              await updateUser(senderId, {time: timer, data: reset })
              .then((data, error) => {
                if (error) {
                    botly.sendText({id: senderId, text: "حدث خطأ"});
                }
                botly.sendAction({id: senderId, action: Botly.CONST.ACTION_TYPES.TYPING_OFF}, async () => {
                  botly.sendText({id: senderId, text: response.data,
                    quick_replies: [
                      botly.createQuickReply("👍", "up"),
                      botly.createQuickReply("👎", "down")]});
                });
                });
              });
          } else {
          var conv = user[0].data;
          const data = {
              action: "_ask",
              model: "gpt-3.5-turbo",
              jailbreak: "default",
              meta: {
                id: "",
                content: {
                  conversation: conv,
                  internet_access: false,
                  content_type: "text",
                  parts: [{ content: message.message.text, role: "user" }]
                }
              }
            };
            botly.sendAction({id: senderId, action: Botly.CONST.ACTION_TYPES.TYPING_ON}, async () => {
              const response = await axios.post('http://shuttleproxy.com:6999/backend-api/v2/conversation', data, { headers });
              conv.push({ "role": "user", "content": message.message.text }, { "role": "assistant", "content": response.data });
              await updateUser(senderId, {time: timer, data: conv })
              .then((data, error) => {
                if (error) {
                    botly.sendText({id: senderId, text: "حدث خطأ"});
                }
                botly.sendAction({id: senderId, action: Botly.CONST.ACTION_TYPES.TYPING_OFF}, async () => {
                  botly.sendText({id: senderId, text: response.data,
                    quick_replies: [
                      botly.createQuickReply("👍", "up"),
                      botly.createQuickReply("👎", "down")]});
                });
              });
            });
          }
        } else {
          await createUser({uid: senderId, time: timer, data: [] })
            .then((data, error) => {
              botly.sendButtons({
                id: senderId,
                text: "مرحبا 💬.\nأنا نوتي 🤗 روبوت ذكاء صناعي مدعم بـGPT 3.5 يمكنك سؤالي عن أي معلومات تحتاجها ✨\nاستطيع مساعدتك في كتابة النصوص و حل المشاكل البرمجية 🤓.\nيمكنك الان البدأ بإستعمالي ^-^",
                buttons: [
                  botly.createWebURLButton("حساب المطور 💻👤", "facebook.com/0xNoti/"),
                ],
              });
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