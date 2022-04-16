const { extract } = require('article-parser/dist/cjs/article-parser.js')
const mod = require('korean-text-analytics');

const postBookmark  = async(req, res, next) => {
  const { bookmarkListId } = req.params;
  const { url:bookmarkUrl } = req.body;

  const {
    url, description, title, image, content
  } = await extract(bookmarkUrl)

  // 본문 파싱
  const lineBreakRemovedContent = content.replace(/\n/g, ' ');
  const codeRemovedContent = lineBreakRemovedContent.replace(/<\s*code[^>]*>(.*?)<\s*\/\s*code>/g, '');
  const mainContent = codeRemovedContent.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, '').replaceAll('  ', ' ');

  // 형태소 분석 + 최빈출 단어
  const task = new mod.TaskQueue();

  let keywordsCandidates = await new Promise((resolve, reject) => {
    mod.ExecuteMorphModule(mainContent, function (err, rep) {
      if (err) {
        reject(err)
      }

      let wordFreqMap = {};
      rep.morphed.forEach(({word, tag}) => {
        if (['NNP', 'NNG'].includes(tag)) {
          if(wordFreqMap[word] !== undefined) {
            wordFreqMap[word] += 1
          } else {
            wordFreqMap[word] = 1
          }
        }
      })
      resolve(wordFreqMap)
    })
  })


  const keywords = Object.entries(keywordsCandidates)
    .sort((prev, post) => post[1] - prev[1])
    .slice(0,3)
    .map((v) => v[0])

  console.log(keywords)


  // 최다빈출 키워드 5개 추출 + 제목 값을 가중치에 넣기
  // 가중치 주는 방법을 생각하자(title과 description에 있는 말에 가중치?)
  // const a = result.entries().sort((prev, post) => prev[1] - post[1])
  // console.log(a)


  try {
    return res.status(201).json({
      bookmarkListId,
      title,
      description,
      keywords,
      image,
      url,
    })
  } catch(e) {
    return next(e)
  }
}

module.exports ={
  postBookmark
}
