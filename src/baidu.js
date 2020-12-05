const MD5 = require('./md5')
const axios = require('axios').default.create({
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
})

var appid = process.env.BAIDU_APPID;
var key = process.env.BAIDU_KEY;

async function translate(query = 'Hi \n how do you do', to = 'zh') {
  var salt = (new Date).getTime();
  var from = 'en';
  var str1 = appid + query + salt + key;
  var sign = MD5(str1);
  let res = await axios.get('http://api.fanyi.baidu.com/api/trans/vip/translate', {
    params: {
      q: query,
      appid: appid,
      salt: salt,
      from: from,
      to: to,
      sign: sign
    }
  })
  const { trans_result } = res.data
  console.log({ trans_result, query, to, data: res.data })
  let rtn = trans_result.map(({ dst }) => dst).join('\n')
  console.log({ rtn })
  return rtn
}
module.exports = translate
