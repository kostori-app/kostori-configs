/** @type {import('./_kostori_.js')} */
class Iwara extends AnimeSource {

    name = "iwara"

    key = "iwara"

    version = "1.0.3"

    minAppVersion = "1.0.0"

    url = "https://raw.githubusercontent.com/kostori-app/kostori-configs/master/iwara.js"

    init() {}

    get baseUrl(){
        return 'https://api.iwara.tv/'
    }

    get baseImgUrl(){
        return 'https://i.iwara.tv/image/'
    }

    get headers() {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'Connection': 'keep-alive',
            'Referer': 'https://api.iwara.tv',
        }
    }

    get rating(){
        return this.loadSetting('rating')
    }

    parseAnime(a) {
        let id = a.id;
        let title = a.title;
        let author = a.user.name;
        let durationInSeconds = a.file.duration ?? 0
        let minutes = Math.floor(durationInSeconds / 60);
        let seconds = Math.floor(durationInSeconds % 60);
        let formattedDuration = `${minutes}分${seconds}秒`;
        let subtitle = `${author} | ${formattedDuration}`;
        if(durationInSeconds === 0) {
            subtitle = author
        }
        let cover = `${this.baseImgUrl}original/${a.file.id}/thumbnail-01.jpg`
        let tags = a.tags.map(a => a.id)

        return new Anime({
            id: id,
            title: title,
            subtitle: author,
            cover: cover,
            tags: tags ?? [],
            description: subtitle,
        });
    }

    explore = [
        {
            title: "iwara趋势",

            type: "mixed",

            load: async (page) => {
                let startIndex = page - 1;
                let res = await Network.get(`${this.baseUrl}videos?sort=trending&page=${startIndex}&limit=40&rating=${this.rating}`,this.headers)
                if(res.status !== 200) {
                    throw `Invalid Status Code ${res.status}`
                }
                let json = JSON.parse(res.body)
                let animes = json.results.map(a => this.parseAnime(a))
                let maxPage = json.count <= 40 ? 1
                    : Math.ceil(json.count / 40);
                let animeList = []
                animeList.push(animes)
                return {
                    data: animeList,
                    maxPage: maxPage
                }  // 返回包含所有动漫信息的数组
            }
        },{
            title: "iwara最新",

            type: "mixed",

            load: async (page) => {
                let startIndex = page - 1;
                let res = await Network.get(`${this.baseUrl}videos?sort=date&page=${startIndex}&limit=40&rating=${this.rating}`,this.headers)
                if(res.status !== 200) {
                    throw `Invalid Status Code ${res.status}`
                }
                let json = JSON.parse(res.body)
                let animes = json.results.map(a => this.parseAnime(a))
                let maxPage = json.count <= 40 ? 1
                    : Math.ceil(json.count / 40);
                let animeList = []
                animeList.push(animes)
                return {
                    data: animeList,
                    maxPage: maxPage
                }  // 返回包含所有动漫信息的数组
            }
        },{
            title: "iwara人气",

            type: "mixed",

            load: async (page) => {
                let startIndex = page - 1;
                let res = await Network.get(`${this.baseUrl}videos?sort=popularity&page=${startIndex}&limit=40&rating=${this.rating}`,this.headers)
                if(res.status !== 200) {
                    throw `Invalid Status Code ${res.status}`
                }
                let json = JSON.parse(res.body)
                let animes = json.results.map(a => this.parseAnime(a))
                let maxPage = json.count <= 40 ? 1
                    : Math.ceil(json.count / 40);
                let animeList = []
                animeList.push(animes)
                return {
                    data: animeList,
                    maxPage: maxPage
                }  // 返回包含所有动漫信息的数组
            }
        },{
            title: "iwara最多观看",

            type: "mixed",

            load: async (page) => {
                let startIndex = page - 1;
                let res = await Network.get(`${this.baseUrl}videos?sort=views&page=${startIndex}&limit=40&rating=${this.rating}`,this.headers)
                if(res.status !== 200) {
                    throw `Invalid Status Code ${res.status}`
                }
                let json = JSON.parse(res.body)
                let animes = json.results.map(a => this.parseAnime(a))
                let maxPage = json.count <= 40 ? 1
                    : Math.ceil(json.count / 40);
                let animeList = []
                animeList.push(animes)
                return {
                    data: animeList,
                    maxPage: maxPage
                }  // 返回包含所有动漫信息的数组
            }
        },{
            title: "iwara最多赞",

            type: "mixed",

            load: async (page) => {
                let startIndex = page - 1;
                let res = await Network.get(`${this.baseUrl}videos?sort=likes&page=${startIndex}&limit=40&rating=${this.rating}`,this.headers)
                if(res.status !== 200) {
                    throw `Invalid Status Code ${res.status}`
                }
                let json = JSON.parse(res.body)
                let animes = json.results.map(a => this.parseAnime(a))
                let maxPage = json.count <= 40 ? 1
                    : Math.ceil(json.count / 40);
                let animeList = []
                animeList.push(animes)
                return {
                    data: animeList,
                    maxPage: maxPage
                }  // 返回包含所有动漫信息的数组
            }
        },
    ]

    search = {
        load:async (keyword, page) => {
            let startIndex = page - 1;
            let url = `${this.baseUrl}search?query=${keyword}&page=${startIndex}&limit=40&type=video&rating=${this.rating}`
            let res = await Network.get(url, this.headers)
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let json = JSON.parse(res.body)
            let animes = json.results.map(a => this.parseAnime(a))
            let maxPage = json.count <= 40 ? 1
                : Math.ceil(json.count / 40);
            return {
                animes: animes,
                maxPage: maxPage
            }
        }
    }

    anime = {
        loadInfo: async (id) => {
            let res = await Network.get(`${this.baseUrl}video/${id}`,this.headers)
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let json = JSON.parse(res.body)
            let title = json.title
            let cover =  `${this.baseImgUrl}original/${json.file.id}/thumbnail-01.jpg`
            let description =  json.body ?? ''
            let author = [`${json.user.name}`]
            let createdAt = [`${json.createdAt}`]
            let tags = json.tags.map(a => a.id)
            let animeRes = await Network.get(`${this.baseUrl}video/${id}/related?page=0&limit=40`, this.headers)
            if(animeRes.status !== 200) {
                throw `Invalid Status Code ${animeRes.status}`
            }
            let animeJson = JSON.parse(animeRes.body)
            let animes = animeJson.results.map(a => this.parseAnime(a))
            let info = parseUrlInfo(json.fileUrl);
            let uuid = info.fileId
            let expires = info.expires
            let concatenatedString = `${uuid}_${expires}_5nFp9kmbNnHdAFhaqMvt`
            let bytes = Convert.encodeUtf8(concatenatedString)
            let xVersion = Convert.hexEncode(Convert.sha1(bytes))
            let ep = new Map()
            let epsRes =  await Network.get(`${json.fileUrl}`, {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain, */*',
                'Connection': 'keep-alive',
                'Referer': 'https://api.iwara.tv',
                'X-Version': xVersion})
            if(epsRes.status !== 200) {
                throw `Invalid Status Code ${epsRes.status}`
            }
            let epsJson = JSON.parse(epsRes.body)
            for(let a of epsJson) {
                if(a.name === 'preview') continue
                let title = a.name ?? ''
                let link = `https:${a.src.view}`
                if (title.length === 0) {
                    title = `第${ep.size + 1}話`;
                }
                ep.set(link, title);
            }
            let eps = {
                "iwara": ep,
            }

            return new AnimeDetails({
                id: id,
                title: title,
                cover: cover,
                description: description,
                tags: {
                    "作者": author,
                    "创建时间": createdAt,
                    "标签": tags,
                },
                episode: eps,
                recommend: animes,
                url: `https://www.iwara.tv/video/${id}`,
            })
        },
        loadEp: async (animeId, epId) => {
            return epId;
        },
        onClickTag: (namespace, tag) => {
            return {
                action: 'search',
                keyword: tag,
            }
        },
    }

    settings = {
        rating: {
            title: "Rating",
            type: "select",
            options: [
                {
                    value: 'all',
                    text: 'All',
                },
                {
                    value: 'general',
                    text: 'General',
                },
                {
                    value: 'ecchi',
                    text: 'Ecchi',
                },
            ],
            default: "general",
        },
    }

    translation = {
        'zh_CN': {
            'Rating': '评级',
            'All': '全部',
            'General': '普通',
            'Ecchi': '成人',
        },
    }
}

function parseUrlInfo(url) {
    let pathMatch = url.match(/\/file\/([^\/?#]+)/);
    let fileId = pathMatch ? pathMatch[1] : '';

    let params = {};
    let queryIndex = url.indexOf('?');
    if (queryIndex >= 0) {
        let queryStr = url.substring(queryIndex + 1);
        let pairs = queryStr.split('&');
        for (let pair of pairs) {
            let [key, val] = pair.split('=');
            if (key) params[decodeURIComponent(key)] = decodeURIComponent(val || '');
        }
    }

    return {
        fileId: fileId,
        expires: params.expires,
    };
}