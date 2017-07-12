const router = require('express').Router();
const co = require('co');
const webdriver = require('selenium-webdriver');
const fs = require('fs');
const By = webdriver.By;
const until = webdriver.until;
const Jimp = require("jimp");

const driver = new webdriver.Builder()
    .forBrowser('phantomjs')
    .build();
const url = 'http://ecomp.mofcom.gov.cn/pages/login/QuicklyLogin.html?sp=Ssysc&sp=SNM0079';

router.get('/init', (req, res) => {
  driver.get(url);
  const captchaElem = driver.findElement(By.id('identifyCode'));
  let size, location;
  captchaElem.getSize().then(s => size = s);
  captchaElem.getLocation().then(l => location = l);

  function cropPromise(jimp, x, y, w, h) {
    return new Promise((resolve, reject) => {
      jimp.crop(x, y, w, h)
        .getBuffer(Jimp.MIME_PNG, (error, buffer) => {
          if (error) reject(error);
          const captchaImgBase64 = buffer.toString('base64');
          resolve(captchaImgBase64);
        });
    })
  }

  co(function*() {
    const screenshotBase64 = yield driver.takeScreenshot();
    const buf = Buffer.from(screenshotBase64, 'base64');
    const screenshotJimp = yield Jimp.read(buf);
    const captchaImgBase64 = yield cropPromise(screenshotJimp, location.x, location.y, size.width, size.height);
    res.send(captchaImgBase64);
    // screenshotJimp.crop(location.x, location.y, size.width, size.height)
    //   .getBuffer(Jimp.MIME_PNG, (error, buffer) => {
    //     if (error) console.log(error);
    //     const captchaImgBase64 = buffer.toString('base64');
    //     // console.log(buffer.toString('base64'));
    //     res.send(captchaImgBase64);
    //   });

  }).catch(console.log);
  // driver.takeScreenshot().then((s) => {
  //   const buf = Buffer.from(s, 'base64');
  //   Jimp.read(buf, function (err, screenshot) {
  //       if (err) throw err;
  //       screenshot.crop(location.x, location.y, size.width, size.height)
  //         .getBuffer(Jimp.MIME_PNG, (error, buffer) => {
  //           if (error) console.log(error);
  //           const captchaImgBase64 = buffer.toString('base64');
  //           // console.log(buffer.toString('base64'));
  //           res.send(captchaImgBase64);
  //         });
  //   }).catch(console.log);

  // });


});

module.exports = router;
