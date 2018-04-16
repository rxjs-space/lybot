const webdriver = require('selenium-webdriver');
const fs = require('fs');
const By = webdriver.By;
const until = webdriver.until;
const Jimp = require("jimp");

const driver = new webdriver.Builder()
    .forBrowser('phantomjs')
    // .forBrowser('chrome')
    .build();

// driver.get('http://www.bing.com').then(() => console.log('page opened'));
// https://ecomp.mofcom.gov.cn/loginCorp.html
const url = 'https://ecomp.mofcom.gov.cn/loginCorp.html';
// const url = 'http://ecomp.mofcom.gov.cn/pages/login/QuicklyLogin.html?sp=Ssysc&sp=SNM0079';
driver.get(url).then(() => console.log('page opened'));
const captchaElem = driver.findElement(By.id('identifyCode'));
let size, location;
captchaElem.getSize().then(s => size = s);
captchaElem.getLocation().then(l => location = l);

// driver.findElement(By.name('q')).sendKeys('webdriver');

// driver.findElement(By.name('go')).click();

// driver.wait(until.titleIs('webdriver - 必应'), 20 * 1000);

// const buttonElem = driver.findElement(By.name('go'));
// let size, location;
// buttonElem.getSize().then(s => size = s);
// buttonElem.getLocation().then(l => location = l);

driver.takeScreenshot().then((s) => {
  const buf = Buffer.from(s, 'base64');
  Jimp.read(buf, function (err, screenshot) {
      if (err) throw err;
      screenshot.crop(location.x, location.y, size.width, size.height)
        .getBuffer(Jimp.MIME_PNG, (error, buffer) => {
          if (error) console.log(error);
          console.log(buffer.toString('base64'));
        });
        // .write(`element-${Date.now()}.png`); // save 
  }).catch(console.log);

  // fs.writeFile(`screenshot-${Date.now()}.png`, s, 'base64', function(err) {
  //   if(err) {
  //     return console.log(err);
  //   }
  // });


});

driver.quit();
