
const express = require('express')

const print = require('debug')('app:print')
const morgan = require('morgan')
const path = require('path')
const cookieSession = require('cookie-session')

const userRouter = require('./routers/userRouter')
const itemRouter = require('./routers/itemRouter')
const getRouter = require('./routers/getRouter')

const app = express()

app.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2'],

    // Cookie Options
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))

//setup res.body
app.use(express.json())
//key=value&key=value
app.use(express.urlencoded({ extended: true }))
//setup path prefix for static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(function (req, res, next) {
    // Website you wish to allow to connect
    res.setHeader("Access-Control-Allow-Origin", "*");
    // Request methods you wish to allow
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS, PUT, PATCH, DELETE"
    );
    // Request headers you wish to allow
    res.setHeader(
        "Access-Control-Allow-Headers",
        "X-Requested-With,content-type"
    );
    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader("Access-Control-Allow-Credentials", true);
    next();
});
//setup view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

if (app.get('env') === 'development') {
    //request logger
    app.use(morgan('tiny'))
    print('morgan is enabled');
}


app.use(userRouter)
app.use(itemRouter)
app.use(getRouter)


app.get('/', (req, res) => {

    print(req.session, "session")

    req.session.count = (req.session.count || 0) + 1
    print(req.session.count)

    // res.send('ok')
    dataUrl = "https://i.ibb.co/y0zr95x/1.png";
    return res.send(`<img src=${dataUrl}>`);

})


const port = process.env.PORT || 3000

app.listen(port, () => {
    print(process.env.PORT)
    print(`listening on port ${port}`)
})

