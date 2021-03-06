// how to build a heroku buildpack to support Chinese?

const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const bodyParser = require('body-parser');
const cors = require('cors');
const Rx = require('rxjs/Rx');

const morgan = require('morgan')
const port = process.env.PORT || 3002;

const mofcom = require('./mofcom');

app.use(morgan('combined'))
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// app.use(myPassport.initialize());

app.get('/', (req, res) => {
  res.send('welcome!');
})
app.use('/mofcom', mofcom.router);

// app.listen(port, function() {  
//   console.log('listening on port', port);
// });


const mofcomNS = io.of('/mofcom');
mofcomNS.on('connection', function(socket){
  const roomId = socket.client.id; // the defaultRoom's id is set by socket.io
  socket.join(roomId);
  socket.on('message', (data) => {
    console.log('receiving message on', new Date(), data)
    const jwt = data.jwt;
    let session = mofcom.mofcomSessions[roomId];
    // console.log(session);
    if (!session) {
      session = mofcom.mofcomSessions[roomId] = mofcom.mofcomNewSession(roomId);
    }
    // console.log(session.roomId);

    switch (true) {
      case data.bot === 'mofcom' && data.action === 'newEntry':
        const vehicle = data.data.vehicle;
        console.log(vehicle.vin);
        mofcom.newEntryPromiseFac(vehicle, jwt, session)
          .then(result => {
            // console.log(result);
            mofcomNS.to(roomId).send({
              by: 'newEntryPromiseFac',
              ok: true,
              message: result.message,
              data: result.data
            });
          })
          .catch(error => {
            console.log(error);
            mofcomNS.to(roomId).send({
              by: 'newEntryPromiseFac',
              ok: false,
              message: typeof error.message === 'string' ? error.message : JSON.stringify(error.message),
              data: error.data // error.data = {captchaBase64}
            });
            // if (typeof error.message === 'string' && error.message.indexOf('notLoggedIn') > -1) {
            //   console.log('prepared to send captcha');
            //   // socket.emit('message', {
            //   //   by: 'newEntryPromiseFac',
            //   //   ok: false,
            //   //   message: error.message,
            //   //   data: error.data // error.data = {captchaBase64}
            //   // });
            //   mofcomNS.to(roomId).send({
            //     by: 'newEntryPromiseFac',
            //     ok: false,
            //     message: error.message,
            //     data: error.data // error.data = {captchaBase64}
            //   });
            // }
          })
        break;
      case data.bot === 'mofcom' && data.action === 'login':
        const captcha = data.data.captcha;
        mofcom.doLoginPromiseFac(captcha, session)
          .then(result => {
            // console.log(result);
            mofcomNS.to(roomId).send({
              by: 'doLoginPromiseFac',
              ok: true,
              message: result.message,
              data: result.data // result.data = {formUrl}
            });
          })
          .catch(error => console.log(error))
        break;
      case data.bot === 'mofcom' && data.action === 'newEntryAgain':
        mofcom.newEntryAgainPromiseFac(session)
          .then(result => {
            // console.log(result);
            mofcomNS.to(roomId).send({
              by: 'newEntryAgainPromiseFac',
              ok: true,
              message: result.message,
              data: result.data
            });
          })
          .catch(error => {
            console.log(error);
            mofcomNS.to(roomId).send({
              by: 'newEntryAgainPromiseFac',
              ok: false,
              message: typeof error.message === 'string' ? error.message : JSON.stringify(error.message),
              data: error.data // error.data = {captchaBase64}
            });

            // if (typeof error.message === 'string' && error.message.indexOf('notLoggedIn') > -1) {
            //   mofcomNS.to(roomId).send({
            //     by: 'newEntryAgainPromiseFac',
            //     ok: false,
            //     message: error.message,
            //     data: error.data // error.data = {captchaBase64}
            //   });
            // }
          })  

        break;
      case data.bot === 'mofcom' && data.action === 'submit':
        mofcom.submitNewEntryPromiseFac(session)
          .then(result => {
              mofcomNS.to(roomId).send({
                by: 'submitNewEntryPromiseFac',
                ok: true,
                message: result.message,
                data: result.data
              });
          })
          .catch(error => {
              console.log(error);
              if (typeof error.message === 'string') {
                mofcomNS.to(roomId).send({
                  by: 'submitNewEntryPromiseFac',
                  ok: false,
                  message: error.message,
                  data: error.data
                });
              }
          })
        break;
    }
    
    Rx.Observable.interval(6 * 1000)
      .take(50)
      .takeUntil(mofcom.finishedMofcomOpsRxx)
      .subscribe(x => mofcomNS.to(roomId).emit('mofcomProgressing', x));

    // mofcom.mofcomNewEntryRxFac(vehicle, jwt, session)
    //   .subscribe(result => {
    //     if (result.message.indexOf('not logged in') > -1) {

    //     }
    //   })
    // mofcom.mofcomActionsRxx.next({action: 'mofcomEntry', data: {jwt, vehicle}});
    // mofcom.mofcomResultRxx.subscribe(console.log);

  });

  socket.on('disconnect', () => {
    const roomId = socket.client.id;
    // do some unsubscriptions

    if (mofcom.mofcomSessions[roomId] && mofcom.mofcomSessions[roomId].driver) {
      console.log(`${new Date()}: session for ${roomId} is now cleared after client disconnected.`)
      mofcom.mofcomSessions[roomId].driver.quit();
      delete mofcom.mofcomSessions[roomId];
    } else {
      console.log(`${new Date()}: session for ${roomId} was cleared somewhere else.`)
    }


  })


  socket.on('captcha', (data) => {
    console.log(data);
    const jwt = data.jwt;
    const roomId = socket.client.id; // the defaultRoom's id is set by socket.io
    const captcha = data.captcha;
    // user Observable.interval to keep avoid the socket being killed by heroku
    Rx.Observable.interval(20 * 1000)
      .takeUntil(mofcom.loginRxx)
      .subscribe(x => mofcomNS.to(roomId).emit('progressing', x));
    mofcom.loginRx(captcha, jwt)
      .take(1)
      .subscribe(
        result => mofcomNS.to(roomId).send(result), // .send method will emit 'message' event
        error => mofcomNS.to(roomId).emit('lyError', error)
      );
  })
});

if (process.env.MOFCOM_USERNAME && process.env.MOFCOM_PASSWORD) {
  server.listen(port, function() {  
    console.log('listening on port', port);
  });  
} else {
  throw new Error('mofcom account info missing');
}
