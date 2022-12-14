//express is the framework we're going to use to handle requests
const express = require('express')

//Access the connection to Heroku Database
const pool = require('../utilities/exports').pool

const router = express.Router()

const validation = require('../utilities').validation
let isStringProvided = validation.isStringProvided


/**
 * @api {post} /chats Request to add a chat
 * @apiName PostChats
 * @apiGroup Chats
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * @apiParam {String} name the name for the chat
 * 
 * @apiSuccess (Success 201) {boolean} success true when the name is inserted
 * @apiSuccess (Success 201) {Number} chatId the generated chatId
 * 
 * @apiError (400: Unknown user) {String} message "unknown email address"
 * 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 * @apiError (400: Unknown Chat ID) {String} message "invalid chat id"
 * 
 */ 
router.post("/", (request, response, next) => {
    if (!isStringProvided(request.body.name)) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else {
        next()
    }
}, (request, response) => {

    let insert = `INSERT INTO Chats(Name)
                  VALUES ($1)
                  RETURNING ChatId`
    let values = [request.body.name]
    pool.query(insert, values)
        .then(result => {
            response.send({
                success: true,
                chatID:result.rows[0].chatid
            })
        }).catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })

        })
})

/**
 * @api {put} /chats/:chatId? Request add a user to a chat
 * @apiName PutChats
 * @apiGroup Chats
 * 
 * @apiDescription Adds the user associated with the required JWT. 
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiParam {Number} chatId the chat to add the user to
 * 
 * @apiSuccess {boolean} success true when the name is inserted
 * 
 * @apiError (404: Chat Not Found) {String} message "chatID not found"
 * @apiError (404: Email Not Found) {String} message "email not found"
 * @apiError (400: Invalid Parameter) {String} message "Malformed parameter. chatId must be a number" 
 * @apiError (400: Duplicate Email) {String} message "user already joined"
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 */ 
router.put("/:chatId/", (request, response, next) => {
    //validate on empty parameters
    if (!request.params.chatId) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else if (isNaN(request.params.chatId)) {
        response.status(400).send({
            message: "Malformed parameter. chatId must be a number"
        })
    } else {
        next()
    }
}, (request, response, next) => {
    //validate chat id exists
    let query = 'SELECT * FROM CHATS WHERE ChatId=$1'
    let values = [request.params.chatId]

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "Chat ID not found"
                })
            } else {
                next()
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            })
        })
        //code here based on the results of the query
}, (request, response, next) => {
    //validate email exists 
    let query = 'SELECT * FROM Members WHERE MemberId=$1'
    let values = [request.decoded.memberid]

console.log(request.decoded)

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "email not found"
                })
            } else {
                //user found
                next()
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            })
        })
}, (request, response, next) => {
        //validate email does not already exist in the chat
        let query = 'SELECT * FROM ChatMembers WHERE ChatId=$1 AND MemberId=$2'
        let values = [request.params.chatId, request.decoded.memberid]
    
        pool.query(query, values)
            .then(result => {
                if (result.rowCount > 0) {
                    response.status(400).send({
                        message: "user already joined"
                    })
                } else {
                    next()
                }
            }).catch(error => {
                response.status(400).send({
                    message: "SQL Error",
                    error: error
                })
            })

}, (request, response) => {
    //Insert the memberId into the chat
    let insert = `INSERT INTO ChatMembers(ChatId, MemberId)
                  VALUES ($1, $2)
                  RETURNING *`
    let values = [request.params.chatId, request.decoded.memberid]
    pool.query(insert, values)
        .then(result => {
            response.send({
                success: true
            })
        }).catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })
        })
    }
)

/**
 * @api {get} /chats/:chatId? Request to get the emails of user in a chat
 * @apiName GetChats
 * @apiGroup Chats
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiParam {Number} chatId the chat to look up. 
 * 
 * @apiSuccess {Number} rowCount the number of messages returned
 * @apiSuccess {Object[]} members List of members in the chat
 * @apiSuccess {String} messages.email The email for the member in the chat
 * 
 * @apiError (404: ChatId Not Found) {String} message "Chat ID Not Found"
 * @apiError (400: Invalid Parameter) {String} message "Malformed parameter. chatId must be a number" 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 */ 
router.get("/:chatId", (request, response, next) => {
    //validate on missing or invalid (type) parameters
    if (!request.params.chatId) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else if (isNaN(request.params.chatId)) {
        response.status(400).send({
            message: "Malformed parameter. chatId must be a number"
        })
    } else {
        next()
    }
},  (request, response, next) => {
    //validate chat id exists
    let query = 'SELECT * FROM CHATS WHERE ChatId=$1'
    let values = [request.params.chatId]

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "Chat ID not found"
                })
            } else {
                next()
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            })
        })
    }, (request, response) => {
        //Retrieve the members
        let query = `SELECT Members.Email 
                    FROM ChatMembers
                    INNER JOIN Members ON ChatMembers.MemberId=Members.MemberId
                    WHERE ChatId=$1`
        let values = [request.params.chatId]
        pool.query(query, values)
            .then(result => {
                response.send({
                    rowCount : result.rowCount,
                    rows: result.rows
                })
            }).catch(err => {
                response.status(400).send({
                    message: "SQL Error",
                    error: err
                })
            })
});

/**
 * @api {delete} /chats/:chatId?/:email? Request delete a user from a chat
 * @apiName DeleteChats
 * @apiGroup Chats
 * 
 * @apiDescription Does not delete the user associated with the required JWT but 
 * instead deletes the user based on the email parameter.  
 * 
 * @apiParam {Number} chatId the chat to delete the user from
 * @apiParam {String} email the email of the user to delete
 * 
 * @apiSuccess {boolean} success true when the name is deleted
 * 
 * @apiError (404: Chat Not Found) {String} message "chatID not found"
 * @apiError (404: Email Not Found) {String} message "email not found"
 * @apiError (400: Invalid Parameter) {String} message "Malformed parameter. chatId must be a number" 
 * @apiError (400: Duplicate Email) {String} message "user not in chat"
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 */ 
router.delete("/:chatId/:email", (request, response, next) => {
    //validate on empty parameters
    if (!request.params.chatId || !request.params.email) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else if (isNaN(request.params.chatId)) {
        response.status(400).send({
            message: "Malformed parameter. chatId must be a number"
        })
    } else {
        next()
    }
}, (request, response, next) => {
    //validate chat id exists
    let query = 'SELECT * FROM CHATS WHERE ChatId=$1'
    let values = [request.params.chatId]

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "Chat ID not found"
                })
            } else {
                next()
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            })
        })
}, (request, response, next) => {
    //validate email exists AND convert it to the associated memberId
    let query = 'SELECT MemberID FROM Members WHERE Email=$1'
    let values = [request.params.email]

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "email not found"
                })
            } else {
                request.params.email = result.rows[0].memberid
                next()
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            })
        })
}, (request, response, next) => {
        //validate email exists in the chat
        let query = 'SELECT * FROM ChatMembers WHERE ChatId=$1 AND MemberId=$2'
        let values = [request.params.chatId, request.params.email]
    
        pool.query(query, values)
            .then(result => {
                if (result.rowCount > 0) {
                    next()
                } else {
                    response.status(400).send({
                        message: "user not in chat"
                    })
                }
            }).catch(error => {
                response.status(400).send({
                    message: "SQL Error",
                    error: error
                })
            })

}, (request, response) => {
    //Delete the memberId from the chat
    let insert = `DELETE FROM ChatMembers
                  WHERE ChatId=$1
                  AND MemberId=$2
                  RETURNING *`
    let values = [request.params.chatId, request.params.email]
    pool.query(insert, values)
        .then(result => {
            response.send({
                success: true
            })
        }).catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })
        })
    }
)

/**
 * @api {delete} /chats/:chatId? Request delete a user from a chat
 * @apiName DeleteChats
 * @apiGroup Chats
 * 
 * @apiDescription Delete the user associated with the required JWT from the chatId given.  
 * 
 * @apiParam {Number} chatId the chat to delete the user from
 * 
 * @apiSuccess {boolean} success true when the name is deleted
 * 
 * @apiError (404: Chat Not Found) {String} message "chatID not found"
 * @apiError (404: Email Not Found) {String} message "email not found"
 * @apiError (400: Invalid Parameter) {String} message "Malformed parameter. chatId must be a number" 
 * @apiError (400: Duplicate Email) {String} message "user not in chat"
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 */ 
router.delete("/:chatId", (request, response, next) => {
    //validate on empty parameters
    if (!request.params.chatId) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else if (isNaN(request.params.chatId)) {
        response.status(400).send({
            message: "Malformed parameter. chatId must be a number"
        })
    } else {
        next()
    }
}, (request, response, next) => {
    //validate chat id exists
    let query = 'SELECT * FROM CHATS WHERE ChatId=$1'
    let values = [request.params.chatId]

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "Chat ID not found"
                })
            } else {
                next()
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            })
        })
}, (request, response, next) => {
    //validate email exists 
    let query = 'SELECT MemberID FROM Members WHERE Email=$1'
    let values = [request.decoded.email]

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(404).send({
                    message: "email not found"
                })
            } else {
                next()
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error",
                error: error
            })
        })
}, (request, response, next) => {
        //validate email exists in the chat
        let query = 'SELECT * FROM ChatMembers WHERE ChatId=$1 AND MemberId=$2'
        let values = [request.params.chatId, request.decoded.memberid]
    
        pool.query(query, values)
            .then(result => {
                if (result.rowCount > 0) {
                    next()
                } else {
                    response.status(400).send({
                        message: "user not in chat"
                    })
                }
            }).catch(error => {
                response.status(400).send({
                    message: "SQL Error",
                    error: error
                })
            })

}, (request, response) => {
    //Delete the memberId from the chat
    let insert = `DELETE FROM ChatMembers
                  WHERE ChatId=$1
                  AND MemberId=$2
                  RETURNING *`
    let values = [request.params.chatId, request.decoded.memberid]
    pool.query(insert, values)
        .then(result => {
            response.send({
                success: true
            })
        }).catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })
        })
    }
)


/**
 * @api {get} /chats Request to get all chatrooms associated with JSON Web Token JWT
 * @apiName GetChats
 * @apiGroup Chats
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * 
 * @apiSuccess {Number} rowCount the number of chatrooms returned
 * @apiSuccess {Object[]} chatroom List of chatrooms
 * @apiSuccess {String} chats.name The name for the chatroom
 * @apiSuccess {String} chats.chatid The id for the chatroom
 * 
 * @apiSuccess (204: Chatrooms Empty) {String} message "No Chatrooms"
 * 
 * @apiError (404: ChatId Not Found) {String} message "Chat ID Not Found"
 * @apiError (400: Invalid Parameter) {String} message "Malformed parameter. chatId must be a number" 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 */ 
router.get("/", (request, response, next) => {
    //validate member id exists
    let query = 'SELECT * FROM Members WHERE memberid=$1'
    let values = [request.decoded.memberid]

    pool.query(query, values)
        .then(result => {
            if (result.rowCount == 0) {
                response.status(204).send({
                    message: "Member ID not found"
                })
            } else {
                next()
            }
        }).catch(error => {
            response.status(400).send({
                message: "SQL Error in member validation",
                error: error
            })
        })
    }, (request, response) => {
        //Retrieve the member's chatrooms
        let query = 'SELECT Chats.Name, Chats.Chatid FROM Chats INNER JOIN Chatmembers ON Chats.Chatid = Chatmembers.Chatid WHERE memberid = $1'
        let values = [request.decoded.memberid]

        pool.query(query, values)
            .then(result => {
                if (result.rowCount == 0) {
                    response.status(204).send({
                        message: "No Chatrooms"
                    })
                } else {
                    //console.log(result.rows)
                    response.send({
                        memberId: request.decoded.memberId,
                        rowCount: result.rowCount,
                        rows: result.rows
                    })
                }
            }).catch(err => {
                //console.log(err)
                response.status(400).send({
                    message: "SQL Error in chatroom retrieve",
                    error: err
                })
            })
})

/**
 * @api {post} /chats/add Request to add a chatroom
 * @apiName PostChats
 * @apiGroup Chats
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * @apiParam {String} name the name for the chatroom
 * 
 * @apiSuccess {boolean} success true when the chatroom is inserted
 * 
 * @apiSuccess (204: User Not Found) {String} message "Member ID not found"
 * 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 */ 
router.post("/add", (request, response, next) => {
    if (!isStringProvided(request.body.name)) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else {
        next()
    }
}, (request, response, next) => {
    //validate memberid exist
    let select = `SELECT * FROM members WHERE memberid = $1`
    let values = [request.decoded.memberid]

    pool.query(select, values)
        .then(result => {
            if(result.rowCount == 0){
                response.status(204).send({
                    message: "Member ID not found"
                })
            }else {
                next()
            }
        }).catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })
        })

}, (request, response, next) => {

    let insert = `INSERT INTO Chats(Name)
                  VALUES ($1)
                  RETURNING ChatId`
    let values = [request.body.name]
    pool.query(insert, values)
        .then(result => {
            //put chatid in params and pass to next function
            request.params.chatid = result.rows[0].chatid
            next()
        }).catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })
        })
}, (request, response) => {
    let insert = `INSERT INTO CHATMEMBERS(chatid, memberid) VALUES ($1, $2)`
    let values = [request.params.chatid, request.decoded.memberid]
    pool.query(insert, values)
        .then(result => {
            response.send({
                success: true
            })
        }).catch (err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })
        })
})

/**
 * @api {post} /chats/addUser Request to add a user to the specified chatroom
 * @apiName PostChats
 * @apiGroup Chats
 * 
 * @apiHeader {String} authorization Valid JSON Web Token JWT
 * @apiParam {String} email the email of the user to be added
 * @apiParam {Number} chatid the id of the chatroom
 * 
 * @apiSuccess {boolean} success true when the user is inserted into chatroom
 * 
 * @apiError (400: User Not Found) {String} message "contact does not exist"
 * 
 * @apiError (400: Missing Parameters) {String} message "Missing required information"
 * 
 * @apiError (400: SQL Error) {String} message "FAILED SQL INSERT"
 * 
 * @apiError (400: SQL Error) {String} message the reported SQL error details
 * 
 */ 
router.post("/addUser", (request, response, next) => {
    if (!isStringProvided(request.body.email)) {
        response.status(400).send({
            message: "Missing required information"
        })
    } else {
        next()
    }
}, (request, response, next) => {
    let select = `SELECT memberid FROM members WHERE email = $1`
    let values = [request.body.email]

    pool.query(select, values)
        .then(result => {
            if(result.rowCount == 0) {
                response.status(400).send({
                    message: "contact does not exist"
                })
            }else {
                request.params.memberid = result.rows[0].memberid
                next()
            }
        })
}, (request, response) => {
    let insert = `INSERT INTO ChatMembers(chatid, memberid) VALUES ($1, $2)`
    let values = [request.body.chatid, request.params.memberid]

    pool.query(insert, values)
        .then(result => {
            if(result.rowCount == 0) {
                response.status(400).send({
                    message: "FAILED SQL INSERT"
                })
            }else {
                response.send({
                    success: true
                })
            }
        }).catch(err => {
            response.status(400).send({
                message: "SQL Error",
                error: err
            })
        })
})


module.exports = router