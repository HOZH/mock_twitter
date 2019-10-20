// imports 
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const nodemailer = require("nodemailer");
const uuidv4 = require('uuid/v4');
const session = require('express-session');
const cookieParser = require('cookie-parser');

//app.use 
const app = express();
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

//view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


//database connection
var mongoose = require('mongoose');
var mongoDB = 'mongodb://127.0.0.1/my_database';
mongoose.connect(mongoDB, { useUnifiedTopology: true, useNewUrlParser: true });
var db = mongoose.connection;
//Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

//schemas 
var Schema = mongoose.Schema;
var userSchema = new Schema({
    username: String,
    email: String,
    password: String,
    uuid: String,
    active: String
});
var sessionSchema = new Schema({
    date: Date,
    sessionId: String
});

var User = mongoose.model('users', userSchema);
var sessionMaker = mongoose.model('sessions', sessionSchema);


//mailer set up
var smtpTransport = nodemailer.createTransport(({
    port: 25,
    secure: false,
    tls: {
        rejectUnauthorized: false
    }
}));
var mailOptions, host;

//set cookies?

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
    // Pass to next layer of middleware
    var cookie = req.cookies.cookieName;
    if (cookie === undefined) {
        // no: set a new cookie
        var randomNumber = Math.random().toString();
        randomNumber = randomNumber.substring(2, randomNumber.length);
        res.cookie('cookieName', randomNumber, { maxAge: 900000, httpOnly: true });
        console.log('cookie created successfully');
    }
    else {
        // yes, cookie was already present 
        // console.log('cookie exists', cookie);
    }

    next();
});

//set session

app.use(session({
    sessionId: function (req) {
        return uuidv4() // use UUIDs for session IDs
    },
    user: null,
    grid: [""],
    secret: 'keyboard cat',  // 用来对session id相关的cookie进行签名
    resave: false,  // 是否每次都重新保存会话，建议false
    saveUninitialized: true,  // 是否自动保存未初始化的会话，建议false
    start_date: null,
    cookie: {
        maxAge: 60000 // 有效期，单位是毫秒
    }
}));


// routes
app.get('/', (req, res) => {
    res.render('index');
})

app.post("/adduser", (req, res) => {
    console.log(req.body.email)
    User.find({ email: req.body.email }).then((err, data) => {
        if (data && req.body.email == data.email) {
            return res.send({ status: "ERROR" })
        }
        let token = uuidv4();
        var a = new User({
            username: req.body.username,
            email: req.body.email,
            password: req.body.password,
            uuid: token,
            active: "false"
        });
        a.save(function (err) {
            if (err) return res.send({ status: "ERROR" })
        });

        let text = 'key: <' + token + '>'
        let link = "#"
        link = "http://" + req.get('host') + "/verify/" + req.body.email + "/" + token;
        mailOptions = {
            to: req.body.email,
            subject: "Please confirm your Email account",
            html: "Hello,<br> Please Click on the link to verify your email.<br><a href=" + link + ">" + text + "</a>"
        }
        smtpTransport.sendMail(mailOptions, function (error, response) {
            if (error) {
                console.log(error);
            } else {
                res.send({ status: "OK" });
            }
        });
        let options = {
            maxAge: 1000 * 60 * 15, // would expire after 15 minutes
            httpOnly: true, // The cookie only accessible by the web server
            // signed: true // Indicates if the cookie should be signed
        }
        res.cookie("userData", a, options);
        res.send({ status: "OK" });
    });
});

app.post("/login", (req, res) => {
    var sid = req.sessionID;
    console.log("session id" + sid);
    User.findOne({ username: req.body.username, password: req.body.password }, function (err, account) {
        if (err)
            return res.send({ status: "ERROR" });
        if (!account) {
            return res.send({ status: "ERROR" });
        } else {
            if (account["active"] == "false") {
                return res.send({ status: "ERROR" });
            } else {
                if (req.user == null) {
                    req.user = account;
                    req.session.user = account;
                    sess = new sessionMaker({
                        date: new Date(),
                        sessionId: sid
                    });
                    sess.save();
                }
                else {
                }
                return res.send({ status: "OK" });
            }
        }
    });

});


app.post('/logout', (req, res) => {
    //req.session = null; // do we need this?
    return res.send({ "status": "OK" });
})

app.post('/verify', (req, res) => {
    const backDoor = "abracadabra";
    if (req.body.key == backDoor) {
        User.findOne({ email: req.body.email }, function (err, doc) {
            if (err) {
                return res.send({ status: "ERROR" })
            }
            else {
                doc["active"] = "true";
                doc.save();
                return res.send({ "status": "OK" });
            }
        });
    } else {
        User.findOne({ uuid: req.body.key }, function (err, doc) {
            if (err) {
                return res.send({ status: "ERROR" })
            }
            else {
                if (doc) {
                    doc["active"] = "true";
                    doc.save();
                    return res.send({ "status": "OK" });
                }
                else {
                    return res.send({ status: "ERROR" })
                }
            }

        });
    }

});

//server 
const port = 3000;
app.listen(port, () => {
    console.log(` listening on port ${port}`);
})