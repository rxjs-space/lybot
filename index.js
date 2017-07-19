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



io.on('connection', function(socket){
  socket.on('captcha', (data) => {
    console.log(data);
    const jwt = data.jwt;
    const roomId = socket.client.id;
    const captcha = data.captcha;
    // socket.join(jwt); // join a room named after the jwt
    // user Observable.interval to keep avoid the socket being killed by heroku
    Rx.Observable.interval(20 * 1000)
      .takeUntil(mofcom.loginRxx)
      .subscribe(x => io.to(roomId).emit('progressing', x));
    mofcom.loginRx(captcha, jwt)
      .take(1)
      .subscribe(
        result => io.to(roomId).emit('message', result), // emit to room(jwt) only
        error => io.to(roomId).emit('lyError', error)
      );
  })
});
server.listen(port, function() {  
  console.log('listening on port', port);
});
