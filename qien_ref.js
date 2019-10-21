const Joi = require("joi");
const nodemailer = require("nodemailer");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
var dateFormat = require("dateformat");
var path = require("path");
const jwt = require('jsonwebtoken');
const request = require('request')
const uuidv4 = require('uuid/v4');
var session = require('express-session');
let cookieParser = require('cookie-parser');
app.use(cookieParser());
//Import the mongoose module
var mongoose = require('mongoose');
//Set up default mongoose connection
var mongoDB = 'mongodb://127.0.0.1/my_database';
// mongoose.connect(mongoDB, { useNewUrlParser: true });
mongoose.connect(mongoDB, { useUnifiedTopology: true, useNewUrlParser: true });
//Get the default connection
var db = mongoose.connection;
//Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
var Schema = mongoose.Schema;
var userSchema = new Schema({
    username: String,
    email: String,
    password: String,
    uuid: String,
    active: String
});
var gameSchema = new Schema({
    id: String,
    start_date: String,
    user: {}
});
var historySchema = new Schema({
    id: String,
    grid: [""],
    winner: String,
});
var playerSchema = new Schema({
    human: Number,
    wopr: Number,
    tie: Number,
    email: String
});

var sessionSchema = new Schema({
    grid: [""],
    date: Date,
    sessionId: String
});


var User = mongoose.model('users', userSchema);
var Game = mongoose.model('games', gameSchema);
var History = mongoose.model('historys', historySchema);
var Play = mongoose.model('plays', playerSchema);
var sessionMaker = mongoose.model('sessions', sessionSchema);

var smtpTransport = nodemailer.createTransport(({
    port: 25,
    secure: false,
    tls: {
        rejectUnauthorized: false
    }
}));
var mailOptions, host;
// Create application/json parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(__dirname + '/public'));
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

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const winCases = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];



app.get("/ttt/", (req, res) => {
    console.log('Cookies: ', req.cookies)
    // Cookies that have been signed
    console.log('Signed Cookies: ', req.signedCookies)
    res.render("login");
});
app.get("/ttt/signup", (req, res) => {
    res.render("signup");
});
app.get("/ttt/login", (req, res) => {
    res.render("login");
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
                    console.log("req.user" + req.user);
                    console.log("req.session.user" + req.session.user);
                    console.log("new session");
                    req.user = account;
                    req.session.user = account;
                    req.session.grid = [" ", " ", " ", " ", " ", " ", " ", " ", " "];
                    sess = new sessionMaker({
                        // user: req.session.user,
                        grid: req.session.grid,
                        date: new Date(),
                        sessionId: sid
                    });
                    sess.save();
                    score = new Play({
                        human: 0,
                        wopr: 0,
                        tie: 0,
                        email: account.email
                    });
                    score.save();
                    console.log("xxxxxxxxxxxxxxxxxxxxxxxx");

                    console.log("req.user" + req.user);
                    console.log("req.session.user" + req.session.user);
                    console.log("xxxxxxxxxxxxxxxxxxxxxxxx");
                }
                else {
                    console.log("****************");
                    console.log("session exist");
                    console.log("****************");
                }
                return res.send({ status: "OK" });
            }
        }
    });

});

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

        // score = new Play({
        //   human: 0,
        //   wopr: 0,
        //   tie: 0,
        //   user: a
        // });
        // score.save();
        let text = 'key: <' + token + '>'
        let link = "#"
        link = "http://" + req.get('host') + "/verify/" + req.body.email + "/" + token;
        mailOptions = {
            to: req.body.email,
            subject: "qien Please confirm your Email account",
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

app.post('/logout', (req, res) => {
    // req.session.destroy();
    req.session = null;
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

app.post("/listgames", (req, res) => {
    console.log("list game of " + req.session.user);
    console.log("list game of " + req.session.user.username);
    Game.find({ user: req.session.user }, function (err, game) {
        if (err)
            return res.send({ status: "ERROR" })
        if (game) {
            console.log(game)
            res.send({ status: "OK", games: game })
        }
        else {
            return res.send({ status: "ERROR" })
        }
    });
});

app.post("/getgame", (req, res) => {
    let gameid = req.body.id;
    console.log("get game : " + gameid);
    History.findOne({ id: gameid }, function (err, game) {
        if (game) {
            res.send({ status: "OK", grid: game.grid, winner: game.winner })
        }
        else {
            return res.send({ status: "ERROR" })
        }
    });

});
app.post("/getscore", (req, res) => {
    console.log("getscore:" + req.session.user.username)
    Play.findOne({ email: req.session.user.email }, function (err, game) {
        console.log("human: " + game);
        // console.log("human: " + game.human);
        // console.log("wopr: " + game.wopr);
        // console.log("tie: " + game.tie);
        console.log("err" + err)
        if (err)
            return res.send({ status: "ERROR" })
        if (game) {

            res.send({ status: "OK", human: game.human, wopr: game.wopr, tie: game.tie })
        }
        else {
            return res.send({ status: "ERROR" })
        }
    });

});


app.post("/ttt/play", (req, res) => {
    move = req.body.move;
    grid = req.session.grid;
    if (req.session.grid == undefined) {
        sessionMaker.findOne({ sessionId: req.sessionID }, function (err, temp_session) {
            if (err)
                return res.send({ status: "ERROR" });
            if (temp_session) {
                grid = temp_session.grid;
                req.session.start_date = temp_session.date;
            }
            else {
                return res.send({ status: "ERROR" });
            }
        });
    } else {
        // console.log("move:" + move)
        // console.log("grid:" + grid)
        console.log("sessionID:" + req.sessionID)
        // console.log("sessionUser:" + req.session.user)
        // console.log("sessionGrid:" + req.session.grid)
        // console.log("sessionDate:" + req.session.start_date)

        console.log("username: " + req.session.user.username);
        console.log("password: " + req.session.user.password);
        console.log("uuid: " + req.session.user.uuid);
        console.log("email: " + req.session.user.email);

        if (move == null)
            return res.send({ grid: grid });
        else {
            grid[move] = "X";
            let who = checkWin(grid);
            if (who == "Continue") {
                temp = grid.indexOf(" ");
                grid[temp] = "O";
                let who2 = checkWin(grid);
                if (who2 == "Continue") {
                    return res.send({ grid: grid });
                } else {
                    game_id = uuidv4();
                    game = new Game({
                        id: game_id,
                        start_date: req.session.start_date,
                        user: req.session.user
                    })
                    game.save();

                    gameHistory = new History({
                        id: game_id,
                        grid: grid,
                        winner: who2
                    })
                    gameHistory.save();

                    Play.findOne({ email: req.session.user.email }, function (err, PlayScore) {
                        if (err)
                            return res.send({ status: "ERROR" });
                        if (PlayScore) {
                            if (who2 == "X") {
                                PlayScore.human = PlayScore.human + 1;
                            }
                            else if (who2 == "O") {
                                PlayScore.wopr = PlayScore.wopr + 1;
                            } else if (who2 == " ") {
                                PlayScore.tie = PlayScore.tie + 1;

                            }
                            PlayScore.save();
                            console.log("username: " + req.session.user.username)
                            console.log("human: " + PlayScore.human)
                            console.log("pc: " + PlayScore.wopr)
                            console.log("tie: " + PlayScore.tie)
                        } else {
                            console.log("No history find: ")
                            // return res.send({ status: "ERROR" });
                        }

                    });
                    return res.send({ grid: grid, winner: who2 });

                }
            } else {
                game_id = uuidv4();
                game = new Game({
                    id: game_id,
                    start_date: req.session.start_date,
                    user: req.session.user
                });
                game.save();
                gameHistory = new History({
                    id: game_id,
                    grid: grid,
                    winner: who
                })
                gameHistory.save();
                Play.findOne({ email: req.session.user.email }, function (err, PlayScore) {
                    if (err)
                        return res.send({ status: "ERROR" });
                    if (PlayScore) {
                        if (who == "X") {
                            PlayScore.human = PlayScore.human + 1;

                        }
                        else if (who == "O") {
                            PlayScore.wopr = PlayScore.wopr + 1;


                        } else if (who == " ") {
                            PlayScore.tie = PlayScore.tie + 1;

                        }
                        PlayScore.save();
                        console.log("username: " + req.session.user.username)
                        console.log("human: " + PlayScore.human)
                        console.log("pc: " + PlayScore.wopr)
                        console.log("tie: " + PlayScore.tie)
                    } else {
                        console.log("No history find: ")
                        // return res.send({ status: "ERROR" });

                    }

                });
                return res.send({ grid: grid, winner: who });
            }
        }
    }
});

function checkWin(grid) {
    for (let i = 0; i < winCases.length; i++) {
        if (
            grid[winCases[i][0]] == "X" &&
            grid[winCases[i][1]] == "X" &&
            grid[winCases[i][2]] == "X"
        ) {
            return "X";
        } else {
            if (
                grid[winCases[i][0]] == "O" &&
                grid[winCases[i][1]] == "O" &&
                grid[winCases[i][2]] == "O"
            ) {
                return "O";
            }
        }
    }
    let sum = 0;
    for (let count = 0; count < grid.length; count++) {
        if (grid[count] == "O" || grid[count] == "X") {
            sum += 1;
        }
    }
    if (sum < 9) {
        return "Continue";
    }
    return " ";
}
// PORT
const port = 80;
app.listen(port, () => console.log(`Listening  on port ${port}...`));
// sessionStore.destroy(result.session, function () {
//   User.update({ _id: result._id }, { $set: { "session": sid } });
// })