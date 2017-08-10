const router = require('express').Router();
const co = require('co');
const coForEach = require('co-foreach');
const webdriver = require('selenium-webdriver');
const fs = require('fs');
const By = webdriver.By;
const until = webdriver.until;
const Jimp = require("jimp");
const Rx = require('rxjs/Rx');

const isProduction = process.env.NODE_ENV === 'production';

const vehicleTypeXPathHash = require('./constants').vehicleTypeXPathHash;
const lastInputElementXPathHash = require('./constants').lastInputElementXPathHash;
const vehicleDetailsXPathHash = require('./constants').vehicleDetailsXPathHash;
const dateElementXPathHash = require('./constants').dateElementXPathHash;
const nonTextInputsHash = require('./constants').nonTextInputsHash;
const nonTextInputOptionXPathHashes = require('./constants').nonTextInputOptionXPathHashes;
const commonElementXPathHashes = require('./constants').commonElementXPathHashes;
const loginCheckSuccessInterval = require('./constants').loginCheckSuccessInterval;
const confirmAndNextButtonElementXPathHash = require('./constants').confirmAndNextButtonElementXPathHash;
const topElementXPathHash = require('./constants').topElementXPathHash;

const drivers = {};
const formUrls = {};
const newActionRxxs = {};
const url = require('./constants').mofcomLoginUrl;

const mofcomSessions = {};

const finishedMofcomOpsRxx = new Rx.Subject();
exports.finishedMofcomOpsRxx = finishedMofcomOpsRxx;

exports.mofcomSessions = mofcomSessions;
exports.mofcomNewSession = (roomId) => {
  let session = {
    roomId,
    driver: new webdriver.Builder()
      .forBrowser('phantomjs')
      .build(),
    formUrl: '',
    newActionRxx: new Rx.Subject(), // each newAction will trigger a new timer to clear session
    mofcomResultRxx: new Rx.Subject(),
    mofcomActionsRxx: new Rx.Subject(),
    vehicleCache: null,
    vehicleUnderCooking: null,
    lastLoginCheckSuccessAt: null
  };

  const canBedleForXMins = 3;
  const timerRx = Rx.Observable
    .timer(canBedleForXMins * 60 * 1000)
    .map(() => {
      if (session.driver) {
        console.log(`session for ${roomId} is now cleared after ${canBedleForXMins} mins idling at ${new Date()}.`)
        session.driver.quit();
        delete mofcomSessions[roomId];
      }
    });
  session.newActionRxx
    .switchMap(() => timerRx)
    .subscribe();
  session.newActionRxx.next('anything');

  return session;
}


exports.newEntryPromiseFac = (vehicle, jwt, session) => {
  session.newActionRxx.next('anything');
  const roomId = session.roomId;
  session.vehicleUnderCooking = vehicle;
  return new Promise((resolve, reject) => {
    checkLoginPromiseFac(session)
      .then(isLoggedIn => {
        if (isLoggedIn) {
          session.vehicleCache = null;
          console.log('loggedIn');
          // data input
          prepareNewEntryPromise(vehicle, session)
            .then(result => resolve(result))
            .catch(error => reject(error))
        } else {
          session.vehicleCache = vehicle;
          getCaptchaPromiseFac(session)
            .then(captchaBase64 => reject({
              message: 'notLoggedIn',
              data: {captchaBase64}
            }))
            .catch(error => reject({
              message: error
            }));
        }
      })
  })
}

exports.submitNewEntryPromiseFac = (session) => {
  session.newActionRxx.next('anything');
  return new Promise((resolve, reject) => {
    co(function*() {
      const vehicle = session.vehicleUnderCooking;
      const submitButtonXPath = confirmAndNextButtonElementXPathHash[vehicle.mofcomRegisterType];
      console.log(vehicle);
      // get and return the mofcomRegistryRef ...
      yield driver.findElement(By.xpath(submitButtonXPath)).click();

      // 保存成功/是
      // /html/body/div[16]/div[3]/div[1]
      // 保存
      // //*[@id="1139"]/div/span/span
      // 没有录入任何数据/是
      // /html/body/div[16]/div[3]/div[1]
      // 回收证明单编号
      // //*[@id="1144"]/div/p[6]
      // get inner text
      // "回收证明单编号:HS-210000-1045-20170811-1"
      // substring(8)
      const firstStageSavedYesXPath = '/html/body/div[16]/div[3]/div[1]';
      yield driver.wait(until.elementLocated(By.xpath(firstStageSavedYesXPath)));
      yield driver.findElement(By.xpath(firstStageSavedYesXPath)).click();
      const secondStageSaveButtonXPath = '//*[@id="1139"]/div/span/span';
      yield driver.findElement(By.xpath(secondStageSaveButtonXPath)).click();
      const secondStageSavedYesXPath = '/html/body/div[16]/div[3]/div[1]';
      yield driver.wait(until.elementLocated(By.xpath(secondStageSavedYesXPath)));
      yield driver.findElement(By.xpath(secondStageSavedYesXPath)).click();
      const mofcomRefXPath = '//*[@id="1144"]/div/p[6]'
      const mofcomRegisterRef = yield driver.executeScript(`
        var mofcomRefElement = document.evaluate('${mofcomRefXPath}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        return mofcomRefElement.innerText.substring(8);
      `);

      session.vehicleUnderCooking = null;
      resolve({
        message: 'newEntrySubmitted',
        data: {
          mofcomRegisterRef
        }
      });

    }).catch(error => {
      reject({
        message: error
      })
    })

  })
}

exports.newEntryAgainPromiseFac = (session) => {
  session.newActionRxx.next('anything');
  const roomId = session.roomId;
  return new Promise((resolve, reject) => {
    const vehicle = session.vehicleCache;
    session.vehicleCache = null;
    console.log('loggedIn');
    // data input
    prepareNewEntryPromise(vehicle, session)
      .then(result => resolve(result))
      .catch(error => reject(error));

  })
}

const prepareNewEntryPromise = (vehicle, session) => {
  const optionHashes = nonTextInputOptionXPathHashes[vehicle.mofcomRegisterType];
  session.newActionRxx.next('anything');
  const roomId = session.roomId;
  let latestTimestamp = Date.now();
  const calculateTimeElapsed = () => {
    const now = Date.now();
    const timeElapsed = now - latestTimestamp;
    latestTimestamp = now;
    return timeElapsed;
  }

  const driver = session.driver;
  const formUrl = session.formUrl;

  return new Promise((resolve, reject) => {


    co(function*() {
      // const currentUrl = yield driver.getCurrentUrl();
      yield driver.get(formUrl);
      console.log(roomId, '[prepare new entry]', 'after getting formUrl:', calculateTimeElapsed());
      yield driver.wait(
        until.titleContains('商务部业务系统统一平台--汽车流通信息管理')
      , 20 * 1000);
      console.log(roomId, '[prepare new entry]', 'after seeing the title:', calculateTimeElapsed());

      yield kodakPromise(driver, 'png/03-01-before-typing-in.png')
      console.log(roomId, '[prepare new entry] after taking 03-01:', calculateTimeElapsed());

      yield driver.findElement(By.xpath(commonElementXPathHashes['车辆信息检索'])).click(); // 车辆信息检索
            console.log(roomId, '[prepare new entry] after clicking on 车辆信息检索:', calculateTimeElapsed());
      yield driver.wait(until.elementLocated(By.xpath(vehicleTypeXPathHash[vehicle.mofcomRegisterType])));
            console.log(roomId, '[prepare new entry] after locating vehicle.mofcomRegisterType:', calculateTimeElapsed());
      yield driver.findElement(By.xpath(vehicleTypeXPathHash[vehicle.mofcomRegisterType])).click(); // 新建车辆 by mofcomRegisterType
            console.log(roomId, '[prepare new entry] after clicking vehicle.mofcomRegisterType:', calculateTimeElapsed());
      yield driver.wait(until.elementLocated(By.xpath(lastInputElementXPathHash[vehicle.mofcomRegisterType]))); // until last input element is located
      console.log(roomId, `[prepare new entry] after locating the last input element for type ${vehicle.mofcomRegisterType}:`, calculateTimeElapsed());

      yield kodakPromise(driver, 'png/03-01.5-still-before-typing-in.png');
      console.log(roomId, '[prepare new entry] after taking 03-01.5:', calculateTimeElapsed());
      const xpathHash = Object.assign({}, vehicleDetailsXPathHash[vehicle.mofcomRegisterType]);
      const dateXPathHash = Object.assign({}, dateElementXPathHash[vehicle.mofcomRegisterType]);
      if (vehicle.owner.isPerson) {
        delete xpathHash['agent.name'];
        delete xpathHash['agent.idNo'];
      }
      const items = Object.keys(xpathHash);
      const nonTextInputs = nonTextInputsHash[vehicle.mofcomRegisterType];

      yield coForEach(items, function*(item) {
        console.log(item);
        let itemInVehicle, value, paths;
        switch (item) {
          case 'vehicle.displacementL':
            // itemInVehicle = 'vehicle.displacementML';
            if (vehicle['vehicle']['displacementML']) {
              value = (Math.round((vehicle['vehicle']['displacementML'] / 1000) * 10) / 10).toString();
            } else {
              value = '';
            }
            break;
          case 'vehicle.lengthOverallM':
            // itemInVehicle = 'vehicle.lengthOverallMM';
            if (vehicle['vehicle']['lengthOverallMM']) {
              value = (Math.round((vehicle['vehicle']['lengthOverallMM'] / 1000) * 1000) / 1000).toString();
            } else {
              value = '';
            }
            break;
          case 'vinConfirm':
            value = vehicle['vin'];
            break;
          default:
            paths = item.split('.');
            value = vehicle[paths[0]];
            if (paths.length > 1) {
              for (let i = 1; i < paths.length; i++) {
                if (value) {
                  value = value[paths[i]];
                } else {
                  value = '';
                  break;
                }
              }
            }
        }
        // paths = itemInVehicle.split('.');
        // if (item === 'vinConfirm') {
        //   value = vehicle['vin'];
        // } else {
        //   value = vehicle[paths[0]];
        //   if (paths.length > 1) {
        //     for (let i = 1; i < paths.length; i++) {
        //       if (value) {
        //         value = value[paths[i]];
        //       } else {
        //         value = '';
        //         break;
        //       }
        //     }
        //   }
        // }

        
        console.log(value);
        switch (true) {
          // case item === 'owner.isPerson' && value === false: // if the owner is not a person
          //   yield driver.findElement(By.xpath(xpathHash[item])).click();
          //   yield driver.findElement(By.xpath('//*[@id="1048"]/div[2]')).click(); // click on '否'
          //   break;
          // case item === 'vehicle.vehicleType':
          //   yield driver.findElement(By.xpath(xpathHash[item])).click();
          //   yield driver.findElement(By.xpath(optionHashes[item][value])).click();
          //   break;
          // case item === 'vehicle.displacementL' && !!value:
          //   value = (Math.round((value / 1000) * 10) / 10).toString();
          //   console.log('displacement in L:', value);
          //   yield driver.findElement(By.xpath(xpathHash[item])).sendKeys(value);
          //   break;
          case nonTextInputs.indexOf(item) > -1:
            console.log(item);
            yield driver.findElement(By.xpath(xpathHash[item])).click();
            // yield kodakPromise(driver, `${item}.png`);
            yield driver.findElement(By.xpath(optionHashes[item][value])).click();
            break;
          case nonTextInputs.indexOf(item) === -1 && !!value:
            if (item === 'vehicle.registrationDate') {
              const year = value.substring(0, 4) * 1;
              const month = value.substring(5, 7) * 1;
              const date = value.substring(8, 10) * 1;
              const monthStart = value.substring(0, 8) + '01';
              const dayOfMonthStart = (new Date(monthStart)).getDay();
              yield driver.findElement(By.xpath(dateXPathHash.datepickerButton)).click(); // click on the datepicker button
              yield driver.findElement(By.xpath(dateXPathHash.yearButton)).click(); // click on the year button
              yield driver.findElement(By.xpath(dateXPathHash.year(year))).click(); // click on the specific year
              yield driver.findElement(By.xpath(dateXPathHash.monthButton)).click(); // click on the month button
              yield driver.findElement(By.xpath(dateXPathHash.month(month))).click(); // click on the specific month
              yield driver.findElement(By.xpath(dateXPathHash.date(date, dayOfMonthStart))).click(); // click on the specific date
              yield driver.findElement(By.xpath(dateXPathHash.confirmButton)).click(); // click on the datepicker confirm button
              // yield driver.findElement(By.xpath('//*[@id="1031"]/span')).click(); // click on the datepicker button
              // yield driver.findElement(By.xpath('/html/body/div[13]/div[1]/div[2]')).click(); // click on the year button
              // yield driver.findElement(By.xpath(`//*[@id="1073"]/div[${year - 1900}]`)).click(); // click on the specific year
              // yield driver.findElement(By.xpath('/html/body/div[13]/div[1]/div[4]')).click(); // click on the month button
              // yield driver.findElement(By.xpath(`//*[@id="1074"]/div[${month}]`)).click(); // click on the specific month
              // yield driver.findElement(By.xpath(`/html/body/div[13]/div[2]/div[${7 + date + dayOfMonthStart}]`)).click(); // click on the specific date
              // yield driver.findElement(By.xpath('/html/body/div[13]/div[3]/div[1]')).click(); // click on the datepicker confirm button
            } else {
              yield driver.findElement(By.xpath(xpathHash[item])).sendKeys(value);
            }
            break;
          // default:
          //   // yield driver.findElement(By.xpath(vehicleDetailsXPathHash[vehicle.mofcomRegisterType][item])).sendKeys('');
          //   yield driver.findElement(By.xpath(xpathHash[item])).sendKeys(value);
        }

      });
      console.log(roomId, '[prepare new entry] after filling in:', calculateTimeElapsed());
      const topElementXPath = topElementXPathHash[vehicle.mofcomRegisterType];
      console.log(topElementXPath);
      yield driver.executeScript(`
        var firstElement = document.evaluate('${topElementXPath}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        firstElement.scrollIntoView();
      `)
  
      yield kodakPromise(driver, 'png/03-02-after-typing-in.png');
      console.log(roomId, '[prepare new entry] after taking 03-02:', calculateTimeElapsed());

      const formElem = driver.findElement(By.xpath('//*[@id="1017"]/div'));
      const size = yield formElem.getSize();
      const location = yield formElem.getLocation();
      console.log(roomId, '[prepare new entry] after getting size and localtion of formElem:', calculateTimeElapsed());
      const screenshotBase64 = yield driver.takeScreenshot();
      console.log(roomId, '[prepare new entry] after taking screenshot:', calculateTimeElapsed());
      const buf = Buffer.from(screenshotBase64, 'base64');
      const screenshotJimp = yield Jimp.read(buf);
      const resultBase64 = yield cropPromise(screenshotJimp, location.x, location.y, size.width, size.height);
      console.log(roomId, '[prepare new entry] after cropping the screenshot:', calculateTimeElapsed());

      // const resultBase64 = yield driver.takeScreenshot()
      finishedMofcomOpsRxx.next('finishedInput');
      resolve({
        message: 'finishedInput',
        data: {resultBase64}
      })
      // return res.json({
      //   ok: true, message: 'typing in data'
      // })

    }).catch(error => reject({
      message: error
    }));



  })
}

exports.doLoginPromiseFac = (captcha, session) => {
  session.newActionRxx.next('anything');
  const roomId = session.roomId;
  const driver = session.driver;
  let latestTimestamp = Date.now();
  const calculateTimeElapsed = () => {
    const now = Date.now();
    const timeElapsed = now - latestTimestamp;
    latestTimestamp = now;
    return timeElapsed;
  }
  return new Promise((resolve, reject) => {
    co(function*() {
      const username = process.env.MOFCOM_USERNAME;
      const password = process.env.MOFCOM_PASSWORD;
      if (!username || !password) {
        throw new Error('username or password was not provided.');
      }
      yield driver.findElement(By.name('userName')).sendKeys(username);
      yield driver.findElement(By.name('id_password')).sendKeys(password);
      yield driver.findElement(By.name('identifyingCode')).sendKeys(captcha);
      console.log(roomId, '[doLogin] after inputing upc:', calculateTimeElapsed());

      yield kodakPromise(driver, 'png/02-01-before-click-submit.png');
      console.log(roomId, '[doLogin] after 02-01 png:', calculateTimeElapsed());

      yield driver.findElement(By.xpath('//*[@id="loginForm"]/div[6]/div[2]/p/input')).click();
      const currentUrlAfterSubmit = yield driver.getCurrentUrl();
      console.log(roomId, '[doLogin] after click submit and page loaded:', calculateTimeElapsed());
      console.log('currentUrlAfterSubmit', currentUrlAfterSubmit);
      if (currentUrlAfterSubmit.indexOf('loginForm.html') > -1) {
        console.log('invalid captcha')
        // get captcha again
        const closeMessageButtonXPath = '//*[@id="closeTcBox"]';
        // yield driver.wait(until.elementLocated(By.xpath(closeMessageButtonXPath)));
        yield driver.findElement(By.xpath(closeMessageButtonXPath)).click();
        console.log(roomId, '[doLogin - captcha again] after closing the warning message:', calculateTimeElapsed());
        const captchaElem = driver.findElement(By.id('identifyCode'));
        const size = yield captchaElem.getSize();
        const location = yield captchaElem.getLocation();
        console.log(roomId, '[doLogin - captcha again] after getting size and localtion of captcha:', calculateTimeElapsed());
        const screenshotBase64 = yield driver.takeScreenshot();
        console.log(roomId, '[doLogin - captcha again] after taking screenshot:', calculateTimeElapsed());
        const buf = Buffer.from(screenshotBase64, 'base64');
        const screenshotJimp = yield Jimp.read(buf);
        const captchaBase64 = yield cropPromise(screenshotJimp, location.x, location.y, size.width, size.height);
        console.log(roomId, '[doLogin - captcha again] after cropping the screenshot:', calculateTimeElapsed());
        resolve({
          message: 'invalidCaptcha',
          data: {captchaBase64}
        })
      } else {
        console.log('logged in');
        yield driver.wait(until.titleContains('商务部业务系统统一平台--汽车流通信息管理'), 60 * 1000);
        console.log(roomId, '[doLogin] after title updates:', calculateTimeElapsed());

        yield kodakPromise(driver, 'png/02-02-after-loggingin.png');
        console.log(roomId, '[doLogin] after taking 02-02.png:', calculateTimeElapsed());

        session.formUrl = yield driver.getCurrentUrl();
        console.log(roomId, '[doLogin] after another round getting current url:', calculateTimeElapsed());

        loginRxx.next('ok');
        resolve({
          message: 'loggedIn',
          data: {formUrl: session.formUrl}        
        })

      }




    }).catch(error => reject({message: error}));
  })

}


const getCaptchaPromiseFac = (session) => {
  return new Promise((resolve, reject) => {
    const roomId = session.roomId;
    const driver = session.driver;
    let latestTimestamp = Date.now();
    const calculateTimeElapsed = () => {
      const now = Date.now();
      const timeElapsed = now - latestTimestamp;
      latestTimestamp = now;
      return timeElapsed;
    }

    co(function*() {
      yield driver.get(url);
      console.log(roomId, '[get captcha] after opeing login url:', calculateTimeElapsed());
      yield driver.wait(
        until.titleContains('商务部业务系统统一平台')
      , 30 * 1000);
      console.log(roomId, '[get captcha] after seeing the title:', calculateTimeElapsed());
      const captchaElem = driver.findElement(By.id('identifyCode'));
      const size = yield captchaElem.getSize();
      const location = yield captchaElem.getLocation();
      console.log(roomId, '[get captcha] after getting size and localtion of captcha:', calculateTimeElapsed());
      const screenshotBase64 = yield driver.takeScreenshot();
      console.log(roomId, '[get captcha] after taking screenshot:', calculateTimeElapsed());
      const buf = Buffer.from(screenshotBase64, 'base64');
      const screenshotJimp = yield Jimp.read(buf);
      const captchaBase64 = yield cropPromise(screenshotJimp, location.x, location.y, size.width, size.height);
      console.log(roomId, '[get captcha] after cropping the screenshot:', calculateTimeElapsed());
      return resolve(captchaBase64)
    }).catch(error => reject(error));
  })
}



const checkLoginPromiseFac = (session) => {
  let latestTimestamp = Date.now();
  const calculateTimeElapsed = () => {
    const now = Date.now();
    const timeElapsed = now - latestTimestamp;
    latestTimestamp = now;
    return timeElapsed;
  }
  const roomId = session.roomId;
  const formUrl = session.formUrl;
  const driver = session.driver;
  return new Promise((resolve) => {
    switch (true) {
      case !formUrl:
        resolve(false);
        break;
      case (Date.now() - session.lastLoginCheckSuccessAt) <= loginCheckSuccessInterval:
        resolve(true);
        break;
      default:
        driver.get(formUrl).then(() => {
          console.log(roomId, '[check login] after trying to open formUrl', calculateTimeElapsed());
          kodakPromise(driver, 'png/0x-0x-after-getting-formUrl.png');
          const spinnerXPath = '/html/body/div[2]/img';
          driver.findElement(By.xpath(spinnerXPath))
            .then(() => {
              console.log(roomId, '[check login] after locating the spinner element', calculateTimeElapsed())
              session.lastLoginCheckSuccessAt = Date.now();
              resolve(true);
              // driver.wait(until.elementLocated(By.xpath(commonElementXPathHashes['车辆信息检索'])))
            })
            .catch((error) => {
              console.log(error);
              console.log(roomId, '[check login] after failed to locate the spinner element', calculateTimeElapsed());
              resolve(false);            
            })
      })
    }

  })
}


const driverClear = (jwt) => {
  if (drivers[jwt]) {
    drivers[jwt].quit();
    delete drivers[jwt];
    delete newActionRxxs[jwt];
  }
}

const driverInit = (jwt) => {
  driverClear(jwt);
  drivers[jwt] = new webdriver.Builder()
    .forBrowser('phantomjs')
    .build();
  newActionRxxs[jwt] = new Rx.Subject();
  const timerRx = Rx.Observable
    .timer(5 * 60 * 1000)
    .map(() => {
      if (drivers[jwt]) {
        console.log(`quitting driver for ${jwt}.`)
        driverClear(jwt);
      }
    });
  newActionRxxs[jwt]
    .switchMap(() => timerRx)
    .subscribe();

  return drivers[jwt];
}



let urlAfterLogin = '';

const handleErrorFac = (res) => {
  return (error) => {
    return res.status(500).json({
      message: error.stack
    })
  }
}

const timeOutPromise = (time) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), time)
  })
}

const cropPromise = (jimp, x, y, w, h) => {
  return new Promise((resolve, reject) => {
    jimp.crop(x, y, w, h)
      .getBuffer(Jimp.MIME_PNG, (error, buffer) => {
        if (error) reject(error);
        const captchaImgBase64 = buffer.toString('base64');
        resolve(captchaImgBase64);
      });
  })
}

const hasElementPromise = (driver, xpath) => {
  return new Promise((resolve, reject) => {
    driver.findElement(By.xpath(xpath))
      .then(() => resolve(true))
      .catch(() => resolve(false))
  })
}

const isElementVisible = (driver, xpath) => {
  return new Promise((resolve, reject) => {
    driver.findElement(By.xpath(xpath)).click()
      .then(() => resolve(true))
      .catch(() => resolve(false))
  })
}

const waitResultPromise = (dirver, untilDetail, timeout) => {
  return new Promise((resolve, reject) => {
    driver.wait(untilDetail, timeout)
      .then(() => resolve({ok: true}))
      .catch(error => resolve({ok: false, message: error}))
  })
}


const kodakPromise = (driver, fileName) => {
  if (isProduction) {return Promise.resolve('anything'); }
  return driver.takeScreenshot().then((s) => {
    fs.writeFile(fileName, s, 'base64');
  });
}


// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =


const loginRxx = new Rx.Subject();
exports.loginRxx = loginRxx;









exports.router = router;
