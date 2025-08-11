/** @type {import('./_kostori_.js')} */
class NewAnimeSource extends AnimeSource {

    name = ""

    key = ""

    version = "1.0.0"

    minAppVersion = "1.0.0"

    url = ""

    init() {

    }

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

    search = {
        load:async (keyword,searchOption,page) => {

            return {
                animes: animes,
                maxPage: maxPage
            }
        }
    }

    anime = {
        loadInfo: async (id) => {

        },
        loadEp: async (animeId, epId) => {
            return epId
        },
        onClickTag: (namespace, tag) => {

        },
    }

    settings = {

    }

    translation = {
    }
}