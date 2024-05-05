const { PubSub } = require('graphql-subscriptions')
const pubsub = new PubSub()
const { GraphQLError } = require('graphql')
const jwt = require('jsonwebtoken')
const Book = require('./models/book')
const Author = require('./models/author')
const User = require('./models/user')

const resolvers = {
    Query: {
      bookCount: async () => Book.collection.countDocuments(),
      authorCount: async () => Author.collection.countDocuments(),
      allBooks: async (root, args) => {
        if (!args.author && !args.genre) {
          return Book.find({}).populate('author');
        }
        if (!args.author) {
          return Book.find({ genres: { $in: [args.genre] } }).populate('author');
        }
        const author = await Author.findOne({ name: args.author})
        if (!args.genre) {
          return Book.find({ author: author }).populate('author');
        }
        return Book.find({ author: author, genres: { $in: [args.genre] } }).populate('author');
      },
      allAuthors: async () => Author.find({}),
      me: (root, args, context) => {
        return context.currentUser
      }
    },
    Author: {
      bookCount: async (root) => {
          return Book.countDocuments({ author: root._id })
      }
    },
    Mutation: {
      addBook: async (root, args, context) => {
        const currentUser = context.currentUser
  
        if (!currentUser) {
          throw new GraphQLError('not authenticated', {
            extensions: {
              code: 'BAD_USER_INPUT',
            }
          })
        }
  
          const author = await Author.findOne({name: args.author})
          if(!author){
            const newAuthor = new Author({name: args.author})
            try{
              await newAuthor.save()
            }
            catch(error) {
              throw new GraphQLError('Saving author failed', {
                extensions: {
                  code: 'BAD_USER_INPUT',
                  invalidArgs: args.author,
                  error
                }
              })
            }
            const book = new Book({
              title: args.title,
              published: args.published,
              author: newAuthor,
              genres: args.genres
            })
            try{
              await book.save()
            }catch(error) {
              throw new GraphQLError('Saving book failed', {
                extensions: {
                  code: 'BAD_USER_INPUT',
                  invalidArgs: args.title,
                  error
                }
              })
            }

            pubsub.publish('BOOK_ADDED', { bookAdded: book })
            
            return book
          }
          else{
            const book = new Book({
              title: args.title,
              published: args.published,
              author: author,
              genres: args.genres
            })
            try{
              await book.save()
            }catch(error) {
              throw new GraphQLError('Saving book failed', {
                extensions: {
                  code: 'BAD_USER_INPUT',
                  invalidArgs: args.title,
                  error
                }
              })
            }

            pubsub.publish('BOOK_ADDED', { bookAdded: book })

            return book
          }
      },
      editAuthor: async (root, args, context) => {
        const currentUser = context.currentUser
  
        if (!currentUser) {
          throw new GraphQLError('not authenticated', {
            extensions: {
              code: 'BAD_USER_INPUT',
            }
          })
        }
        
        const author = await Author.findOne({name: args.name})
        author.born = args.setBornTo
        try {
          await author.save()
        } catch (error) {
          throw new GraphQLError('Editing author failed', {
            extensions: {
              code: 'BAD_USER_INPUT',
              invalidArgs: args.name,
              error
            }
          })
        }
        return author
      },
      createUser: async (root, args) => {
        const user = new User({ username: args.username, favoriteGenre: args.favoriteGenre })
    
        return user.save()
          .catch(error => {
            throw new GraphQLError('Creating the user failed', {
              extensions: {
                code: 'BAD_USER_INPUT',
                invalidArgs: args.name,
                error
              }
            })
          })
      },
      login: async (root, args) => {
        const user = await User.findOne({ username: args.username })
    
        if ( !user || args.password !== 'secret' ) {
          throw new GraphQLError('wrong credentials', {
            extensions: { code: 'BAD_USER_INPUT' }
          })        
        }
    
        const userForToken = {
          username: user.username,
          id: user._id,
        }
    
        return { value: jwt.sign(userForToken, process.env.JWT_SECRET) }
      }
    },
    Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator('BOOK_ADDED')
    },
  },
  }


  module.exports = resolvers