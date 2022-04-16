# 스북 토픽 서버

## todo

- [x] POST `/bookmark/{bookmarkListId}/new` : 새로운 북마크 등록 위해 URL을 body로 받음
    - [x] 키워드 추출 : 본문 파싱, 형태소 분석 및 키워드 추출 구현
    - [x] bookmarkListId - keyword 바인딩한 형태로 DB에 저장 : `id - ['dd', 'ddd', 'dd']`
    - [x] 추천 URL 확보 : 키워드 기반으로 Google 검색 이용해 내용 확보한 후, DB에 저장 `'dd' - [1,2,3]`
        - 쿼리 쓸때 **이미 있는 경우** 주의
- [x] GET `/bookmark/{bookmarkListId}/insight`
    - [x] 해당 id에 바인딩된 키워드들 반환
    - [x] 해당 id에 바인딩된 키워드들의 추천 링크 반환

## Spec

### POST `/bookmark/{bookmarkListId}/new`

#### request body

```json
{
  "url": "https://maxkim-j.github.io/posts/suspense-argibraic-effect"
}
```

#### response body

```json
{
  "bookmarkListId": 11,
  "title": "",
  "description": "",
  "img": "",
  "url": "",
  "keywords": ["react", "효과"]
}
```

### GET `/bookmark/{bookmarkListId}/insight`

#### response body

```json
{
  "bookmarkListId": 11,
  "keywords": [
    "react",
    "효과"
  ],
  "relatedUrl": [{
    "keyword": "react",
    "urls": [
      {
        "id": 0,
        "title": "",
        "description": "",
        "img": "",
        "url": "",
        "keywords": ["", "", ""],
        "createdAt": "",
        "importance": 5,
        "memo": ""
      },
      {
        "id": 1,
        "title": "",
        "description": "",
        "img": "",
        "url": "",
        "keywords": ["", "", ""],
        "createdAt": "",
        "importance": 5,
        "memo": ""
      }
    ]
  },
    {
      "keyword": "design",
      "urls": [
        {
          "id": 0,
          "title": "",
          "description": "",
          "img": "",
          "url": "",
          "keywords": ["", "", ""],
          "createdAt": "",
          "importance": 5,
          "memo": ""
        },
        {
          "id": 1,
          "title": "",
          "description": "",
          "img": "",
          "url": "",
          "keywords": ["", "", ""],
          "createdAt": "",
          "importance": 5,
          "memo": ""
        }
      ]
    }]
}
```

## 스택

- node, express
- [article parser](https://github.com/ndaidong/article-parser)
- [NodeJS-KoalaNLP](https://koalanlp.github.io/nodejs-support/)
- firebase functions, firestore
