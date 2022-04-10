const { extract } = require('article-parser/dist/cjs/article-parser.js')

const postBookmark  = async(req, res, next) => {
  const { bookmarkListId } = req.params;
  const { url:bookmarkUrl } = req.body;

  const {
    url, description, title, image, content
  } = await extract(bookmarkUrl)

  const lineBreakRemovedContent = content.replace(/\n/g, '');
  const codeRemovedContent = lineBreakRemovedContent.replace(/<\s*code[^>]*>(.*?)<\s*\/\s*code>/g, '')
  const mainContent = codeRemovedContent.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, '')


  try {
    return res.status(201).json({
      bookmarkListId,
      title,
      description,
      mainContent,
      image,
      url,
      keywords: ["react", "효과"]
    })
  } catch(e) {
    return next(e)
  }
}

module.exports ={
  postBookmark
}
