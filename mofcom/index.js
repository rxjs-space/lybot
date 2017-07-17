const router = require('express').Router();
const co = require('co');
const coForEach = require('co-foreach');
const webdriver = require('selenium-webdriver');
const fs = require('fs');
const By = webdriver.By;
const until = webdriver.until;
const Jimp = require("jimp");
const Rx = require('rxjs/Rx');

const drivers = {};
const newActionRxxs = {};
const url = 'http://ecomp.mofcom.gov.cn/loginCorp.html';

const driverClear = (authHeader) => {
  if (drivers[authHeader]) {
    drivers[authHeader].quit();
    delete drivers[authHeader];
    delete newActionRxxs[authHeader];
  }
}

const driverInit = (authHeader) => {
  driverClear(authHeader);
  drivers[authHeader] = new webdriver.Builder()
    .forBrowser('phantomjs')
    .build();
  newActionRxxs[authHeader] = new Rx.Subject();
  const timerRx = Rx.Observable
    .timer(5 * 60 * 1000)
    .map(() => {
      if (drivers[authHeader]) {
        console.log(`quitting driver for ${authHeader}.`)
        driverClear(authHeader);
      }
    });
  newActionRxxs[authHeader]
    .switchMap(() => timerRx)
    .subscribe();

  return drivers[authHeader];
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

const vehicleTypeXPathHash = {
  '1': '//*[@id="1008"]/div[10]/div[1]/span', // 新建车辆
  '2': '//*[@id="1008"]/div[10]/div[2]/span', // 新建异地报废车辆
  '3': '//*[@id="1008"]/div[10]/div[3]/span', // 新建信息不全车辆
  '4': '//*[@id="1008"]/div[10]/div[4]/span', // 新建罚没车辆
}

const lastInputElementXPathHash = {
  '1': '//*[@id="1038"]/input',
  '2': '//*[@id="1038"]/input',
  '3': '//*[@id="1094"]/input',
  '4': '//*[@id="1150"]/input'
}

const vehicleDetailsXPathHash = {
  '1': {
    'owner.isPerson': '//*[@id="1047"]/input',
    'owner.name': '//*[@id="1049"]/input',
    'owner.idNo': '//*[@id="1050"]/input',
    'owner.tel': '//*[@id="1051"]/input',
    'owner.address': '//*[@id="1052"]/input',
    'owner.zipCode': '//*[@id="1053"]/input',
    'agent.name': '//*[@id="1054"]/input',
    'agent.idNo': '//*[@id="1055"]/input'
  }
}

const nonTextInputsHash = {
  '1': ['owner.isPerson']
}

// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

router.post('/new-vehicle', (req, res) => {

  const authHeader = req.headers ? req.headers['authorization'] : null;
  if (!authHeader) {
    // shall implement passport later
    return res.status(400).json({
      message: 'no authorization header provided'
    })
  }

  const driver = drivers[authHeader];

  if (!driver) {
    return res.status(400).json({
      message: 'login expired'
    });
  }

  newActionRxxs[authHeader].next('anything');

  const vehicle = req.body.vehicle;
  if (!vehicle) {
    return res.status(400).json({
      message: 'no vehicle provided.'
    });
  }

  if (!urlAfterLogin) {
    return res.status(400).json({
      message: 'not logged in.'
    })
  }


  co(function*() {
    yield driver.get(urlAfterLogin);
    const waitResult = yield waitResultPromise(driver, until.titleContains('商务部业务系统统一平台--汽车流通信息管理'), 20 * 1000);
    if (!waitResult.ok) {
      return res.status(400).json({
        message: 'loggin expired.'
      })
    }
    // yield driver.wait(
    //   until.titleContains('商务部业务系统统一平台--汽车流通信息管理')
    // , 30 * 1000);
    yield driver.takeScreenshot().then((s) => {
      fs.writeFile('png/03-01-before-typing-in.png', s, 'base64');
    });

    // const isNewVehicleVisible = yield isElementVisible(driver, '//*[@id="1008"]/div[10]/div[1]/span');
    // if (!isNewVehicleVisible) {
      yield driver.findElement(By.xpath('//*[@id="1008"]/div[9]/span')).click(); // 车辆信息检索
      yield driver.wait(until.elementLocated(By.xpath(vehicleTypeXPathHash[vehicle.mofcomRegisterType])));
      yield driver.findElement(By.xpath(vehicleTypeXPathHash[vehicle.mofcomRegisterType])).click(); // 新建车辆 by mofcomRegisterType
    // }

    yield driver.wait(until.elementLocated(By.xpath(lastInputElementXPathHash[vehicle.mofcomRegisterType]))); // until last input element is located
    
    const xpathHash = Object.assign({}, vehicleDetailsXPathHash[vehicle.mofcomRegisterType]);
    if (vehicle.owner.isPerson) {
      delete xpathHash['agent.name'];
      delete xpathHash['agent.idNo'];
    }
    const items = Object.keys(xpathHash);
    const nonTextInputs = nonTextInputsHash[vehicle.mofcomRegisterType];



    yield coForEach(items, function*(item) {
      console.log(item);
      routes = item.split('.');
      let value = vehicle[routes[0]];
      if (routes.length > 1) {
        for (let i = 1; i < routes.length; i++) {
          if (value) {
            value = value[routes[i]];
          } else {
            value = '';
            break;
          }
        }
      }
      console.log(value);
          // const result = yield driver.findElement(By.xpath(xpathHash[item])).sendKeys(value);
          // console.log(`${item}: ${result}`);

      switch (true) {
        case item === 'owner.isPerson' && !value: // if the owner is not a person
          yield driver.findElement(By.xpath(xpathHash['owner.isPerson'])).click();
          yield driver.findElement(By.xpath('//*[@id="1048"]/div[2]')).click(); // click on '否'
          // yield driver.wait(until.elementLocated(By.xpath(xpathHash['agent.name'])));
          break;
        case nonTextInputs.indexOf(item) === -1 && !!value.length:
          yield driver.findElement(By.xpath(xpathHash[item])).sendKeys(value);
          break;
        // default:
        //   // yield driver.findElement(By.xpath(vehicleDetailsXPathHash[vehicle.mofcomRegisterType][item])).sendKeys('');
        //   yield driver.findElement(By.xpath(xpathHash[item])).sendKeys(value);
      }
    });





    yield driver.takeScreenshot().then((s) => {
      fs.writeFile('png/03-02-after-typing-in.png', s, 'base64');
    });
    return res.json({
      ok: true, message: 'typing in data'
    })

  }).catch(handleErrorFac(res));
})

router.post('/login', (req, res) => {
  const authHeader = req.headers ? req.headers['authorization'] : null;
  if (!authHeader) {
    // shall implement passport later
    return res.status(400).json({
      message: 'no authorization header provided'
    })
  }

  const driver = drivers[authHeader];

  if (!driver) {
    return res.status(400).json({
      message: 'login expired'
    });
  }

  newActionRxxs[authHeader].next('anything');

  co(function*() {
    const currentUrl = yield driver.getCurrentUrl();
    if (currentUrl !== url) {
      res.status(400).json({
        message: 'driver is not at init url.'
      })
    } else {


      const captcha = req.body.captcha;
      if (!captcha) {
        res.status(400).json({
          message: 'no captcha provided.'
        });
      } else {
        const username = process.env.MOFCOM_USERNAME;
        const password = process.env.MOFCOM_PASSWORD;
        yield driver.findElement(By.name('userName')).sendKeys(username);
        yield driver.findElement(By.name('id_password')).sendKeys(password);
        yield driver.findElement(By.name('identifyingCode')).sendKeys(captcha);
        yield driver.takeScreenshot().then((s) => {
          fs.writeFile('png/02-01-before-click-submit.png', s, 'base64');
        });


        yield driver.findElement(By.xpath('//*[@id="loginForm"]/div[6]/div[2]/p/input')).click();
        console.log('submitted');
        // yield driver.wait(timeOutPromise(0.2 * 1000), 0.3 * 1000, 'holding ops after clicked on login button');

        yield driver.wait(
          until.titleContains('商务部业务系统统一平台--汽车流通信息管理')
        , 30 * 1000);
        yield driver.takeScreenshot().then((s) => {
          fs.writeFile('png/02-02-after-loggingin.png', s, 'base64');
        });
        urlAfterLogin = yield driver.getCurrentUrl();
        res.json({
          ok: true, message: 'loggedin', urlAfterLogin
        });
      }
    }
  }).catch(handleErrorFac(res));
  
})

router.post('/init', (req, res) => {
  const authHeader = req.headers ? req.headers['authorization'] : null;
  // console.log(req.headers['authorization']);
  if (!authHeader) {
    // shall implement passport later
    return res.status(400).json({
      message: 'no authorization header provided'
    })
  }
  const driver = driverInit(req.headers['authorization']);
  // driverInit();
  co(function*() {
    yield driver.get(url);
    // yield driver.takeScreenshot().then((s) => {
    //   fs.writeFile('png/01-01-after-get-init-url.png', s, 'base64');
    // });

    yield driver.wait(
      until.titleContains('商务部业务系统统一平台')
    , 30 * 1000);
    const isLoggedIn = yield hasElementPromise(driver, '//*[@id="out"]'); // this xpath pointing to the logout button
    console.log('isLoggedIn:', isLoggedIn)
    if (isLoggedIn) {
      yield driver.get(urlAfterLogin);
      yield driver.wait(
        until.titleContains('商务部业务系统统一平台--汽车流通信息管理')
      , 30 * 1000);
      // yield driver.takeScreenshot().then((s) => {
      //   fs.writeFile('png/back-to-operation-page.png', s, 'base64');
      // });

      return res.status(400).json({
        message: 'already logged in'
      })
    } else {
      const captchaElem = driver.findElement(By.id('identifyCode'));
      const size = yield captchaElem.getSize();
      const location = yield captchaElem.getLocation();

      const screenshotBase64 = yield driver.takeScreenshot();
      const buf = Buffer.from(screenshotBase64, 'base64');
      const screenshotJimp = yield Jimp.read(buf);
      const captchaBase64 = yield cropPromise(screenshotJimp, location.x, location.y, size.width, size.height);
      return res.json({
        captchaBase64
      });
    }

    // yield driver.takeScreenshot().then((s) => {
    //   fs.writeFile('png/fetching-captcha.png', s, 'base64');
    // });

    // const captchaElem = driver.findElement(By.id('identifyCode'));
    // let size, location;
    // captchaElem.getSize().then(s => size = s);
    // captchaElem.getLocation().then(l => location = l);
    // ========
    // const captchaElem = driver.findElement(By.id('identifyCode'));
    // const size = yield captchaElem.getSize();
    // const location = yield captchaElem.getLocation();

    // const screenshotBase64 = yield driver.takeScreenshot();
    // const buf = Buffer.from(screenshotBase64, 'base64');
    // const screenshotJimp = yield Jimp.read(buf);
    // const captchaImgBase64 = yield cropPromise(screenshotJimp, location.x, location.y, size.width, size.height);
    // res.send(captchaImgBase64);
    // ========
    // screenshotJimp.crop(location.x, location.y, size.width, size.height)
    //   .getBuffer(Jimp.MIME_PNG, (error, buffer) => {
    //     if (error) console.log(error);
    //     const captchaImgBase64 = buffer.toString('base64');
    //     // console.log(buffer.toString('base64'));
    //     res.send(captchaImgBase64);
    //   });

  }).catch(handleErrorFac(res));
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
