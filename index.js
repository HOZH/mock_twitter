const express = require('express')
const print = require('debug')('app:print')
const adduserDebugger = require('debug')('app:adduser')
const loginDebugger = require('debug')('app:login')
const verifyDebugger = require('debug')('app:verify')
const getitemDebugger = require('debug')('app:getitem')
const additemDebugger = require('debug')('app:additem')
const searchitemDebugger = require('debug')('app:searchitem')
const morgan = require('morgan')
const nodemailer = require('nodemailer');
const uuid = require('uuid');
const Joi = require('joi')
const path = require('path')
const cookieSession = require('cookie-session')




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

const db = require('./db')
const User = db.User
const Item = db.Item


const smtpTransport = nodemailer.createTransport(({
    port: 25,
    secure: false,
    tls: {
        rejectUnauthorized: false
    }
}));




app.get('/', (req, res) => {

    print(res.session)
    loginDebugger(req.session, "session")

    req.session.count = (req.session.count || 0) + 1
    loginDebugger(req.session.count)

    res.send('ok')
})

app.post('/adduser', (req, res) => {


    addUser(req, res)

})


app.post('/verify', (req, res) => {
    activateUser(req, res)
})

app.post('/login', (req, res) => {
    loginUser(req, res)
})

app.post('/logout', (req, res) => {
    req.session = null
    res.send({ status: "OK" })
})

app.post('/additem', (req, res) => {
    addItem(req, res)
})

app.get('/item/:itemID', (req, res) => {
    getItem(req, res)
})

app.post('/search', (req, res) => {
    searchItem(req, res)
})

const port = process.env.PORT || 3000

app.listen(port, () => {
    console.log(process.env.PORT)
    console.log(`listening on port ${port}`)
})

//validation checkers
function isValidateAdduserRequest(req) {

    const schema = {

        username: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().required()

    }

    return Joi.validate(req.body, schema)
}

async function isUsernameEmailUnique(username, email) {

    const user = await User
        .find()
        .or([{ username: username }, { email: email }])

    adduserDebugger(username, email, "record found:", user)

    return user.length
}


//database operations
async function createUserAndSentEmail(username, email, password, active, req, res) {

    const token = uuid.v4()

    const user = new User({

        username: username,
        email: email,
        password: password,
        uuid: token,
        active: active

    })
    const result = await user.save()

    adduserDebugger(result)

    // return result
    const text = 'key: <' + token + '>'
    let link = "#"

    link = "http://" + req.get('host') + "/verify/" + req.body.email + "/" + token;
    mailOptions = {
        to: req.body.email,
        subject: "mock_twitter Please confirm your Email account",
        html: text
    }

    smtpTransport.sendMail(mailOptions, function (error, response) {
        if (error) {
            adduserDebugger('error on sending email', error)
            // return -1
            return res.send({ status: "error" })

        } else {
            return res.send({ status: "OK" })

            // return 0
        }
    });
}

function addUser(req, res) {
    const requestError = isValidateAdduserRequest(req)

    if (requestError.error) {
        adduserDebugger('error on fetching user request(contents)', requestError.error.message)
        return res.send({ status: "error" })
    }

    isUsernameEmailUnique(req.body.username, req.body.email).then(value => {

        const isUnique = value === 0
        adduserDebugger('username and email are both unique =', isUnique)

        if (!isUnique)
            return res.send({ status: "error" })

        createUserAndSentEmail(req.body.username, req.body.email, req.body.password, false, req, res)

    })
}

async function activateUser(req, res) {

    verifyDebugger(req.body)
    const user = await User.findOneAndUpdate({ uuid: req.body.key, email: req.body.email },
        {
            $set: {
                active: true
            }

        }, { new: true })
    verifyDebugger(user)
    if (user)
        return res.send({ status: "OK" })

    verifyDebugger("something went wrong when update active property")
    return res.send({ status: "error" })

}

async function loginUser(req, res) {

    loginDebugger(req.body)
    const user = await User.findOne({ username: req.body.username, password: req.body.password })

    loginDebugger(user)

    if (user)

        if (user.active) {

            loginDebugger("log in performed")
            req.session.isLogin = true
            req.session.username = req.body.username
            return res.send({ status: "OK" })

        }

    loginDebugger('fail to log in', user ? "current account has not been enabled" : "username/password does not match record on the server")
    req.session = null
    return res.send({ status: "error" })

}

async function addItem(req, res) {

    if (false === (req.session.username || false)) {
        additemDebugger('need to login first')
        return res.send({ status: "error", error: 'just stop asking' })
    }

    if (!req.body['content']) {

        additemDebugger('empty content')
        return res.send({ status: "error", error: 'empty content' })

    }

    const childType = req.body.childType

    if (childType !== 'retweet' && childType !== 'reply' && childType !== null) {
        additemDebugger('wrong child type')
        return res.send({ status: "error", error: 'wrong childType' })

    }

    const token = uuid.v4()

    const item = new Item({
        id: token,
        username: req.session.username,
        property: { likes: 0 },
        retweeted: 0,
        content: req.body.content,

    })
    additemDebugger("saving item")

    const result = await item.save()

    additemDebugger("~~~~~printing result~~~~~~~:", result)

    return res.send({ status: 'OK', id: token })

}

async function getItem(req, res) {
    id = req.params.itemID;
    getitemDebugger(req.body);
    const item = await Item.findOne({ id: id })
    getitemDebugger(item)
    if (item) {
        return res.send({
            status: "OK",
            item: item
        })
    }
    return res.send({ status: "error", error: "item not found" })
}

async function searchItem(req, res) {
    searchitemDebugger("in function searching items");
    searchitemDebugger("req.body = ", req.body)
    timestamp = (req.body.timestamp || Date.now() / 1000);
    searchitemDebugger("time stamp is: ", timestamp);
    limit = (req.body.limit || 25);
    searchitemDebugger("limit is: ", limit);
    const items = await Item.find({ timestamp: { $lte: timestamp } }).limit(limit)
    let result = []
    if (items) {
        for (let i = 0; i < items.length; i++) {
            searchitemDebugger("items : ", i, "tsp: ", items[i].timestamp)

            result.push(items[i])
        }

        searchitemDebugger("returning items with ok")
        searchitemDebugger("result: ", result)
        return res.send({ status: "OK", items: result })
    }

    searchitemDebugger("items not found, error")
    return res.send({
        status: "error",
        error: "items not found"
    })


}


