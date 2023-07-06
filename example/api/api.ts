/**
 * This file contains a simple API to demonstrate the usage of this library. This should give a view
 * as to what will come from the GQL server.
 */
import express, { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';

/**
 * Generate a sequence of IDs.
 */
class IdGenerator {
  static id = 0;
  static getId() {
    IdGenerator.id = IdGenerator.id + 1;
    return `${IdGenerator.id}`;
  }
}

// Data Models
class BlogPost {
  id: string;

  // settable properties
  authorId: string = '';
  title: string = '';
  content: string = '';

  constructor(args: Pick<BlogPost, 'authorId' | 'title' | 'content'>) {
    // simple validation
    const requiredKeys = ['authorId', 'title', 'content'];
    for (const k of requiredKeys) {
      if (!(k in args)) {
        throw new Error(`${k} is required to create a new blog post`);
      }
    }

    // set instance properties
    Object.assign(this, args);

    // generate a unique id
    this.id = IdGenerator.getId();
  }
}

class Author {
  id: string;

  // settable properties
  name: string = '';

  constructor(args: Pick<Author, 'name'>) {
    // simple validation
    const requiredKeys = ['name'];
    for (const k of requiredKeys) {
      if (!(k in args)) {
        throw new Error(`${k} is required to create a new blog post`);
      }
    }

    // set instance properties
    Object.assign(this, args);

    // generate a unique id
    this.id = IdGenerator.getId();
  }
}

class Blog {
  posts: BlogPost[];
  authors: Author[];

  constructor() {
    this.posts = [];
    this.authors = [];
  }

  // BlogPost operations
  makeBlogPost(blogPostData: any) {
    const blogPost = new BlogPost(blogPostData);
    this.posts.push(blogPost);
    this.posts.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    return blogPost;
  }

  listBlogPosts(): readonly BlogPost[] {
    return this.posts;
  }

  getBlogPost(id: string) {
    return this.posts.find((p) => p.id === id);
  }

  // Authors operations
  getAuthors(): readonly Author[] {
    return this.authors;
  }

  getAuthor(authorId: string) {
    return this.authors.find((author) => author.id === authorId);
  }

  getBlogPostIdsForAuthor(authorId: string): string[] {
    return this.posts.filter((p) => p.authorId === authorId).map(p => p.id);
  }
}

const blog = new Blog();
blog.authors.push(new Author({ name: 'Gino' }));
blog.authors.push(new Author({ name: 'Sam' }));

for (let i = 0; i < 10; i++) {
  blog.makeBlogPost(
    new BlogPost({
      authorId: blog.authors[0].id,
      content: 'foo content',
      title: `Foo ${i}`,
    }),
  );
}

for (let i = 0; i < 10; i++) {
  blog.makeBlogPost(
    new BlogPost({
      authorId: blog.authors[1].id,
      content: 'bar content',
      title: `Bar ${i}`,
    }),
  );
}

// App setup
const app = express();

// Setup middlewares
app.use(express.json());
app.use(express.raw());
app.use(express.urlencoded());
app.use(morgan('short'));

// Setup routes

// BlogPost routes
app.get('/api/blog/posts/', (req, res) => {
  const { cursor, before, last, limit } = getConnectionArgsFromQuery(
    req.query,
  );

  const authorIdFilter = req.query.authorId ?? null

  let posts = blog.listBlogPosts();

  if (authorIdFilter) {
    posts = posts.filter(p => p.authorId === authorIdFilter)
  }

  res.json(paginateConnection(posts, 'BlogPost', cursor, limit, before, last));
});

app.post('/api/blog/posts/', (req, res) => {
  const bp = blog.makeBlogPost(req.body);
  res.json(bp);
});

app.get('/api/blog/posts/:id/', (req, res) => {
  res.json(blog.getBlogPost(req.params.id));
});

// Author Routes
app.get('/api/blog/authors/', (req, res) => {
  const { cursor, before, last, limit } = getConnectionArgsFromQuery(
    req.query,
  );

  let authors = blog
    .getAuthors()
    // enrich authors will their blog posts ids
    .map((author) => {
      Object.assign(author, {
        blogPostIds: blog.getBlogPostIdsForAuthor(author.id),
      });
      return author;
    });

  return res.json(
    paginateConnection(authors, 'Author', cursor, limit, before, last),
  );
});

app.get('/api/blog/authors/:id/', (req, res) => {
  res.json(blog.getAuthor(req.params.id));
});

// setup error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  return res.status(500).json({
    error: err.name,
    description: err.message,
    stack: err.stack,
  });
});

export default function start(port: number) {
  app.listen(port, () => {
    console.log('REST API listening on port ' + port);
  });

  return app;
}

// Utils

/**
 * A global ID is in the form of <GQL Type>:<Object Id> that is base64 url encoded.
 *
 * @param id the id to parse
 */
function getIdFromGlobalId(globalId: string) {
  return Buffer.from(globalId, 'base64url').toString('utf-8').split(':')[1];
}

/**
 * A global ID is in the form of <GQL Type>:<Object Id> that is base64 url encoded.
 *
 * @param id the id to serialize
 * @param graphqlType the name of the gql type
 */
function makeGlobalId(id: string, graphqlType: string) {
  return Buffer.from(`${graphqlType}:${id}`, 'utf-8').toString('base64url');
}

/**
 * This impliments the pagination algorithm found here: https://relay.dev/graphql/connections.htm#sec-Pagination-algorithm.
 *
 * Note: this doesn't use relay's connection util because that assumes indexes for cursors which only work for static arrays.
 *
 * @param arr The array to slice into a page
 * @param after the cursor for which to return items that come after
 * @param first the number of items to return after the 'after' cursor
 * @param before the cursor for which to return items that come before
 * @param last the number of items to return that come before the 'before' cursor
 */
function paginateConnection<T extends { id: string }>(
  arr: readonly T[],
  graphqlType: string,
  after?: string,
  first?: number,
  before?: string,
  last?: number,
) {
  // by default, return the entire array
  let startingIndex = 0;
  let endingIndex = arr.length;

  // parse the cursors if it exists
  after = after ? getIdFromGlobalId(after) : undefined;
  before = before ? getIdFromGlobalId(before) : undefined;

  // since we return the whole array by default, there is no previous or next
  let hasPreviousPage = false;
  let hasNextPage = false;

  // the user doesn't want any items - return an empty list and forget everything else
  if (last === 0 || first === 0) {
    return {
      data: [],
      meta: {
        cursors: [],
        hasNextPage,
        hasPreviousPage,
        startCursor: null,
        endCursor: null,
      },
    };
  }

  // step 1 is to slice the array before or after the given cursor
  // after will always be truthy but before will only be truthy if it was explicitly passed
  // so we check 'before' first. `before` and `after` are mutually exclusive. Behavior is undefined
  // if both are passed.
  if (before) {
    const elementIndex = arr.findIndex((item) => item.id === before);

    if (elementIndex !== -1) {
      // we do not include the cursor in the list of items and `end` is exclusive in Array.slice
      endingIndex = elementIndex;
    }
  } else if (after) {
    const elementIndex = arr.findIndex((item) => item.id === after);

    if (elementIndex !== -1) {
      // we do not include the cursor in the list of items and `start` is inclusive in Array.slice
      startingIndex = elementIndex + 1;
    }
  }

  // remove elements before or after the cursor
  arr = arr.slice(startingIndex, endingIndex);

  // step 2 is to limit the array based on first or last
  if (first) {
    if (first < 0) {
      throw new Error(`first cannot be less than 0`);
    }

    if (first < arr.length) {
      arr = arr.slice(0, first);
      // because we removed elements from the end of the list, we have more pages
      hasNextPage = true;
    }
  } else if (last) {
    if (last < 0) {
      throw new Error(`last cannot be less than 0`);
    }

    if (last < arr.length) {
      // remove items from front to make the list as long as last
      arr = arr.slice(arr.length - last);

      // because we removed elements from the front of the list, set hasPreviousPage
      hasPreviousPage = true;
    }
  }

  // finally, make the metadata info
  const cursors = arr.map((item) => makeGlobalId(item.id, graphqlType));

  return {
    data: arr,
    meta: {
      // the relay spec does not specify `cursors` but the library expects this
      cursors,
      hasNextPage,
      hasPreviousPage,
      startCursor: cursors[0],
      endCursor: cursors[cursors.length - 1],
    },
  };
}

/**
 * This function parses the connection args. These are the query args passed when using
 * `PaginatedHttpResource.getConnection`.
 *
 * @param query the req.query object
 * @returns parsed connection args from the query object
 */
function getConnectionArgsFromQuery(query: Request['query']) {
  const cursor = (query.cursor as string) ?? undefined;
  const limit = query.limit ? parseInt(query.limit as string) : undefined;
  const before = (query.before as string) ?? undefined;
  const last = query.last ? parseInt(query.last as string) : undefined;

  return {
    cursor,
    limit,
    before,
    last,
  };
}
