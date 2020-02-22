const knex = require('knex')
const app = require('../src/app')
const { makeUsersArray } = require('./users.fixtures.js')
const { makeArticlesArray } = require('./articles.fixtures.js')
const { makeCommentsArray } = require('./comments.fixtures.js')

describe('Comments Endpoints', function () {
    let db

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DATABASE_URL,
        })
        app.set('db', db)
    })

    after('disconnect from db', () => db.destroy())

    before('clean the table', () => db.raw('TRUNCATE users, articles, comments RESTART IDENTITY CASCADE'))

    afterEach('cleanup', () => db.raw('TRUNCATE users, articles, comments RESTART IDENTITY CASCADE'))

    describe(`GET /api/comments`, () => {
        context(`Given no comments`, () => {
            it(`responds with 200 and an empty list`, () => {
                return supertest(app)
                    .get('/api/comments')
                    .expect(200, [])
            })
        })

        context('Given there are comments in the database', () => {
            const testUsers = makeUsersArray()
            const testArticles = makeArticlesArray()
            const testComments = makeCommentsArray()

            beforeEach('insert users', () => {
                return db
                    .into('users')
                    .insert(testUsers)
            })

            beforeEach('insert articles', () => {
                return db
                    .into('articles')
                    .insert(testArticles)
            })

            beforeEach('insert comments', () => {
                return db
                    .into('comments')
                    .insert(testComments)
            })

            it('responds with 200 and all of the comments', () => {
                return supertest(app)
                    .get('/api/comments')
                    .expect(200, testComments)
            })
        })
    })

    describe(`GET /api/comments/:comment_id`, () => {
        context(`Given no comments`, () => {
            it(`responds with 404`, () => {
                const commentId = 123456
                return supertest(app)
                    .get(`/api/comments/${commentId}`)
                    .expect(404, { error: { message: `Comment doesn't exist` } })
            })
        })

        context('Given there are comments in the database', () => {
            const testUsers = makeUsersArray()
            const testArticles = makeArticlesArray()
            const testComments = makeCommentsArray()

            beforeEach('insert users', () => {
                return db
                    .into('users')
                    .insert(testUsers)
            })

            beforeEach('insert articles', () => {
                return db
                    .into('articles')
                    .insert(testArticles)
            })

            beforeEach('insert comments', () => {
                return db
                    .into('comments')
                    .insert(testComments)
            })

            it('responds with 200 and the specified comment', () => {
                const id = 2
                const expectedComments = testComments[id - 1]
                return supertest(app)
                    .get(`/api/comments/${id}`)
                    .expect(200, expectedComments)
            })
        })
    })

    describe(`POST /api/comments`, () => {
        context(`given there are users who can create comments and articles to comment on`, () => {
            const testUsers = makeUsersArray()
            const testArticles = makeArticlesArray()

            beforeEach('insert users', () => {
                return db
                    .into('users')
                    .insert(testUsers)
            })

            beforeEach('insert articles', () => {
                return db
                    .into('articles')
                    .insert(testArticles)
            })

            it(`creates a comment, responding with 201 and the new comment`, () => {
                const newComment = {
                    content: 'test comment content',
                    articleid: 1,
                    commentorid: 1
                }
                
                return supertest(app)
                    .post('/api/comments')
                    .send(newComment)
                    .expect(201)
                    .expect(res => {
                        expect(res.body.commentorid).to.eql(newComment.commentorid)
                        expect(res.body.content).to.eql(newComment.content)
                        expect(res.body.articleid).to.eql(newComment.articleid)
                        expect(res.body).to.have.property('id')
                        expect(res.headers.location).to.eql(`/api/comments/${res.body.id}`)
                        const expected = new Date().toLocaleString()
                        const actual = new Date(res.body.date_created).toLocaleString()
                        
                        expect(actual).to.eql(expected)
                    })
                    .then(res =>
                        supertest(app)
                            .get(`/api/comments/${res.body.id}`)
                            .expect(res.body)
                    )
            })
        })

        const requiredFields = ['content', 'commentorid', 'articleid']

        requiredFields.forEach(field => {
            const newComments = {
                content: 'Test new comment',
                commentorid: 1,
                articleid: 1
            }

            it(`responds with 400 and an error message when the '${field}' is missing`, () => {
                delete newComments[field]

                return supertest(app)
                    .post('/api/comments')
                    .send(newComments)
                    .expect(400, {
                        error: { message: `Missing '${field}' in request body` }
                    })
            })
        })
    })

    describe(`DELETE /api/comments/:comment_id`, () => {
        context(`Given no Comments`, () => {
            it(`responds with 404`, () => {
                const commentId = 123456
                return supertest(app)
                    .delete(`/api/comments/${commentId}`)
                    .expect(404, { error: { message: `Comment doesn't exist` } })
            })
        })

        context('Given there are comments in the database', () => {
            const testUsers = makeUsersArray()
            const testArticles = makeArticlesArray()
            const testComments = makeCommentsArray()

            beforeEach('insert users', () => {
                return db
                    .into('users')
                    .insert(testUsers)
            })

            beforeEach('insert articles', () => {
                return db
                    .into('articles')
                    .insert(testArticles)
            })

            beforeEach('insert comments', () => {
                return db
                    .into('comments')
                    .insert(testComments)
            })

            it('responds with 204 and removes the comment', () => {
                const idToRemove = 2
                const expectedComments = testComments.filter(comment => comment.id !== idToRemove)
                return supertest(app)
                    .delete(`/api/comments/${idToRemove}`)
                    .expect(204)
                    .then(res =>
                        supertest(app)
                            .get(`/api/comments`)
                            .expect(expectedComments)
                    )
            })
        })
    })

    describe(`PATCH /api/comments/:comment_id`, () => {
        context(`Given no comments`, () => {
            it(`responds with 404`, () => {
                const commentId = 123456
                return supertest(app)
                    .patch(`/api/comments/${commentId}`)
                    .expect(404, { error: { message: `Comment doesn't exist` } })
            })
        })

        context('Given there are comments in the database', () => {
            const testUsers = makeUsersArray()
            const testArticles = makeArticlesArray()
            const testComments = makeCommentsArray()

            beforeEach('insert users', () => {
                return db
                    .into('users')
                    .insert(testUsers)
            })

            beforeEach('insert articles', () => {
                return db
                    .into('articles')
                    .insert(testArticles)
            })

            beforeEach('insert comments', () => {
                return db
                    .into('comments')
                    .insert(testComments)
            })

            it('responds with 204 and updates the comment', () => {
                const idToUpdate = 2
                const updateComments = {
                    content: 'updated comment content',
                }
                const expectedComments = {
                    ...testComments[idToUpdate - 1],
                    ...updateComments
                }
                return supertest(app)
                    .patch(`/api/comments/${idToUpdate}`)
                    .send(updateComments)
                    .expect(204)
                    .then(res =>
                        supertest(app)
                            .get(`/api/comments/${idToUpdate}`)
                            .expect(expectedComments)
                    )
            })

            it(`responds with 400 when no required fields supplied`, () => {
                const idToUpdate = 2
                return supertest(app)
                    .patch(`/api/comments/${idToUpdate}`)
                    .send({ irrelevantField: 'foo' })
                    .expect(400, {
                        error: {
                            message: `Request body must contain one of: 'modified' or 'content'`
                        }
                    })
            })

            it(`responds with 204 when updating only a subset of fields`, () => {
                const idToUpdate = 2
                const updateComments = {
                    content: 'updated comment content',
                }
                const expectedComments = {
                    ...testComments[idToUpdate - 1],
                    ...updateComments
                }

                return supertest(app)
                    .patch(`/api/comments/${idToUpdate}`)
                    .send({
                        ...updateComments,
                        fieldToIgnore: 'should not be in GET response'
                    })
                    .expect(204)
                    .then(res =>
                        supertest(app)
                            .get(`/api/comments/${idToUpdate}`)
                            .expect(expectedComments)
                    )
            })
        })
    })
})
