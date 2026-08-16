/** @type {import('./_kostori_.js')} */
class NewAnimeSource extends AnimeSource {
    // Note: The fields which are marked as [Optional] should be removed if not used

    // name of the source
    name = ""

    // unique id of the source (only letters, digits and underscore)
    key = ""

    version = "1.0.0"

    // [Optional] minimum app version required by this source, e.g. "1.4.0"
    minAppVersion = "1.4.0"

    // [Optional] update url
    url = ""

    // [Optional] whether this source is a bangumi source
    isBangumi = false

    // [Optional] base url of the site. It can be a getter so that it is dynamic.
    // `host` is an alias of `baseUrl`.
    get baseUrl() {
        return "https://example.com"
    }

    // [Optional] default http headers applied to every request of this source
    httpHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    }

    /**
     * [Optional] init function, called after the source is loaded
     */
    init() {

    }

    // [Optional] account related
    account = {
        /**
         * [Optional] login with account and password, return any value to indicate success.
         * `account` and `pwd` will be saved to local storage automatically if login success.
         * @param account {string}
         * @param pwd {string}
         * @returns {Promise<any>}
         */
        login: async (account, pwd) => {
            /*
            ```
            let res = await Network.post('https://example.com/login', {
                'content-type': 'application/x-www-form-urlencoded;charset=utf-8'
            }, `account=${account}&password=${pwd}`)

            if(res.status == 200) {
                let json = JSON.parse(res.body)
                this.saveData('token', json.token)
                return 'ok'
            }

            throw 'Failed to login'
            ```
            */
        },

        /**
         * [Optional] login with webview
         */
        loginWithWebview: {
            url: "",
            /**
             * check login status
             * @param url {string} - current url
             * @param title {string} - current title
             * @returns {boolean} - return true if login success
             */
            checkStatus: (url, title) => {

            },
            /**
             * [Optional] Callback when login success
             */
            onLoginSuccess: () => {

            },
        },

        /**
         * [Optional] login with cookies
         * Note: If `this.account.login` is implemented, this will be ignored
         */
        loginWithCookies: {
            fields: [
                "ipb_member_id",
                "ipb_pass_hash",
                "igneous",
                "star",
            ],
            /**
             * Validate cookies, return false if cookies are invalid.
             * Use `Network.setCookies` to set cookies before validate.
             * @param values {string[]} - same order as `fields`
             * @returns {Promise<boolean>}
             */
            validate: async (values) => {

            },
        },

        /**
         * [Optional] logout function, clear account related data
         */
        logout: () => {
            /*
            ```
            this.deleteData('token')
            Network.deleteCookies('https://example.com')
            ```
            */
        },

        // [Optional] register url
        registerWebsite: null
    }

    /*
     [Optional] category related (a navigation page with a list of categories)
     It is shown on the source's explore page.
    */
    category = {
        // title of the category page
        title: "分类",

        // [Optional] whether to show a ranking page
        enableRankingPage: false,

        // the list of category parts
        parts: [
            {
                // name of the part
                name: "类型",
                // type: fixed, random, dynamic
                type: "fixed",
                // a list of category items, each item has `label` and `target`
                categories: [
                    {
                        label: "动画",
                        target: {
                            // page: category, search, search_with_namespace
                            page: "category",
                            attributes: {
                                // category name (must match the `name` in categoryAnimes)
                                category: "动画",
                                // [Optional] param passed to categoryAnimes.load
                                param: null,
                            },
                        },
                    },
                ],
            },
            {
                name: "类型(随机)",
                type: "random",
                // [Optional] number of random categories to show
                randomNumber: 1,
                categories: [
                    {
                        label: "动画",
                        target: { page: "category", attributes: { category: "动画" } },
                    },
                ],
            },
            {
                name: "动态分类",
                type: "dynamic",
                // a loader function that returns a list of category items
                loader: async () => {
                    /*
                    ```
                    return [
                        { label: '动画', target: { page: 'category', attributes: { category: '动画' } } },
                    ]
                    ```
                    */
                },
            },
        ],
    }

    /*
     [Optional] categoryAnimes related (load the anime list of a category)
     Must be implemented if `category` is implemented.
    */
    categoryAnimes = {
        // [Optional] options for the category anime list
        optionList: [
            {
                // label of the option
                label: "排序",
                // a list of options, format: "value-text"
                options: [
                    "0-时间",
                    "1-人气",
                ],
                // [Optional] when to show this option
                showWhen: null,
                // [Optional] when to hide this option
                notShowWhen: [],
            },
        ],

        /**
         * [Optional] loader for dynamic options
         * @param category {string}
         * @param param {string | null}
         * @returns {Promise<Array<{label: string, options: string[], showWhen: string[] | null, notShowWhen: string[]}>>}
         */
        optionLoader: async (category, param) => {

        },

        /**
         * load the anime list of a category
         * @param category {string}
         * @param param {string | null}
         * @param options {string[]} - selected option values
         * @param page {number}
         * @returns {Promise<{animes: Anime[], maxPage: number}>}
         */
        load: async (category, param, options, page) => {
            /*
            ```
            let res = await Network.get(`https://example.com/list?category=${category}&page=${page}`)
            if(res.status !== 200) throw `Invalid status code: ${res.status}`
            let data = JSON.parse(res.body)

            function parseAnime(anime) {
                return new Anime({
                    id: anime.id,
                    title: anime.title,
                    cover: anime.cover,
                })
            }

            return {
                animes: data.list.map(parseAnime),
                maxPage: data.maxPage,
            }
            ```
            */
        },

        // [Optional] ranking page
        ranking: {
            // a list of ranking options, format: "value-text"
            options: [
                "day-日榜",
                "week-周榜",
            ],
            /**
             * load the ranking list
             * @param option {string} - selected option value
             * @param page {number}
             * @returns {Promise<{animes: Anime[], maxPage: number}>}
             */
            load: async (option, page) => {

            },
        },
    }

    /*
     [Optional] explore page list (the home page of the source)
     Shown as tabs on the source's explore page.
    */
    /*
     explore 的 viewMore 与 category 的 target 都是 PageJumpTarget，支持两种写法：

     - Map 写法（推荐）：
       { page: 'category', attributes: { category: '分类名', param: 'xxx' }, url: 'https://...' }
       url 可选：提供后二级页面右上角会显示"打开网页"入口。

     - String 写法（旧版，兼容）：
       `search:关键词`
       `category:分类名`
       `category:分类名@param`   // @ 后为 param，传给 categoryAnimes.load
     */
    explore = [
        /*
         Type 1: singlePageWithMultiPart
         One page with multiple parts (sections), loaded once.
        */
        {
            // title of the page, must be unique
            title: "首页",
            type: "singlePageWithMultiPart",
            /**
             * @returns {Promise<{title: string, animes: Anime[], viewMore: PageJumpTarget?}[]>}
             */
            load: async () => {
                /*
                ```
                let res = await Network.get("https://example.com/home")
                if(res.status !== 200) throw `Invalid status code: ${res.status}`
                let data = JSON.parse(res.body)

                function parseAnime(anime) {
                    return new Anime({
                        id: anime.id,
                        title: anime.title,
                        cover: anime.cover,
                    })
                }

                return [
                    {
                        title: "热门",
                        animes: data.hot.map(parseAnime),
                        viewMore: { page: 'category', attributes: { category: '热门' } },
                    },
                    {
                        title: "最新",
                        animes: data.latest.map(parseAnime),
                    },
                ]
                ```
                */
            },
        },

        /*
         Type 2: multiPageAnimeList
         A paged anime list. Implement either `load` (page-based) or `loadNext` (token-based).
        */
        {
            title: "列表",
            type: "multiPageAnimeList",
            /**
             * [Optional] load a page (1-based). If implemented, `loadNext` is ignored.
             * @param page {number}
             * @returns {Promise<{animes: Anime[], maxPage: number}>}
             */
            load: async (page) => {
                /*
                ```
                let res = await Network.get(`https://example.com/list?page=${page}`)
                if(res.status !== 200) throw `Invalid status code: ${res.status}`
                let data = JSON.parse(res.body)

                function parseAnime(anime) {
                    return new Anime({
                        id: anime.id,
                        title: anime.title,
                        cover: anime.cover,
                    })
                }

                return {
                    animes: data.list.map(parseAnime),
                    maxPage: data.maxPage,
                }
                ```
                */
            },
            /**
             * [Optional] load with a next-page token. Only used if `load` is not implemented.
             * @param next {string | null} - null if first page
             * @returns {Promise<{animes: Anime[], next: string | null}>}
             */
            loadNext: async (next) => {

            },
        },

        /*
         Type 3: mixed
         A mixed list that may contain both anime lists and parts.
         `page` is used as a 0-based index.
        */
        {
            title: "混合",
            type: "mixed",
            /**
             * @param page {number} - 0-based index
             * @returns {Promise<{data: Array<Anime[] | {title: string, animes: Anime[], viewMore: PageJumpTarget?}>, maxPage: number?}>}
             */
            load: async (page) => {
                /*
                ```
                return {
                    data: [
                        animes,              // an array of Anime
                        {                     // or a part
                            title: "标题",
                            animes: animes,
                            viewMore: null,
                        },
                    ],
                    maxPage: null,
                }
                ```
                */
            },
        },
    ]

    /// search related
    search = {
        /**
         * [Optional] load search result (page-based). If implemented, `loadNext` is ignored.
         * @param keyword {string}
         * @param options {string[]} - selected option values from optionList
         * @param page {number}
         * @returns {Promise<{animes: Anime[], maxPage: number}>}
         */
        load: async (keyword, options, page) => {
            /*
            ```
            let res = await Network.get(`https://example.com/search?q=${keyword}&page=${page}`)
            if(res.status !== 200) throw `Invalid status code: ${res.status}`
            let data = JSON.parse(res.body)

            function parseAnime(anime) {
                return new Anime({
                    id: anime.id,
                    title: anime.title,
                    subTitle: anime.author,
                    cover: anime.cover,
                    tags: anime.tags,
                    description: anime.description,
                })
            }

            return {
                animes: data.list.map(parseAnime),
                maxPage: data.maxPage,
            }
            ```
            */
        },

        /**
         * [Optional] load search result with next-page token. Only used if `load` is not implemented.
         * @param keyword {string}
         * @param options {string[]} - selected option values from optionList
         * @param next {string | null}
         * @returns {Promise<{animes: Anime[], next: string | null}>}
         */
        loadNext: async (keyword, options, next) => {

        },

        // [Optional] options for search
        optionList: [
            {
                // [Optional] default is `select`
                // type: select, multi-select, dropdown
                // select: one selected value at most
                // multi-select: multiple selected values or none. `load` receives a json string (array of values)
                // dropdown: one selected value at most; if none, `load` receives null
                type: "select",
                // a list of options, format: "value-text"
                options: [
                    "0-时间",
                    "1-人气",
                ],
                // option label
                label: "排序",
                // [Optional] default selected option value. If not set, use the first option.
                default: null,
            }
        ],
    }

    /// single anime related
    anime = {
        /**
         * load anime info
         * @param id {string}
         * @returns {Promise<AnimeDetails>}
         */
        loadInfo: async (id) => {
            /*
            ```
            let res = await Network.get(`https://example.com/detail/${id}`)
            if(res.status !== 200) throw `Invalid status code: ${res.status}`
            let doc = new HtmlDocument(Convert.decodeUtf8(res.body))

            let title = doc.querySelector('h1.title')?.text.trim() ?? ''
            let cover = doc.querySelector('img.cover')?.attributes.src ?? ''
            let description = doc.querySelector('.description')?.text.trim() ?? ''

            // episode: a map of episode id to episode title, or a map of group name to (episode id -> title)
            let episode = {}
            let epElements = doc.querySelectorAll('.episode a')
            epElements.forEach(e => {
                let href = e.attributes.href ?? ''
                let epId = href.split('/').pop() ?? ''
                let title = e.text.trim() ?? ''
                episode[epId] = title
            })

            return new AnimeDetails({
                title: title,
                cover: cover,
                description: description,
                episode: episode,
            })
            ```
            */
        },

        /**
         * load play url of a chapter
         * @param animeId {string}
         * @param epId {string?}
         * @returns {Promise<string | {url: string, headers?: Object, audioTracks?: Object[], subtitleTracks?: Object[], videoStreams?: Object[], container?: string, playSessionId?: string}>}
         * 返回播放地址（String）；或返回结构化对象携带媒体信息：
         * - `headers` 播放请求头（如鉴权）
         * - `audioTracks` 音轨 `[{ index, language, title, codec, channels }]`
         * - `subtitleTracks` 字幕 `[{ index, language, title, codec }]`
         * - `videoStreams` 视频流/清晰度 `[{ index, width, height, bitrate, codec, name }]`
         * - `container` 容器格式、`playSessionId` 转码会话
         */
        loadEp: async (animeId, epId) => {
            /*
            ```
            let res = await Network.get(`https://example.com/play/${epId}`)
            if(res.status !== 200) throw `Invalid status code: ${res.status}`
            let doc = new HtmlDocument(Convert.decodeUtf8(res.body))
            let raw = doc.querySelector('body')?.innerHTML ?? ''
            let m = raw.match(/https?:\/\/[^"']+\.m3u8[^"']*?/)
            if(m) return m[0]
            return ''
            ```
            */
        },

        /**
         * [Optional] 播放进度上报（播放中每 10s 调用；如 emby 同步历史到服务端）
         * @param url {string} - 播放地址（源从中提取条目 id）
         * @param positionMs {number}
         * @param durationMs {number}
         * @param playing {boolean}
         * @param playSessionId {string?}
         * @returns {Promise<any>}
         */
        playbackProgress: async (url, positionMs, durationMs, playing, playSessionId) => {

        },

        /**
         * [Optional] 播放停止上报（退出播放器时调用）
         * @param url {string}
         * @param positionMs {number}
         * @param playSessionId {string?}
         * @returns {Promise<any>}
         */
        playbackStopped: async (url, positionMs, playSessionId) => {

        },

        /**
         * [Optional] 通用源操作，按约定 action 处理：
         * favorite / delete / markPlayed / clearPlayback / rate /
         * sendComment / likeAnime / likeComment / voteComment / loadComments
         * @param action {string}
         * @param params {Object}
         * @returns {Promise<any>}
         */
        sourceAction: async (action, params) => {

        },

        /**
         * [Optional] load comments
         * @param id {string}
         * @param subId {string?}
         * @param page {number}
         * @param replyTo {string?}
         * @returns {Promise<{comments: Comment[], maxPage: number}>}
         */
        loadComments: async (id, subId, page, replyTo) => {

        },

        /**
         * [Optional] send a comment
         * @param id {string}
         * @param subId {string?}
         * @param content {string}
         * @param replyTo {string?}
         * @returns {Promise<any>}
         */
        sendComment: async (id, subId, content, replyTo) => {

        },

        /**
         * [Optional] like or unlike an anime
         * @param id {string}
         * @param isLiking {boolean}
         * @returns {Promise<any>}
         */
        likeAnime: async (id, isLiking) => {

        },

        /**
         * [Optional] vote a comment (upvote / downvote)
         * @param id {string}
         * @param subId {string?}
         * @param commentId {string}
         * @param isUp {boolean}
         * @param isCancel {boolean}
         * @returns {Promise<number>} - the new vote status: 1 upvote, -1 downvote, 0 none
         */
        voteComment: async (id, subId, commentId, isUp, isCancel) => {

        },

        /**
         * [Optional] like or unlike a comment
         * @param id {string}
         * @param subId {string?}
         * @param commentId {string}
         * @param isLiking {boolean}
         * @returns {Promise<number>} - the new like status
         */
        likeComment: async (id, subId, commentId, isLiking) => {

        },

        /**
         * [Optional] load thumbnails (for multi-page thumbnails)
         * @param id {string}
         * @param next {string?}
         * @returns {Promise<{thumbnails: string[], next: string?}>}
         */
        loadThumbnails: async (id, next) => {

        },

        /**
         * [Optional] image loading config (e.g. add referer header to image requests)
         * @param imageKey {string}
         * @param animeId {string}
         * @param ep {string?}
         * @returns {ImageLoadingConfig | Promise<ImageLoadingConfig>}
         */
        onImageLoad: (imageKey, animeId, ep) => {

        },

        /**
         * [Optional] thumbnail loading config
         * @param imageKey {string}
         * @returns {ImageLoadingConfig}
         */
        onThumbnailLoad: (imageKey) => {

        },

        /**
         * [Optional] rate an anime (0-5)
         * @param id {string}
         * @param rating {number} - 0-5
         * @returns {Promise<any>}
         */
        starRating: async (id, rating) => {

        },

        // [Optional] regex string used to identify anime id from user input
        idMatch: null,

        /**
         * [Optional] handle tag click event
         * @param namespace {string}
         * @param tag {string}
         * @returns {PageJumpTarget | null}
         */
        onClickTag: (namespace, tag) => {
            return {
                action: 'search',
                keyword: tag,
            }
        },

        /**
         * [Optional] handle links
         */
        link: {
            /**
             * set accepted domains
             */
            domains: [
                'example.com'
            ],
            /**
             * parse url to anime id
             * @param url {string}
             * @returns {string | null}
             */
            linkToId: (url) => {

            }
        },

        // [Optional] enable tags translate
        enableTagsTranslate: false,
    }

    /*
    [Optional] settings related
    Use `this.loadSetting` to load a setting value.
    ```
    let setting1Value = this.loadSetting('setting1')
    console.log(setting1Value)
    ```
     */
    settings = {
        setting1: {
            // title
            title: "Setting1",
            // type: input, select, switch, callback
            type: "select",
            // [Optional] options, only for `select` type
            options: [
                {
                    // value
                    value: 'o1',
                    // [Optional] text, if not set, use value as text
                    text: 'Option 1',
                },
            ],
            default: 'o1',
        },
        setting2: {
            title: "Setting2",
            type: "switch",
            default: true,
        },
        setting3: {
            title: "Setting3",
            type: "input",
            // [Optional] regex string to validate the input
            validator: null,
            default: '',
        },
        setting4: {
            title: "Setting4",
            type: "callback",
            buttonText: "Click me",
            /**
             * callback function.
             * If it returns a Promise, the button shows a loading indicator until resolved.
             * @returns {void | Promise<any>}
             */
            callback: () => {
                // do something
            }
        }
    }

    // [Optional] translations for the strings in this config
    translation = {
        'zh_CN': {
            'Setting1': '设置1',
            'Setting2': '设置2',
            'Setting3': '设置3',
        },
        'zh_TW': {},
        'en': {}
    }
}
