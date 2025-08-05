/** @type {import('./_kostori_.js')} */
class NewAnimeSource extends AnimeSource {
    // Note: The fields which are marked as [Optional] should be removed if not used

    // name of the source
    name = ""

    // unique id of the source
    key = ""

    version = "1.0.0"

    minAppVersion = "1.4.0"

    // update url
    url = ""

    /**
     * [Optional] init function
     */
    init() {

    }

    // [Optional] account related
    account = {
        /**
         * [Optional] login with account and password, return any value to indicate success
         * @param account {string}
         * @param pwd {string}
         * @returns {Promise<any>}
         */
        login: async (account, pwd) => {
            /*
            Use Network to send request
            Use this.saveData to save data
            `account` and `pwd` will be saved to local storage automatically if login success
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
             *
             * Use `Network.setCookies` to set cookies before validate.
             * @param values {string[]} - same order as `fields`
             * @returns {Promise<boolean>}
             */
            validate: async (values) => {

            },
        },

        /**
         * logout function, clear account related data
         */
        logout: () => {
            /*
            ```
            this.deleteData('token')
            Network.deleteCookies('https://example.com')
            ```
            */
        },

        // {string?} - register url
        registerWebsite: null
    }

    // explore page list
    explore = [
        {
            // title of the page.
            // title is used to identify the page, it should be unique
            title: "",

            /// multiPartPage or multiPageAnimeList or mixed
            type: "multiPartPage",

            /**
             * load function
             * @param page {number | null} - page number, null for `singlePageWithMultiPart` type
             * @returns {{}}
             * - for `multiPartPage` type, return [{title: string, animes: Anime[], viewMore: PageJumpTarget}]
             * - for `multiPageAnimeList` type, for each page(1-based), return {animes: Anime[], maxPage: number}
             * - for `mixed` type, use param `page` as index. for each index(0-based), return {data: [], maxPage: number?}, data is an array contains Anime[] or {title: string, animes: Anime[], viewMore: string?}
             */
            load: async (page) => {
                /*
                ```
                let res = await Network.get("https://example.com")

                if (res.status !== 200) {
                    throw `Invalid status code: ${res.status}`
                }

                let data = JSON.parse(res.body)

                function parseAnime(anime) {
                    // ...

                    return new Anime({
                        id: id,
                        title: title,
                        subTitle: author,
                        cover: cover,
                        tags: tags,
                        description: description
                    })
                }

                let animes = {}
                animes["hot"] = data["results"]["recAnimes"].map(parseAnime)
                animes["latest"] = data["results"]["newAnimes"].map(parseAnime)

                return animes
                ```
                */
            },

            /**
             * Only use for `multiPageAnimeList` type.
             * `loadNext` would be ignored if `load` function is implemented.
             * @param next {string | null} - next page token, null if first page
             * @returns {Promise<{animes: Anime[], next: string?}>} - next is null if no next page.
             */
            loadNext(next) {},
        }
    ]

    /// search related
    search = {
        /**
         * load search result
         * @param keyword {string}
         * @param options {string[]} - options from optionList
         * @param page {number}
         * @returns {Promise<{animes: Anime[], maxPage: number}>}
         */
        load: async (keyword, options, page) => {
            /*
            ```
            let data = JSON.parse((await Network.get('...')).body)
            let maxPage = data.maxPage

            function parseAnime(anime) {
                // ...

                return new Anime({
                    id: id,
                    title: title,
                    subTitle: author,
                    cover: cover,
                    tags: tags,
                    description: description
                })
            }

            return {
                animes: data.list.map(parseAnime),
                maxPage: maxPage
            }
            ```
            */
        },

        /**
         * load search result with next page token.
         * The field will be ignored if `load` function is implemented.
         * @param keyword {string}
         * @param options {(string)[]} - options from optionList
         * @param next {string | null}
         * @returns {Promise<{animes: Anime[], maxPage: number}>}
         */
        loadNext: async (keyword, options, next) => {

        },

        // provide options for search
        optionList: [
            {
                // [Optional] default is `select`
                // type: select, multi-select, dropdown
                // For select, there is only one selected value
                // For multi-select, there are multiple selected values or none. The `load` function will receive a json string which is an array of selected values
                // For dropdown, there is one selected value at most. If no selected value, the `load` function will receive a null
                type: "select",
                // For a single option, use `-` to separate the value and text, left for value, right for text
                options: [
                    "0-time",
                    "1-popular"
                ],
                // option label
                label: "sort",
                // default selected options. If not set, use the first option as default
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

        },
        /**
         * load Url of a chapter
         * @param animeId {string}
         * @param epId {string?}
         * @returns {Promise<{Url: string}>}
         */
        loadEp: async (animeId, epId) => {
        },
        // {string?} - regex string, used to identify anime id from user input
        idMatch: null,

        onClickTag: (namespace, tag) => {
        },
        /**
         * [Optional] Handle links
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
        // enable tags translate
        enableTagsTranslate: false,
    }


    /*
    [Optional] settings related
    Use this.loadSetting to load setting
    ```
    let setting1Value = this.loadSetting('setting1')
    console.log(setting1Value)
    ```
     */
    settings = {
        setting1: {
            // title
            title: "Setting1",
            // type: input, select, switch
            type: "select",
            // options
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
            validator: null, // string | null, regex string
            default: '',
        },
        setting4: {
            title: "Setting4",
            type: "callback",
            buttonText: "Click me",
            /**
             * callback function
             *
             * If the callback function returns a Promise, the button will show a loading indicator until the promise is resolved.
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