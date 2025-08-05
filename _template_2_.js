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

    ]

    search = {
    }

    anime = {
        loadInfo: async (id) => {},
        loadEp: async (animeId, epId) => {},
        onClickTag: (namespace, tag) => {},
    }

    settings = {

    }

    translation = {
    }
}