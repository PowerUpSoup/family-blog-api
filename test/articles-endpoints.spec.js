const knex = require('knex')
const app = require('../src/app')
const { makeUsersArray } = require('./users.fixtures.js')
const { makeArticlesArray } = require('./articles.fixtures.js')

describe('Articles Endpoints', function () {
    let db

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DATABASE_URL,
        })
        app.set('db', db)
    })

    after('disconnect from db', () => db.destroy())

    before('clean the table', () => db.raw('TRUNCATE users, articles RESTART IDENTITY CASCADE'))

    afterEach('cleanup', () => db.raw('TRUNCATE users, articles RESTART IDENTITY CASCADE'))

    describe(`GET /api/articles`, () => {
        context(`Given no articles`, () => {
            it(`responds with 200 and an empty list`, () => {
                return supertest(app)
                    .get('/api/articles')
                    .expect(200, [])
            })
        })

        context('Given there are articles in the database', () => {
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

            it('responds with 200 and all of the articles', () => {
                return supertest(app)
                    .get('/api/articles')
                    .expect(200, testArticles)
            })
        })
    })

    describe(`GET /api/articles/:article_id`, () => {
        context(`Given no articles`, () => {
            it(`responds with 404`, () => {
                const articleId = 123456
                return supertest(app)
                    .get(`/api/articles/${articleId}`)
                    .expect(404, { error: { message: `Article doesn't exist` } })
            })
        })

        context('Given there are articles in the database', () => {
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

            it('responds with 200 and the specified article', () => {
                const id = 2
                const expectedArticles = testArticles[id - 1]
                return supertest(app)
                    .get(`/api/articles/${id}`)
                    .expect(200, expectedArticles)
            })
        })
    })

    describe(`POST /api/articles`, () => {
        context(`given there are users who can created articles`, () => {
            const testUsers = makeUsersArray()

            beforeEach('insert users', () => {
                return db
                    .into('users')
                    .insert(testUsers)
            })


            it(`creates an article, responding with 201 and the new article`, () => {
                const newArticles = {
                    title: 'Test new article',
                    content: 'test article content',
                    modified: '2018-03-03T00:00:00.000Z',
                    authorid: 1,
                }
                return supertest(app)
                    .post('/api/articles')
                    .send(newArticles)
                    .expect(201)
                    .expect(res => {
                        expect(res.body.title).to.eql(newArticles.title)
                        expect(res.body.content).to.eql(newArticles.content)
                        expect(res.body.modified).to.eql(newArticles.modified)
                        expect(res.body.authorid).to.eql(newArticles.authorid)
                        expect(res.body).to.have.property('id')
                        expect(res.headers.location).to.eql(`/api/articles/${res.body.id}`)
                        const expected = new Date(newArticles.modified).toLocaleString()
                        const actual = new Date(res.body.modified).toLocaleString()
                        expect(actual).to.eql(expected)
                    })
                    .then(res =>
                        supertest(app)
                            .get(`/api/articles/${res.body.id}`)
                            .expect(res.body)
                    )
            })
        })

        const requiredFields = ['title', 'authorid', 'content', 'modified']

        requiredFields.forEach(field => {
            const newArticles = {
                title: 'Test new article title',
                authorid: 1,
                content: 'Test Article content',
                modified: 'this is a problem'
            }

            it(`responds with 400 and an error message when the '${field}' is missing`, () => {
                delete newArticles[field]

                return supertest(app)
                    .post('/api/articles')
                    .send(newArticles)
                    .expect(400, {
                        error: { message: `Missing '${field}' in request body` }
                    })
            })
        })
    })

    describe(`DELETE /api/articles/:article_id`, () => {
        context(`Given no Articles`, () => {
            it(`responds with 404`, () => {
                const articleId = 123456
                return supertest(app)
                    .delete(`/api/articles/${articleId}`)
                    .expect(404, { error: { message: `Article doesn't exist` } })
            })
        })

        context('Given there are articles in the database', () => {
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

            it('responds with 204 and removes the article', () => {
                const idToRemove = 2
                const expectedArticles = testArticles.filter(article => article.id !== idToRemove)
                return supertest(app)
                    .delete(`/api/articles/${idToRemove}`)
                    .expect(204)
                    .then(res =>
                        supertest(app)
                            .get(`/api/articles`)
                            .expect(expectedArticles)
                    )
            })
        })
    })

    describe(`PATCH /api/articles/:id`, () => {
        context(`Given no articles`, () => {
            it(`responds with 404`, () => {
                const articleId = 123456
                return supertest(app)
                    .patch(`/api/articles/${articleId}`)
                    .expect(404, { error: { message: `Article doesn't exist` } })
            })
        })

        context('Given there are articles in the database', () => {
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

            it('responds with 204 and updates the article', () => {
                const idToUpdate = 2
                const updateArticles = {
                    title: 'updated article name',
                }
                const expectedArticles = {
                    ...testArticles[idToUpdate - 1],
                    ...updateArticles
                }
                return supertest(app)
                    .patch(`/api/articles/${idToUpdate}`)
                    .send(updateArticles)
                    .expect(204)
                    .then(res =>
                        supertest(app)
                            .get(`/api/articles/${idToUpdate}`)
                            .expect(expectedArticles)
                    )
            })

            it(`responds with 400 when no required fields supplied`, () => {
                const idToUpdate = 2
                return supertest(app)
                    .patch(`/api/articles/${idToUpdate}`)
                    .send({ irrelevantField: 'foo' })
                    .expect(400, {
                        error: {
                            message: `Request body must contain one of: 'title', 'modified' or 'content'`
                        }
                    })
            })

            it(`responds with 204 when updating only a subset of fields`, () => {
                const idToUpdate = 2
                const updateArticles = {
                    title: 'updated article title',
                }
                const expectedArticles = {
                    ...testArticles[idToUpdate - 1],
                    ...updateArticles
                }

                return supertest(app)
                    .patch(`/api/articles/${idToUpdate}`)
                    .send({
                        ...updateArticles,
                        fieldToIgnore: 'should not be in GET response'
                    })
                    .expect(204)
                    .then(res =>
                        supertest(app)
                            .get(`/api/articles/${idToUpdate}`)
                            .expect(expectedArticles)
                    )
            })
        })
    })
})
