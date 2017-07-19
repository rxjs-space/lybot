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

const drivers = {};
const newActionRxxs = {};
const url = 'http://ecomp.mofcom.gov.cn/loginCorp.html';

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

const kodakPromise = (driver, fileName) => {
  if (isProduction) {return Promise.resolve('anything'); }
  return driver.takeScreenshot().then((s) => {
    fs.writeFile(fileName, s, 'base64');
  });
}


// = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

router.post('/new-vehicle', (req, res) => {

  const jwt = req.headers ? req.headers['authorization'] : null;
  if (!jwt) {
    // shall implement passport later
    return res.status(400).json({
      message: 'no authorization header provided'
    })
  }

  const driver = drivers[jwt];

  if (!driver) {
    return res.status(400).json({
      message: 'login expired'
    });
  }

  newActionRxxs[jwt].next('anything');

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
    const currentUrl = yield driver.getCurrentUrl();
    if (currentUrl !== urlAfterLogin) {
      yield driver.get(urlAfterLogin);
    }
    const waitResult = yield waitResultPromise(driver, until.titleContains('商务部业务系统统一平台--汽车流通信息管理'), 20 * 1000);
    if (!waitResult.ok) {
      return res.status(400).json({
        message: 'loggin expired.'
      })
    }
    // yield driver.wait(
    //   until.titleContains('商务部业务系统统一平台--汽车流通信息管理')
    // , 30 * 1000);
    yield kodakPromise(driver, 'png/03-01-before-typing-in.png')


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




    yield kodakPromise(driver, 'png/03-02-after-typing-in.png');

    return res.json({
      ok: true, message: 'typing in data'
    })

  }).catch(handleErrorFac(res));
})

const loginRxx = new Rx.Subject();
exports.loginRxx = loginRxx;
exports.loginRx = (captcha, jwt) => {
  const jwtLast4 = jwt.substr(-4);
  let latestTimestamp = Date.now();
  const calculateTimeElapsed = () => {
    const now = Date.now();
    const timeElapsed = now - latestTimestamp;
    latestTimestamp = now;
    return timeElapsed;
  }

  return new Rx.Observable(observer => {
    const driver = drivers[jwt];
    if (!driver) {
      observer.error('login expired');
      loginRxx.next('error');
    } else {
      newActionRxxs[jwt].next('anything');
      co(function*() {
        const currentUrl = yield driver.getCurrentUrl();
        console.log(jwtLast4, 'after getting current url:', calculateTimeElapsed());
        if (currentUrl !== url) {
          observer.error('driver is not at init url');
          loginRxx.next('error');
        } else {
          if (!captcha) {
            observer.error('no captcha provided');
            loginRxx.next('error');
          } else {
            const username = process.env.MOFCOM_USERNAME;
            const password = process.env.MOFCOM_PASSWORD;
            yield driver.findElement(By.name('userName')).sendKeys(username);
            yield driver.findElement(By.name('id_password')).sendKeys(password);
            yield driver.findElement(By.name('identifyingCode')).sendKeys(captcha);
            console.log(jwtLast4, 'after inputing upc:', calculateTimeElapsed());

            yield kodakPromise(driver, 'png/02-01-before-click-submit.png');
            console.log(jwtLast4, 'after 02-01 png:', calculateTimeElapsed());


            yield driver.findElement(By.xpath('//*[@id="loginForm"]/div[6]/div[2]/p/input')).click();
            console.log(jwtLast4, 'after click submit:', calculateTimeElapsed());

            console.log('submitted');

            yield driver.wait(
              until.titleContains('商务部业务系统统一平台--汽车流通信息管理')
            , 30 * 1000);
            console.log(jwtLast4, 'after title updates:', calculateTimeElapsed());

            yield kodakPromise(driver, 'png/02-02-after-loggingin.png');
            console.log(jwtLast4, 'after taking 02-02.png:', calculateTimeElapsed());


            urlAfterLogin = yield driver.getCurrentUrl();
            console.log(jwtLast4, 'after another round getting current url:', calculateTimeElapsed());

            loginRxx.next('ok');
            observer.next({
              ok: true, message: 'logged in', urlAfterLogin
            });
          }
        }
      }).catch(error => {
        observer.error(error);
      });
    }
  })
}



router.post('/login', (req, res) => {
  const jwt = req.headers ? req.headers['authorization'].substring(7) : null;
  if (!jwt) {
    // shall implement passport later
    return res.status(400).json({
      message: 'no authorization header provided'
    })
  }

  const driver = drivers[jwt];

  if (!driver) {
    return res.status(400).json({
      message: 'login expired'
    });
  }

  newActionRxxs[jwt].next('anything');

  co(function*() {
    const currentUrl = yield driver.getCurrentUrl();
    if (currentUrl !== url) {
      res.status(400).json({
        message: 'driver is not at init url.'
      })
    } else {


      const captcha = req.body.captcha;
      if (!captcha) {
        return res.status(400).json({
          message: 'no captcha provided.'
        });
      } else {
        const username = process.env.MOFCOM_USERNAME;
        const password = process.env.MOFCOM_PASSWORD;
        yield driver.findElement(By.name('userName')).sendKeys(username);
        yield driver.findElement(By.name('id_password')).sendKeys(password);
        yield driver.findElement(By.name('identifyingCode')).sendKeys(captcha);
        yield kodakPromise(driver, 'png/02-01-before-click-submit.png');
        // yield driver.takeScreenshot().then((s) => {
        //   fs.writeFile('png/02-01-before-click-submit.png', s, 'base64');
        // });


        yield driver.findElement(By.xpath('//*[@id="loginForm"]/div[6]/div[2]/p/input')).click();
        console.log('submitted');
        res.write('submitted');
        // yield driver.wait(timeOutPromise(0.2 * 1000), 0.3 * 1000, 'holding ops after clicked on login button');

        yield driver.wait(
          until.titleContains('商务部业务系统统一平台--汽车流通信息管理')
        , 30 * 1000);
        yield kodakPromise(driver, 'png/02-02-after-loggingin.png');

        urlAfterLogin = yield driver.getCurrentUrl();
        res.write('logged in');
        res.end();
        // res.json({
        //   ok: true, message: 'logged in', urlAfterLogin
        // });
      }
    }
  }).catch(handleErrorFac(res));
  
})

router.post('/init', (req, res) => {
  const jwt = req.headers ? req.headers['authorization'].substring(7) : null;
  const jwtLast4 = jwt.substr(-4);
  let latestTimestamp = Date.now();
  const calculateTimeElapsed = () => {
    const now = Date.now();
    const timeElapsed = now - latestTimestamp;
    latestTimestamp = now;
    return timeElapsed;
  }
  if (!jwt) {
    // shall implement passport later
    return res.status(400).json({
      message: 'no authorization header provided'
    })
  }
  const driver = driverInit(jwt);
  console.log(jwtLast4, 'after driver init:', calculateTimeElapsed());
  // driverInit();
  co(function*() {
    yield driver.get(url);
    console.log(jwtLast4, 'after opeing login url:', calculateTimeElapsed());
    yield driver.wait(
      until.titleContains('商务部业务系统统一平台')
    , 30 * 1000);
    console.log(jwtLast4, 'after seeing the title:', calculateTimeElapsed());
    const captchaElem = driver.findElement(By.id('identifyCode'));
    const size = yield captchaElem.getSize();
    const location = yield captchaElem.getLocation();
    console.log(jwtLast4, 'after getting size and localtion of captcha:', calculateTimeElapsed());
    const screenshotBase64 = yield driver.takeScreenshot();
    console.log(jwtLast4, 'after taking screenshot:', calculateTimeElapsed());
    const buf = Buffer.from(screenshotBase64, 'base64');
    const screenshotJimp = yield Jimp.read(buf);
    const captchaBase64 = yield cropPromise(screenshotJimp, location.x, location.y, size.width, size.height);
    console.log(jwtLast4, 'after cropping the screenshot:', calculateTimeElapsed());
    return res.json({
      captchaBase64
    });
    


  }).catch(handleErrorFac(res));


});

exports.router = router;
