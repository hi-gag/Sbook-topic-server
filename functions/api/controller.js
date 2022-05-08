const { extract } = require("article-parser/dist/cjs/article-parser.js");
const mod = require("korean-text-analytics");
const admin = require("firebase-admin");
const stringHash = require("string-hash");

const getRecommends = async (req, res, next) => {
  try {
    const { bookmarkListId } = req.params;
    const recommendQuery = admin
      .firestore()
      .collection("bookmarks")
      .where("bookmarkListId", "==", bookmarkListId);

    const bookmarkRefs = await recommendQuery.get();

    let recommendFreq = {};
    let recommendsResult = [];
    let keywordFreq = {};

    bookmarkRefs.docs.forEach((doc) => {
      const { recommends, keywords } = doc.data();

      (recommends ? recommends : []).forEach((recommend) => {
        if (recommendFreq[recommend.title] === undefined) {
          recommendFreq[recommend.title] = 1;
          recommendsResult.push(recommend);
        }
      });

      keywords.forEach((keyword) => {
        if (keywordFreq[keyword] === undefined) {
          keywordFreq[keyword] = 1;
        } else {
          keywordFreq[keyword] += 1;
        }
      });
    });
    return res.status(200).json({
      bookmarkListId,
      keywords: keywordFreq,
      recommends: recommendsResult,
    });
  } catch (e) {
    return next(e);
  }
};

const postBookmark = async (req, res, next) => {
  const { bookmarkListId } = req.params;
  const { url: bookmarkUrl } = req.body;
  try {
    const { url, description, title, image, content } = await extract(
      bookmarkUrl
    );

    //TODO 중복 체크해줘야댐

    const lineBreakRemovedContent = content.replace(/\n/g, " ");
    const codeRemovedContent = lineBreakRemovedContent.replace(
      /<\s*code[^>]*>(.*?)<\s*\/\s*code>/g,
      ""
    );
    const weightParseContent = codeRemovedContent.match(
      /<\s*(b|strong|h1|h2|h3|h4|h5)[^>]*>(.*?)<\s*\/\s*(b|strong|h1|h2|h3|h4|h5)>/g
    );
    const weightContent =
      weightParseContent && weightParseContent.length
        ? weightParseContent
            .map((str) => str.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, ""))
            .join(" ")
        : "";

    const mainContent = codeRemovedContent
      .replace(/(<("[^"]*"|'[^']*'|[^'">])*>|&(.*);)/g, "")
      .replaceAll("  ", " ");

    const task = new mod.TaskQueue();

    let titleKeywords = await new Promise((resolve, reject) => {
      mod.ExecuteMorphModule(title, function (err, rep) {
        if (err) {
          reject(err);
        }

        let wordFreqMap = {};
        rep.morphed.forEach(({ word, tag }) => {
          if (["NNG", "NNP", "SL"].includes(tag)) {
            if (wordFreqMap[word] === undefined) {
              wordFreqMap[word] = 1;
            }
          }
        });
        resolve(wordFreqMap);
      });
    });

    let weightKeywords = await new Promise((resolve, reject) => {
      mod.ExecuteMorphModule(weightContent, function (err, rep) {
        if (err) {
          reject(err);
        }

        let wordFreqMap = {};
        rep.morphed.forEach(({ word, tag }) => {
          if (["NNP", "SL"].includes(tag)) {
            if (wordFreqMap[word] === undefined) {
              wordFreqMap[word] = 1;
            }
          }
        });
        resolve(wordFreqMap);
      });
    });

    let keywordsCandidates = await new Promise((resolve, reject) => {
      mod.ExecuteMorphModule(mainContent, function (err, rep) {
        if (err) {
          reject(err);
        }

        let wordFreqMap = {};
        rep.morphed.forEach(({ word, tag }) => {
          if (["NNP", "SL"].includes(tag)) {
            if (wordFreqMap[word] !== undefined) {
              wordFreqMap[word] += 1;
            } else {
              wordFreqMap[word] = 1;
            }
          }
        });
        resolve(wordFreqMap);
      });
    });

    /*
     *
     * 가중치 기반 키워드 추출
     *
     * 고유명사와 외래어를 포함한 빈출 키워드 가중치에
     * 제목 형태소에 10점
     * b, string, 소제목(h1, h2, h3, h4, h5)에 반복되어 나오는 키워드 5점
     * 해서 상위 10개 도출하고 10개 단어 중에, 10을 못넘으면 안됨
     * 추천 링크 같은 경우는 queue에 넣어서 병렬적으로 돌려야함(시간이 너무 많이걸림)
     * */

    const keywords = Object.entries(keywordsCandidates)
      .map(([str, weight]) => {
        if (titleKeywords[str] !== undefined) {
          return [str, weight + 7];
        }
        if (weightKeywords[str] !== undefined) {
          return [str, weight + 5];
        }
        return [str, weight];
      })
      .concat(
        Object.entries(titleKeywords)
          .filter(([str]) => keywordsCandidates[str] === undefined)
          .map(([str]) => [str, 7])
      )
      .filter(([str, weight]) => str.length > 1 && weight > 5)
      .sort((prev, post) => post[1] - prev[1])
      .map((v) => v[0])
      .slice(0, 3);

    const bookmarkId = String(stringHash(url + bookmarkListId));

    const ref = admin.firestore().collection("bookmarks").doc(bookmarkId);
    const isRefExist = await ref.get();

    if (isRefExist.exists) {
      return res.status(400).json({ error: "이미 북마크에 있습니다" });
    }

    await ref.set({
      id: bookmarkId,
      bookmarkListId,
      title,
      keywords,
      url: bookmarkUrl,
      recommends: null,
    });

    return res.status(201).json({
      id: bookmarkId,
      bookmarkListId,
      title,
      description,
      keywords: keywords,
      image,
      url,
    });
  } catch (e) {
    return next(e);
  }
};

module.exports = {
  postBookmark,
  getRecommends,
};
