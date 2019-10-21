

const express = require('express')
const print = require('debug')('app:print')
const adduserDebugger = require('debug')('app:adduser')
const dbDebugger = require('debug')('app:db')
const morgan = require('morgan')
const nodemailer = require('nodemailer');
const uuid = require('uuid');
const Joi = require('joi')
const path = require('path')
const mongoose = require('mongoose')



const app = express()

//setup res.body
app.use(express.json())
//key=value&key=value
app.use(express.urlencoded({ extended: true }))
//setup path prefix for static files
app.use(express.static(path.join(__dirname, 'public')));
//setup view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

if (app.get('env') === 'development') {
    //request logger
    app.use(morgan('tiny'))
    print('morgan is enabled');
}


mongoose
    .connect('mongodb://127.0.0.1/hong_db').then(() => { dbDebugger('Connected to MongoDB...') })
    .catch(err => dbDebugger('could not connect to the mongodb... ', err))

const userSchema = new mongoose.Schema({

    username: String,
    email: String,
    uuid: String,
    password: String,
    active: Boolean
})

const User = mongoose.model('User', userSchema)

const smtpTransport = nodemailer.createTransport(({
    port: 25,
    secure: false,
    tls: {
        rejectUnauthorized: false
    }
}));

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
    next();
});


app.get('/', (req, res) => {

    let token ='1'
    const text = 'key: <' + token + '>'
    let link = "#"

    link = "something";
    mailOptions = {
        to: "hong1.zheng@stonybrook.edu",
        subject: "mock_twitter Please confirm your Email account",
        html: "Hello,<br> Please Click on the link to verify your email.<br><a href=" + link + ">" + text + "</a>"
    }

    smtpTransport.sendMail(mailOptions, function (error, response) {
        if (error) {
            adduserDebugger('error on sending email', error)
            // return -1
            return res.send({ status: "ERROR" })

        } else {
            // return 
            console.log(123)
            res.send({ status: "OK" })

            // return 0
        }
    });
    res.send('ok')
})

app.post('/adduser', (req, res) => {

    adduserDebugger(req.body)


    const requestError = isValidateAdduserRequest(req.body)

    if (requestError.error) {
        adduserDebugger('error on fetching user request(contents)',requestError.error.message)
        return res.status(400).send({ status: "ERROR" })


    }

    // isUsernameEmailUnique().then(isUnique => adduserDebugger('username and email are both unique =', isUnique===0))
    isUsernameEmailUnique(req.body.username, req.body.email).then(value => {

        const isUnique = value === 0
        adduserDebugger('username and email are both unique =', isUnique)

        if (!isUnique)
            return res.status(400).send({ status: "ERROR" })




        createUserAndSentEmail(req.body.username, req.body.email, req.body.password, false,req,res)





    })


    // adduserDebugger('username and email are both unique',isUnique)
    // if(!isUnique)
    //     return res.status(400).send("either username or email is not unique")



    // isUsernameEmailUnique()
    // res.send(req.body)

})












const port = process.env.PORT || 3000

app.listen(port, () => {
    console.log(process.env.PORT)
    console.log(`listening on port ${port}`)
})

//validation checkers

function isValidateAdduserRequest(request) {

    const schema = {

        username: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().required()

    }

    return Joi.validate(request, schema)
}

async function isUsernameEmailUnique(username, email) {

    
    const user = await User
        .find()
        .or([{ username: username }, { email: email }])



    dbDebugger(username,email,"record found:",  user)

    return user.length
}


//database operations
async function createUserAndSentEmail(username, email, password, active,req,res) {

    const token = uuid.v4()

    const user = new User({

        username: username,
        email: email,
        password: password,
        uuid: token,
        active: active

    })
    const result = await user.save()

    dbDebugger(result)

    // return result
    const text = 'key: <' + token + '>'
    let link = "#"
    
    link = "http://" + req.get('host') + "/verify/" + req.body.email + "/" + token;
    mailOptions = {
        to: req.body.email,
        subject: "mock_twitter Please confirm your Email account",
        html: "Hello,<br> Please Click on the link to verify your email.<br><a href=" + link + ">" + text + "</a>"
    }

    smtpTransport.sendMail(mailOptions, function (error, response) {
        if (error) {
            adduserDebugger('error on sending email', error)
            // return -1
            return res.send({status:"ERROR"})

        } else {
            return res.send({ status: "OK" })

            // return 0
        }
    });





}





