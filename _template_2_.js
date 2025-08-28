/** @type {import('./_kostori_.js')} */
class NewAnimeSource extends AnimeSource {

    name = ""

    key = ""

    version = "1.0.0"

    minAppVersion = "1.0.0"

    url = ""

    init() {}

    explore = [
        {
            title: "",

            type: "mixed",

            load: async (page) => {

                return {
                    data: animeList,
                    maxPage: maxPage
                }  // 返回包含所有动漫信息的数组
            }
        },
    ]

    static category_param_dict = {
        "": ""
    }

    category = {
        title: "",
        parts: [
            {
                name: '',
                type: 'fixed',
                categories: Object.keys(NewAnimeSource.category_param_dict),
                categoryParams: Object.values(NewAnimeSource.category_param_dict),
                itemType: "category"
            }
        ]
    }

    categoryAnimes = {
        load: async (category, param, options, page) => {
            let res = await Network.get(`${this.baseUrl}`,{})
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            document.dispose()
            return {
                animes: animes,
                maxPage: 2000
            }
        },
        optionList: [
            {
                options: [
                ],
            },
            {
                options: [
                ]
            },

        ],

    }

    search = {
        load:async (keyword,searchOption,page) => {

            return {
                animes: animes,
                maxPage: maxPage
            }
        },
        optionList: [

        ]
    }

    anime = {
        loadInfo: async (id) => {

        },
        loadEp: async (animeId, epId) => {
            return epId
        },
        onClickTag: (namespace, tag) => {
            return {
                action: 'search',
                keyword: tag,
            }
        },
    }

    settings = {

    }

    translation = {
    }
}