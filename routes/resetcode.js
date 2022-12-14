//express is the framework we're going to use to handle requests
const express = require('express')
const { randomResetCode } = require('../utilities/validationUtils')

//Access the connection to Heroku Database
const pool = require('../utilities').pool

const validation = require('../utilities').validation
let isStringProvided = validation.isStringProvided
const sender = process.env.EMAIL
const sendEmail = require('../utilities').sendEmail

const router = express.Router()

/**
 * @api {post} /resetcode Request send user a verification code
 * @apiName PostResetCode
 * @apiGroup resetcode
 * 
 * @apiParam {String} email a users email *unique
 * 
 * @apiParamExample {json} Request-Body-Example:
 *  {
 *      "email":"cfb3@fake.email"
 *  }
 * 
 * @apiSuccess (Success 201) {boolean} success true when email is in the database
 * @apiSuccess (Success 201) {String} email the email of the user inserted 
 * 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * 
 * @apiError (400: Email doesn't exist) {String} message "Email doesn't exist"
 *  
 * @apiError (400: Other Error) {String} message "other error, see detail"
 * @apiError (400: Other Error) {String} detail Information about th error
 * 
 */ 
router.post('/', (request, response, next) => {

    //Retrieve data from query params
    const email = request.body.email
    if(isStringProvided(email)) {
        next();
    }
}, (request, response, next) => {
    const email = request.body.email
    let theQuery = "SELECT * FROM members WHERE email=$1"
    let values = [email]
    pool.query(theQuery, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "Email not found"
                })
            } else {
                next();
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error on email check",
                error: error
            })
        })
}, (request, response) => {
        const code = randomResetCode();
        const email = request.body.email;
        let theQuery = 'UPDATE members SET resetcode =$1 WHERE email =$2'
        let values = [code, email]
        pool.query(theQuery, values)
            .then(result => {
                response.status(201).send({
                    success: true,
                    message: "successful"
                })
                // console.log(result)
                message = `Please enter the verification code in your app: ${code}`
                sendEmail(sender, request.body.email, "Reset Code", message)
            }).catch((error) => {
                response.status(400).send({
                    message: "other error, see detail",
                    detail: error.detail
                })
            })
        }
);

module.exports = router