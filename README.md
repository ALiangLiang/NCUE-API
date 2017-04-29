# NCUE-API

### 宗旨

為彰師大的系統建立一套可以自由使用的 API，每個人都可以自由使用、改進，並建立依附此 API 系統的應用程式，但必須遵從 [MIT 條款](https://github.com/ALiangLiang/NCUE-API/blob/master/LICENSE)。

```js
const
  api = require('ncue-api'),
  jar = api.jar() // 建立 cookie 罐。

api.login(jar, 'S0254003', 'ncuecsie') // 登入。
  .then((result) => {
    if(result) {
      console.log('登入成功')
      api.getScore(jar)
        .then((scores) => console.log(scores)) // 輸出成績資料。
    } else
      console.error('登入失敗')
  })
```

### 文件

[https://aliangliang.github.io/NCUE-API/](https://aliangliang.github.io/NCUE-API/)

### 使用說明

#### 安裝
```sh
npm i ncue-api --save
```

#### 引用
```js
const api = require('ncue-api')
```

#### cookie 儲藏
[RequestJar](https://github.com/request/request) 為 Request 套件的 [jar](https://github.com/request/request/blob/master/lib/cookies.js) 物件，可直接使用來新建新的 cookie 罐。
```js
const jar = require('ncue-api').jar()
```

### TODO

- [x] APP 端登入 (aps.ncue.edu.tw)
- [x] 線上報名系統
- [x] 歷年成績
- [ ] 課表
- [ ] 個人資料 (姓名、性別、系級)

### 我們的小默契

code 裡的註解請使用中文，其餘變數與函數名稱，請採用英文與[小駝峰式命名法](https://zh.wikipedia.org/wiki/%E9%A7%9D%E5%B3%B0%E5%BC%8F%E5%A4%A7%E5%B0%8F%E5%AF%AB)，coding style "盡量"使用 [standard style](https://github.com/feross/standard/blob/master/docs/README-zhtw.md)。

若中英文夾雜，請在連接處加上空格，英文與標點符號間不用若為非全英文句子，請使用全形標點符號，例如「我愛 ALiangLIang 阿良良萬歲，yo！man。」

### commit 規範

- commit 訊息也請盡量使用中文。
- 新增功能或文件等等，請在訊息開頭加上「新增 」，例如「新增 getEvents API」
- 變更內容，請在訊息開頭加上「更新 」，例如「更新 getScore API 的參數需求」
- 修復 bug，，請在訊息開頭加上「修復 」，例如「修復 登入不穩定的狀況」
- 其餘狀況請盡量依照「XX XXXXX」的格式，開頭用簡短的二到四個字告知此 commit 的類型，後面加個空格後，描述此次 commit。
