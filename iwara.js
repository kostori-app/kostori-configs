/** @type {import('./_kostori_.js')} */
class Iwara extends AnimeSource {

    name = "iwara"

    key = "iwara"

    version = "1.0.8"

    minAppVersion = "2.0.0"

    url = "https://raw.githubusercontent.com/kostori-app/kostori-configs/master/iwara.js"

    host = "https://i.iwara.tv"

    init() {}

    get apiBaseUrl(){
        return 'https://apiq.iwara.tv/'
    }

    get baseImgUrl(){
        return 'https://i.iwara.tv/image/'
    }

    get iwaraBaseUrl(){
        return 'https://www.iwara.tv'
    }

    get iwaraSiteHost(){
        return 'www.iwara.tv'
    }

    headers(extraHeaders = {}) {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'Connection': 'keep-alive',
            'Referer': this.iwaraBaseUrl,
            'Origin': this.iwaraBaseUrl,
            'x-site': this.iwaraSiteHost,
            ...extraHeaders,
        }
    }

    get rating(){
        return this.loadSetting('rating')
    }

    parseAnime(a) {
        let id = a.id;
        let title = a.title;
        let author = a.user?.name ?? '';
        let durationInSeconds = a.file?.duration ?? 0
        let minutes = Math.floor(durationInSeconds / 60);
        let seconds = Math.floor(durationInSeconds % 60);
        let formattedDuration = minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;

        // 观看次数（万次缩写）
        let viewsCount = '';
        const numViews = a['观看次数'] ?? 0;
        if (numViews > 0) {
            viewsCount = numViews >= 10000
                ? `${(numViews / 10000).toFixed(1)}万次`
                : `${numViews}次`;
        }

        // 过去时间（createdAt → 相对时间）
        let timeText = '';
        if (a.createdAt) {
            const created = new Date(a.createdAt);
            const diffMs = Date.now() - created.getTime();
            const days = Math.floor(diffMs / 86400000);
            const hours = Math.floor(diffMs / 3600000);
            const mins = Math.floor(diffMs / 60000);
            if (days > 30) timeText = `${Math.floor(days / 30)}个月前`;
            else if (days > 0) timeText = `${days}天前`;
            else if (hours > 0) timeText = `${hours}小时前`;
            else if (mins > 0) timeText = `${mins}分钟前`;
            else timeText = '刚刚';
        }

        // 点赞率（likes/views → 0-5 星）
        let stars = null;
        const numLikes = a['点赞数'] ?? 0;
        if (numViews > 0 && numLikes > 0) {
            stars = Math.min(5, (numLikes / numViews) * 5);
        }

        let cover = `${this.baseImgUrl}original/${a.file?.id}/thumbnail-01.jpg`
        let tags = (a.tags || []).map(t => t.id)

        // 海报布局约定：description 行 [时长, 观看数, 过去时间]；subtitle = 作者
        const lines = [];
        if (durationInSeconds > 0 && formattedDuration) lines.push({ text: formattedDuration });
        if (viewsCount) lines.push({ text: viewsCount });
        if (timeText) lines.push({ text: timeText });

        return new Anime({
            id: id,
            title: title ?? '',
            subtitle: author ?? '',
            cover: cover ?? '',
            tags: tags ?? [],
            description: lines,   // List<Map> 结构化行，海报卡片逐行展示
            stars: stars,         // 点赞率 0-5
        });
    }

    account = {
        reLogin: async () => {
            if(!this.isLogged) {
                throw new Error('Not logged in');
            }
            let account = this.loadData('account')
            if(!Array.isArray(account)) {
                throw new Error('Failed to reLogin: Invalid account data');
            }
            let username = account[0]
            let password = account[1]
            return await this.account.login(username, password)
        },
        login: async (account, pwd) => {
            let res = await Network.post(
                `https://apiq.iwara.tv/user/login`,
                this.headers(),
                {
                    email: account,
                    password: pwd
                })

            if (res.status === 200) {
                let json = JSON.parse(res.body)
                if (!json.token) {
                    throw 'Failed to get token\nResponse: ' + res.body
                }
                this.saveData('token', json.token)
                return 'ok'
            }

            throw 'Failed to login'
        },

        logout: () => {
            this.deleteData('token')
        },

        registerWebsite: "https://www.iwara.tv/register"
    }

    explore = [
        {
            title: "iwara订阅",

            type: "mixed",

            load: async (page) => {
                if(this.loadData('token') === '') return {
                    data: [[]],
                    maxPage: 1
                }
                this.loadData('token')
                let startIndex = page - 1;
                let res = await Network.get(`${this.apiBaseUrl}videos?page=${startIndex}&limit=40&rating=${this.rating}&subscribed=true`,this.headers({'Authorization': `Bearer ${this.loadData('token')}`}))
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
        {
            title: "iwara趋势",

            type: "mixed",

            load: async (page) => {
                let startIndex = page - 1;
                let res = await Network.get(`${this.apiBaseUrl}videos?sort=trending&page=${startIndex}&limit=40&rating=${this.rating}`,this.headers())
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
                let res = await Network.get(`${this.apiBaseUrl}videos?sort=date&page=${startIndex}&limit=40&rating=${this.rating}`,this.headers())
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
                let res = await Network.get(`${this.apiBaseUrl}videos?sort=popularity&page=${startIndex}&limit=40&rating=${this.rating}`,this.headers())
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
                let res = await Network.get(`${this.apiBaseUrl}videos?sort=views&page=${startIndex}&limit=40&rating=${this.rating}`,this.headers())
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
                let res = await Network.get(`${this.apiBaseUrl}videos?sort=likes&page=${startIndex}&limit=40&rating=${this.rating}`,this.headers())
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
        load:async (keyword,searchOption,page) => {
            let startIndex = page - 1;
            let url = `${this.apiBaseUrl}search?query=${keyword}&page=${startIndex}&limit=40&type=video&rating=${this.rating}`
            let res = await Network.get(url, this.headers())
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
            let res = await Network.get(`${this.apiBaseUrl}video/${id}`,this.headers())
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let json = JSON.parse(res.body)
            let title = json.title
            let cover =  `${this.baseImgUrl}original/${json.file.id}/thumbnail-01.jpg`
            let description =  json.body ?? ''
            let tags = json.tags.map(a => a.id)

            // 海报元信息：作者 / 头像 / 观看次数 / 过去时间 / 点赞率
            let uploader = json.user?.name ?? ''
            let uploaderAvatar = json.user?.avatar?.id
                ? `${this.baseImgUrl}original/${json.user.avatar.id}/thumbnail-01.jpg`
                : ''
            let viewsCount = ''
            const numViews = json['numViews'] ?? 0
            if (numViews > 0) {
                viewsCount = numViews >= 10000
                    ? `${(numViews / 10000).toFixed(1)}万次`
                    : `${numViews}次`
            }
            let uploadTime = ''
            if (json.createdAt) {
                const created = new Date(json.createdAt)
                const diffMs = Date.now() - created.getTime()
                const days = Math.floor(diffMs / 86400000)
                if (days > 30) uploadTime = `${Math.floor(days / 30)}个月前`
                else if (days > 0) uploadTime = `${days}天前`
                else uploadTime = '刚刚'
            }
            let stars = null
            const numLikes = json['numLikes'] ?? 0
            if (numViews > 0 && numLikes > 0) {
                stars = Math.min(5, (numLikes / numViews) * 5)
            }

            let animeRes = await Network.get(`${this.apiBaseUrl}video/${id}/related?page=0&limit=40`, this.headers())
            if(animeRes.status !== 200) {
                throw `Invalid Status Code ${animeRes.status}`
            }
            let animeJson = JSON.parse(animeRes.body)
            let animes = animeJson.results.map(a => this.parseAnime(a))

            // 单集：分片（分辨率）由 loadEp 解析
            let ep = new Map()
            ep.set('watch', '观看')
            let eps = {
                "iwara": ep,
            }

            return new AnimeDetails({
                id: id,
                title: title,
                cover: cover,
                description: description,
                tags: {
                    "标签": tags,
                },
                episode: eps,
                recommend: animes,
                uploader: uploader,
                uploaderAvatar: uploaderAvatar,
                uploadTime: uploadTime,
                viewsCount: viewsCount,
                stars: stars,
                url: `https://www.iwara.tv/video/${id}`,
            })
        },
        loadEp: async (animeId, epId) => {
            // 请求视频信息拿 fileUrl，解析分片（不同分辨率 m3u8）
            let res = await Network.get(`${this.apiBaseUrl}video/${animeId}`, this.headers())
            if (res.status !== 200) throw `Invalid Status Code ${res.status}`
            let json = JSON.parse(res.body)

            let info = parseUrlInfo(json.fileUrl);
            let uuid = info.fileId
            let expires = info.expires
            let concatenatedString = `${uuid}_${expires}_mSvL05GfEmeEmsEYfGCnVpEjYgTJraJN`
            let bytes = Convert.encodeUtf8(concatenatedString)
            let xVersion = Convert.hexEncode(Convert.sha1(bytes))

            let epsRes =  await Network.get(`${json.fileUrl}`, {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain, */*',
                'Connection': 'keep-alive',
                'Referer': this.iwaraBaseUrl,
                'Origin': this.iwaraBaseUrl,
                'x-site': this.iwaraSiteHost,
                'X-Version': xVersion})
            if(epsRes.status !== 200) {
                throw `Invalid Status Code ${epsRes.status}`
            }
            let epsJson = JSON.parse(epsRes.body)

            // 分片 = 不同分辨率（preview 除外），全部返回供清晰度切换
            let videoStreams = []
            let url = ''
            for (let a of epsJson) {
                if (a.name === 'preview') continue
                let src = `https:${a.src.view}`
                if (!url) url = src
                videoStreams.push({
                    index: videoStreams.length,
                    name: a.name,
                    url: src,
                })
            }
            if (!url) throw 'No source found'

            return {
                url: url,
                videoStreams: videoStreams,
            }
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