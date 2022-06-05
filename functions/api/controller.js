const { extract } = require("article-parser/dist/cjs/article-parser.js");
const admin = require("firebase-admin");
const stringHash = require("string-hash");
const axios = require("axios");

const postKoNLP = async (content) => {
  const { data } = await axios.post(
    "https://konlp-docker.herokuapp.com/analyze",
    {
      content,
    }
  );

  return data;
};

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

    const emojiRegex =
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;

    const [titleKeywords, weightKeywords, keywordsCandidates] =
      await Promise.all(
        [title, weightContent, mainContent]
          .map((content) => content.replace(emojiRegex, ""))
          .map((content) => postKoNLP(content))
      );

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
