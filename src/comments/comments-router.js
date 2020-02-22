const path = require('path')
const express = require('express')
const xss = require('xss')
const CommentsService = require('./comments-service')

const commentsRouter = express.Router()
const jsonParser = express.json()

const serializeComment = comment => ({
  id: comment.id,
  articleid: comment.articleid,
  commentorid: comment.commentorid,
  content: comment.content,
  modified: comment.modified,
  date_created: comment.date_created,
})

commentsRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    CommentsService.getAllComments(knexInstance)
      .then(comments => {
          console.log(res.json)
        res.json(comments.map(serializeComment))
      })
      .catch(next)
  })
  .post(jsonParser, (req, res, next) => {
    const { articleid, commentorid, content } = req.body
    const newComment = { articleid, commentorid, content }

    for (const [key, value] of Object.entries(newComment))
      if (value == null)
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        })

    CommentsService.insertComment(
      req.app.get('db'),
      newComment
    )
      .then(comment => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${comment.id}`))
          .json(serializeComment(comment))
      })
      .catch(next)
  })

commentsRouter
  .route('/:comment_id')
  .all((req, res, next) => {
    CommentsService.getById(
      req.app.get('db'),
      req.params.comment_id
    )
      .then(comment => {
        if (!comment) {
          return res.status(404).json({
            error: { message: `Comment doesn't exist` }
          })
        }
        res.comment = comment
        next()
      })
      .catch(next)
  })
  .get((req, res, next) => {
    res.json(serializeComment(res.comment))
  })
  .delete((req, res, next) => {
    CommentsService.deleteComment(
      req.app.get('db'),
      req.params.comment_id
    )
      .then(numRowsAffected => {
        res.status(204).end()
      })
      .catch(next)
  })
  .patch(jsonParser, (req, res, next) => {
    const { articleid, commentorid, content, modified  } = req.body
    const commentToUpdate = { articleid, commentorid, content, modified  }

    const numberOfValues = Object.values(commentToUpdate).filter(Boolean).length
    if (numberOfValues === 0)
      return res.status(400).json({
        error: {
          message: `Request body must contain one of: 'modified' or 'content'`
        }
      })

    CommentsService.updateComment(
      req.app.get('db'),
      req.params.comment_id,
      commentToUpdate
    )
      .then(numRowsAffected => {
        res.status(204).end()
      })
      .catch(next)
  })

module.exports = commentsRouter;