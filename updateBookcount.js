const mongoose = require('mongoose');
const Author = require('./models/author');
const Book = require('./models/book');
require('dotenv').config()

const MONGODB_URI = process.env.MONGODB_URI

const updateBookCount = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const authors = await Author.find({});

    for (const author of authors) {
      const bookCount = await Book.countDocuments({ author: author._id });
      author.bookCount = bookCount;
      await author.save();
    }

    console.log('Book count updated successfully.');
  } catch (error) {
    console.error('Error updating book count:', error);
  } finally {
    mongoose.disconnect();
  }
};

updateBookCount();