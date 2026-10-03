/** @type {import('./_kostori_.js')} */
class Iwara extends AnimeSource {

    name = "iwara"

    key = "iwara"

    version = "1.3.1"

    minAppVersion = "1.3.0"

    url = "https://raw.githubusercontent.com/kostori-app/kostori-configs/master/iwara.js"

    host = "https://www.iwara.tv"

    // 详情页的 tag 可点击，点击后进入该标签的视频二级页
    tagClickable = true

    // ============ 常量 ============

    get apiBaseUrl() {
        return 'https://apiq.iwara.tv/'
    }

    get baseImgUrl() {
        return 'https://i.iwara.tv/image/'
    }

    get iwaraBaseUrl() {
        return 'https://www.iwara.tv'
    }

    get iwaraSiteHost() {
        return 'www.iwara.tv'
    }

    /** iwara 未提供封面时的占位图 */
    get defaultThumbUrl() {
        return `${this.iwaraBaseUrl}/images/default-thumbnail.jpg`
    }

    get defaultAvatarUrl() {
        return `${this.iwaraBaseUrl}/images/default-avatar.jpg`
    }

    /** 列表分页大小；/search 的服务端硬上限是 50 */
    get pageSize() {
        return 40
    }

    /** fileUrl 签名用的固定盐（与站点前端一致） */
    get fileSalt() {
        return 'mSvL05GfEmeEmsEYfGCnVpEjYgTJraJN'
    }

    init() {}

    // ============ 通用工具 ============

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

    get token() {
        let token = this.loadData('token')
        return (typeof token === 'string' && token.length > 0) ? token : ''
    }

    /** 已登录时带上 Bearer，未登录退化为匿名请求 */
    authHeaders(extraHeaders = {}) {
        let token = this.token
        if (!token) return this.headers(extraHeaders)
        return this.headers({ 'Authorization': `Bearer ${token}`, ...extraHeaders })
    }

    /** iwara 用空字符串表示「全部」，`rating=all` 并不是合法取值 */
    get rating() {
        let value = this.loadSetting('rating')
        if (value === 'all' || value === undefined || value === null) return ''
        return `${value}`
    }

    /** GET + 状态码校验 + JSON 解析（顺带兼容 Cloudflare 的 <pre> 包装） */
    async getJson(url, headers) {
        let res = await Network.get(url, headers ?? this.headers())
        if (res.status !== 200) {
            throw `Invalid Status Code ${res.status}`
        }
        let body = res.body
        if (typeof body !== 'string') {
            body = Convert.decodeUtf8(body)
        }
        let text = body.trim()
        if (text.startsWith('<')) {
            let matched = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i)
            if (matched) text = matched[1].trim()
        }
        try {
            return JSON.parse(text)
        } catch (e) {
            throw `Invalid response from ${url}\n${text.substring(0, 200)}`
        }
    }

    calcMaxPage(count, limit) {
        let total = Number(count)
        if (!isFinite(total) || total <= 0) return 1
        return Math.max(1, Math.ceil(total / limit))
    }

    /** 12345 -> 1.2万 */
    shortCount(value) {
        let num = Number(value) || 0
        if (num <= 0) return ''
        return num >= 10000 ? `${(num / 10000).toFixed(1)}万` : `${num}`
    }

    formatDuration(seconds) {
        let total = Number(seconds) || 0
        if (total <= 0) return ''
        let minutes = Math.floor(total / 60)
        let secs = Math.floor(total % 60)
        return minutes > 0 ? `${minutes}分${secs}秒` : `${secs}秒`
    }

    /** ISO 时间 -> 相对时间 */
    timeAgo(value) {
        if (!value) return ''
        let created = new Date(value)
        if (isNaN(created.getTime())) return ''
        let diff = Date.now() - created.getTime()
        if (diff < 0) diff = 0
        let minutes = Math.floor(diff / 60000)
        if (minutes < 1) return '刚刚'
        if (minutes < 60) return `${minutes}分钟前`
        let hours = Math.floor(minutes / 60)
        if (hours < 24) return `${hours}小时前`
        let days = Math.floor(hours / 24)
        if (days < 30) return `${days}天前`
        let months = Math.floor(days / 30)
        if (months < 12) return `${months}个月前`
        return `${Math.floor(months / 12)}年前`
    }

    /** 点赞率 -> 0~5 星 */
    starOf(likes, views) {
        let numLikes = Number(likes) || 0
        let numViews = Number(views) || 0
        if (numLikes <= 0 || numViews <= 0) return null
        return Math.min(5, (numLikes / numViews) * 5)
    }

    fileThumb(fileId) {
        return fileId ? `${this.baseImgUrl}original/${fileId}/thumbnail-01.jpg` : ''
    }

    userAvatar(user) {
        return this.fileThumb(user?.avatar?.id) || this.defaultAvatarUrl
    }

    /** 需要登录才能访问的入口统一在这里拦下，提示明确 */
    requireLogin() {
        if (!this.isLogged) {
            throw '请先登录 iwara 账号'
        }
    }

    /** 当前登录用户资料，结果会缓存到 data 里 */
    async fetchMe() {
        this.requireLogin()
        let cachedId = this.loadData('userId')
        let cachedName = this.loadData('userName')
        if (cachedId) {
            return { id: cachedId, name: cachedName ?? '' }
        }
        let json = await this.getJson(`${this.apiBaseUrl}user`, this.authHeaders())
        let user = json?.user ?? null
        if (!user || !user.id) throw 'Failed to load iwara profile'
        this.saveData('userId', user.id)
        this.saveData('userName', user.name ?? '')
        return user
    }

    // ============ 解析 ============

    parseAnime(a) {
        let file = a.file ?? {}
        let numViews = Number(a.numViews) || 0
        let numLikes = Number(a.numLikes) || 0

        let durationText = this.formatDuration(file.duration)
        let viewsText = this.shortCount(numViews)
        let timeText = this.timeAgo(a.createdAt)

        // 海报布局约定：description 行 [时长, 观看数, 过去时间]；subtitle = 作者
        const lines = []
        if (durationText) lines.push({ text: durationText })
        if (viewsText) lines.push({ text: `${viewsText}次` })
        if (timeText) lines.push({ text: timeText })

        let cover = this.fileThumb(a.customThumbnail?.id ?? file.id) ?? ''

        return new Anime({
            id: a.id,
            title: a.title ?? '',
            subtitle: a.user?.name ?? '',
            cover: cover,
            tags: (a.tags ?? []).map(t => t.id),
            description: lines,
            stars: this.starOf(numLikes, numViews),
        })
    }

    /**
     * 用户入口卡片：点开进入「该 UP 主的全部视频」二级页（viewMore 跳转）
     * @param user iwara 的 User 对象
     * @param category 二级页标题（页面标题），不传则用「<昵称> 的全部视频」
     */
    parseUserEntry(user, category) {
        let name = user?.name ?? ''
        // 卡片标题只用昵称：搜索结果 / 点赞列表里要靠昵称区分用户，
        // 「XX 的全部视频」只作为落地页标题，保证跳过去后知道在看谁
        let pageTitle = category ?? (name ? `${name} 的全部视频` : '全部视频')
        return new Anime({
            id: `iwara-user-${user?.id ?? name}`,
            title: name || pageTitle,
            subtitle: user?.username ? `@${user.username}` : '',
            cover: this.userAvatar(user),
            tags: [],
            description: [{ text: '查看全部视频' }],
            viewMore: {
                page: 'category',
                attributes: {
                    category: pageTitle,
                    param: `user|${user?.id ?? ''}`,
                    url: `${this.iwaraBaseUrl}/profile/${encodeURIComponent(name)}`,
                },
            },
        })
    }

    /**
     * 播放列表入口卡片：点开进入「播放列表内容」二级页（viewMore 跳转）
     * @param p iwara 的 Playlist / LightPlaylist 对象
     */
    parsePlaylistEntry(p) {
        let id = p?.id ?? ''
        let title = p?.title ?? ''
        if (!id) return null
        let numVideos = Number(p?.numVideos) || 0
        let cover = this.fileThumb(p?.thumbnail?.file?.id ?? p?.thumbnail?.id) || this.defaultThumbUrl
        return new Anime({
            id: `iwara-playlist-${id}`,
            title: title,
            subtitle: numVideos > 0 ? `${numVideos} 个视频` : '播放列表',
            cover: cover,
            tags: [],
            description: [{ text: numVideos > 0 ? `共 ${numVideos} 个视频` : '点击查看全部' }],
            viewMore: {
                page: 'category',
                attributes: {
                    // 标题固定：分类页的排序选项按标题名隐藏，动态标题会漏配
                    category: '播放列表',
                    param: `playlist|${id}`,
                    url: `${this.iwaraBaseUrl}/playlist/${id}`,
                },
            },
        })
    }

    // ============ 接口封装 ============

    /** 统一封装 /videos 查询；空字符串参数必须剔除，否则会被当成有效筛选条件 */
    async fetchVideos(query, page, limit) {
        let pageSize = limit ?? this.pageSize
        let startIndex = Math.max(0, (page ?? 1) - 1)
        const params = [`page=${startIndex}`, `limit=${pageSize}`]
        for (let key of Object.keys(query ?? {})) {
            let value = query[key]
            if (value === undefined || value === null || value === '') continue
            params.push(`${key}=${encodeURIComponent(value)}`)
        }
        let json = await this.getJson(`${this.apiBaseUrl}videos?${params.join('&')}`, this.authHeaders())
        return {
            animes: (json.results ?? []).map(a => this.parseAnime(a)),
            maxPage: this.calcMaxPage(json.count, pageSize),
        }
    }

    /** 搜索结果类型 -> (iwara 的 type 参数, 结果解析器) */
    searchTypeOf(scope) {
        switch (scope) {
            case 'users':
                return { type: 'users', parse: u => this.parseUserEntry(u) }
            case 'playlists':
                return { type: 'playlists', parse: p => this.parsePlaylistEntry(p) }
            default:
                return { type: 'videos', parse: a => this.parseAnime(a) }
        }
    }

    /**
     * /search 查询。
     * 注意 type 必须是复数（`videos` / `users` / `playlists`，写成单数服务端不认），
     * 且关键词必须 encodeURIComponent，否则中文/空格会把查询串打乱。
     *
     * @param scope 'videos' | 'users' | 'playlists'
     * @param sort videos 支持 date/relevance/views/likes，其余类型只支持 date/relevance
     */
    async fetchSearch(keyword, sort, page, scope, limit) {
        let pageSize = limit ?? this.pageSize
        let startIndex = Math.max(0, (page ?? 1) - 1)
        let target = this.searchTypeOf(scope)
        // 用户/播放列表只认 date 与 relevance，传 views/likes 会被服务端忽略或报错
        if (target.type !== 'videos' && (sort === 'views' || sort === 'likes')) {
            sort = 'relevance'
        }
        const params = [
            `query=${encodeURIComponent(`${keyword ?? ''}`.trim())}`,
            `page=${startIndex}`,
            `limit=${pageSize}`,
            `type=${target.type}`,
        ]
        if (sort) params.push(`sort=${encodeURIComponent(sort)}`)
        // rating 只对视频有意义
        if (target.type === 'videos' && this.rating) {
            params.push(`rating=${encodeURIComponent(this.rating)}`)
        }
        let json = await this.getJson(`${this.apiBaseUrl}search?${params.join('&')}`, this.authHeaders())
        return {
            animes: (json.results ?? []).map(target.parse).filter(e => e),
            maxPage: this.calcMaxPage(json.count, pageSize),
        }
    }

    /** 播放列表内容 */
    async fetchPlaylistVideos(playlistId, page, limit) {
        let pageSize = limit ?? this.pageSize
        let startIndex = Math.max(0, (page ?? 1) - 1)
        let json = await this.getJson(
            `${this.apiBaseUrl}playlist/${playlistId}?page=${startIndex}&limit=${pageSize}`,
            this.authHeaders())
        return {
            animes: (json.results ?? []).map(a => this.parseAnime(a)),
            maxPage: this.calcMaxPage(json.count, pageSize),
        }
    }

    /** 某个用户的播放列表（iwara 侧的「收藏夹」） */
    async fetchPlaylists(userId, page, limit) {
        let pageSize = limit ?? this.pageSize
        let startIndex = Math.max(0, (page ?? 1) - 1)
        let json = await this.getJson(
            `${this.apiBaseUrl}playlists?user=${encodeURIComponent(userId)}&page=${startIndex}&limit=${pageSize}`,
            this.authHeaders())
        return {
            animes: (json.results ?? []).map(p => this.parsePlaylistEntry(p)).filter(e => e),
            maxPage: this.calcMaxPage(json.count, pageSize),
        }
    }

    /** 某个视频所在的播放列表（需登录） */
    async fetchLightPlaylistAnimes(videoId) {
        if (!this.token) return []
        try {
            let json = await this.getJson(
                `${this.apiBaseUrl}light/playlists?id=${encodeURIComponent(videoId)}`,
                this.authHeaders())
            return (json ?? [])
                .map(p => this.parsePlaylistEntry({ id: p?.id, title: p?.title, numVideos: p?.numVideos }))
                .filter(e => e)
        } catch (e) {
            return []
        }
    }

    /** 喜欢的视频；favorites 的条目被包了一层 { video: {...} } */
    async fetchFavoriteVideos(page, limit) {
        let pageSize = limit ?? this.pageSize
        let startIndex = Math.max(0, (page ?? 1) - 1)
        let json = await this.getJson(
            `${this.apiBaseUrl}favorites/videos?page=${startIndex}&limit=${pageSize}`,
            this.authHeaders())
        return {
            animes: (json.results ?? []).map(item => this.parseAnime(item?.video ?? item)),
            maxPage: this.calcMaxPage(json.count, pageSize),
        }
    }

    /** 给某个视频点赞的用户；条目被包了一层 { user: {...} } */
    async fetchLikers(videoId, page, limit) {
        let pageSize = limit ?? this.pageSize
        let startIndex = Math.max(0, (page ?? 1) - 1)
        let json = await this.getJson(
            `${this.apiBaseUrl}video/${videoId}/likes?page=${startIndex}&limit=${pageSize}`,
            this.headers())
        return {
            animes: (json.results ?? [])
                .map(item => item?.user ?? item)
                .filter(u => u && u.id)
                .map(u => this.parseUserEntry(u, `${u.name} 的全部视频`)),
            maxPage: this.calcMaxPage(json.count, pageSize),
        }
    }

    /** 相关视频 */
    async fetchRelated(videoId, page, limit) {
        let pageSize = limit ?? this.pageSize
        let startIndex = Math.max(0, (page ?? 1) - 1)
        let json = await this.getJson(
            `${this.apiBaseUrl}video/${videoId}/related?page=${startIndex}&limit=${pageSize}`,
            this.headers())
        return {
            animes: (json.results ?? []).map(a => this.parseAnime(a)),
            maxPage: this.calcMaxPage(json.count, pageSize),
        }
    }

    // ============ 账号 ============

    account = {
        reLogin: async () => {
            if (!this.isLogged) {
                throw new Error('Not logged in');
            }
            let account = this.loadData('account')
            if (!Array.isArray(account)) {
                throw new Error('Failed to reLogin: Invalid account data');
            }
            let username = account[0]
            let password = account[1]
            return await this.account.login(username, password)
        },
        login: async (account, pwd) => {
            let res = await Network.post(
                `${this.apiBaseUrl}user/login`,
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
                this.deleteData('userId')
                this.deleteData('userName')
                try {
                    await this.fetchMe()
                } catch (e) {}
                return 'ok'
            }

            throw `Failed to login (${res.status})`
        },

        logout: () => {
            this.deleteData('token')
            this.deleteData('userId')
            this.deleteData('userName')
        },

        registerWebsite: "https://www.iwara.tv/register"
    }

    // ============ 发现页 ============

    explore = [
        {
            title: "iwara订阅",

            type: "multiPageAnimeList",

            load: async (page) => {
                this.requireLogin()
                return await this.fetchVideos({
                    subscribed: 'true',
                    sort: 'date',
                    rating: this.rating,
                }, page)
            }
        },
        {
            title: "iwara趋势",

            type: "multiPageAnimeList",

            load: async (page) => {
                return await this.fetchVideos({ sort: 'trending', rating: this.rating }, page)
            }
        },
        {
            title: "iwara最新",

            type: "multiPageAnimeList",

            load: async (page) => {
                return await this.fetchVideos({ sort: 'date', rating: this.rating }, page)
            }
        },
        {
            title: "iwara人气",

            type: "multiPageAnimeList",

            load: async (page) => {
                return await this.fetchVideos({ sort: 'popularity', rating: this.rating }, page)
            }
        },
        {
            title: "iwara最多观看",

            type: "multiPageAnimeList",

            load: async (page) => {
                return await this.fetchVideos({ sort: 'views', rating: this.rating }, page)
            }
        },
        {
            title: "iwara最多赞",

            type: "multiPageAnimeList",

            load: async (page) => {
                return await this.fetchVideos({ sort: 'likes', rating: this.rating }, page)
            }
        },
        {
            // 我的播放列表：每个播放列表一张卡，点开进入播放列表内容二级页
            title: "我的播放列表",

            type: "multiPartPage",

            load: async () => {
                let me = await this.fetchMe()
                let res = await this.fetchPlaylists(me.id, 1)
                return [{
                    title: '我的播放列表',
                    animes: res.animes,
                    viewMore: {
                        page: 'category',
                        attributes: {
                            category: '我的播放列表',
                            param: `playlists|${me.id}`,
                            url: `${this.iwaraBaseUrl}/profile/${encodeURIComponent(me.name ?? '')}/playlists`,
                        },
                    },
                }]
            }
        },
    ]

    // ============ 搜索 ============

    search = {
        optionList: [
            {
                // 搜索范围：用户/播放列表的结果是带 viewMore 的入口卡片，
                // 点开进入对应二级页，而不是直接进详情页
                label: "范围",
                type: "select",
                options: [
                    { value: 'videos', label: '视频' },
                    { value: 'users', label: '用户' },
                    { value: 'playlists', label: '播放列表' },
                ],
            },
            {
                label: "排序",
                type: "select",
                options: [
                    { value: 'date', label: '最新' },
                    { value: 'relevance', label: '相关度' },
                    { value: 'views', label: '最多观看' },
                    { value: 'likes', label: '最多点赞' },
                ],
            },
        ],

        load: async (keyword, searchOption, page) => {
            // 入参顺序与 optionList 声明顺序一致：范围在前、排序在后
            let scope = (searchOption && searchOption[0]) ? searchOption[0] : 'videos'
            let sort = (searchOption && searchOption[1]) ? searchOption[1] : 'date'
            return await this.fetchSearch(keyword, sort, page, scope)
        }
    }

    // ============ 分类（二级页入口）============
    //
    // category + categoryAnimes 是「二级页」的落地方式：
    // viewMore 跳到 category 页时，`attributes.category` 既是页面标题，
    // 也是 load 的第一个入参；`attributes.param` 用于区分同一个页面下的不同列表。

    category = {
        title: "iwara",
        parts: [
            {
                name: "我的",
                type: "fixed",
                categories: [
                    "我的播放列表",
                    "喜欢的视频",
                    "订阅视频",
                ],
                itemType: "category",
                categoryParams: [
                    "playlists",
                    "liked",
                    "subscribed",
                ],
            },
            {
                name: "热门",
                type: "fixed",
                categories: [
                    "趋势",
                    "最新",
                    "人气",
                    "最多观看",
                    "最多点赞",
                ],
                itemType: "category",
                categoryParams: [
                    "trending",
                    "date",
                    "popularity",
                    "views",
                    "likes",
                ],
            },
        ],
    }

    categoryAnimes = {
        optionList: [
            {
                label: "排序",
                options: [
                    { value: 'date', label: '最新' },
                    { value: 'views', label: '最多观看' },
                    { value: 'likes', label: '最多点赞' },
                    { value: 'trending', label: '趋势' },
                    { value: 'popularity', label: '人气' },
                ],
                // 这些页面对应的接口不支持排序，隐藏选项避免误导
                notShowWhen: [
                    '我的播放列表',
                    '播放列表',
                    '点赞的用户',
                ],
            },
        ],

        load: async (category, param, options, page) => {
            // param 优先；直接从分类页进来时 param 就是分类对应的路由名
            let route = `${param ?? category ?? ''}`
            let sort = (options && options[0]) ? options[0] : 'date'

            // ---- 二级页：某个用户的全部视频 ----
            if (route.startsWith('user|')) {
                let userId = route.substring(5)
                if (!userId) throw '缺少用户 ID'
                // user= 时服务端会忽略 rating，所以这里不传
                return await this.fetchVideos({ user: userId, sort: sort }, page)
            }

            // ---- 二级页：播放列表内容 ----
            if (route.startsWith('playlist|')) {
                let playlistId = route.substring(9)
                if (!playlistId) throw '缺少播放列表 ID'
                return await this.fetchPlaylistVideos(playlistId, page)
            }

            // ---- 二级页：某个用户的播放列表索引 ----
            if (route.startsWith('playlists|')) {
                let userId = route.substring(10)
                if (userId === '') {
                    let me = await this.fetchMe()
                    userId = me.id
                }
                return await this.fetchPlaylists(userId, page)
            }

            // ---- 二级页：标签下的视频 ----
            if (route.startsWith('tag|')) {
                let tag = route.substring(4)
                if (!tag) throw '缺少标签'
                return await this.fetchVideos({ tags: tag, sort: sort, rating: this.rating }, page)
            }

            // ---- 二级页：相关视频 ----
            if (route.startsWith('related|')) {
                let videoId = route.substring(8)
                if (!videoId) throw '缺少视频 ID'
                return await this.fetchRelated(videoId, page)
            }

            // ---- 二级页：点赞用户 ----
            if (route.startsWith('likers|')) {
                let videoId = route.substring(7)
                if (!videoId) throw '缺少视频 ID'
                return await this.fetchLikers(videoId, page)
            }

            // ---- 分类页：我的播放列表 ----
            if (route === 'playlists') {
                this.requireLogin()
                return await this.fetchPlaylists((await this.fetchMe()).id, page)
            }

            // ---- 分类页：喜欢的视频 ----
            if (route === 'liked') {
                this.requireLogin()
                return await this.fetchFavoriteVideos(page)
            }

            // ---- 分类页：订阅视频 ----
            if (route === 'subscribed') {
                this.requireLogin()
                return await this.fetchVideos({
                    subscribed: 'true',
                    sort: sort,
                    rating: this.rating,
                }, page)
            }

            // ---- 分类页：趋势 / 最新 / 人气 / 最多观看 / 最多点赞 ----
            let sorts = ['trending', 'date', 'popularity', 'views', 'likes']
            if (sorts.indexOf(route) >= 0) {
                return await this.fetchVideos({ sort: route, rating: this.rating }, page)
            }

            throw `不支持的分类: ${route}`
        },
    }

    // ============ 详情 ============

    anime = {
        loadInfo: async (id) => {
            let res = await Network.get(`${this.apiBaseUrl}video/${id}`, this.authHeaders())
            if (res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let json = JSON.parse(res.body)
            if (!json.file?.id) {
                throw '该视频没有可用的媒体文件'
            }

            let user = json.user ?? null
            let cover = this.fileThumb(json.customThumbnail?.id ?? json.file.id)
            let description = json.body ?? ''
            let tags = (json.tags ?? []).map(a => a.id)

            let viewsText = this.shortCount(json.numViews)
            let viewsCount = viewsText ? `${viewsText}次` : ''
            let uploadTime = this.timeAgo(json.createdAt)
            let stars = this.starOf(json.numLikes, json.numViews)

            // ---- 相关视频 ----
            let related = []
            try {
                related = (await this.fetchRelated(id, 1)).animes
            } catch (e) {}

            // ---- 二级页入口卡片（放在相关推荐最前面）----
            const entries = []
            if (user && user.id) {
                entries.push(this.parseUserEntry(user))
                entries.push(new Anime({
                    id: `iwara-likers-${id}`,
                    title: '点赞的用户',
                    subtitle: `${this.shortCount(json.numLikes) || '0'} 人点赞`,
                    cover: this.userAvatar(user),
                    tags: [],
                    description: [{ text: '查看点赞了该视频的用户' }],
                    viewMore: {
                        page: 'category',
                        attributes: {
                            category: '点赞的用户',
                            param: `likers|${id}`,
                            url: `${this.iwaraBaseUrl}/video/${id}`,
                        },
                    },
                }))
            }
            // 该视频所在的播放列表（需登录）
            entries.push(...await this.fetchLightPlaylistAnimes(id))

            // 单集：分片（分辨率）由 loadEp 解析
            let ep = new Map()
            ep.set('watch', '观看')
            let eps = {
                "iwara": ep,
            }

            // 直接返回普通对象：AnimeDetails 构造器里的 commentCount 不会被
            // Dart 侧读取（Dart 读的是 commentsCount），所以在这里补上
            return {
                id: id,
                title: json.title ?? '',
                subtitle: user?.name ?? '',
                cover: cover,
                description: description,
                tags: {
                    "标签": tags,
                },
                episode: eps,
                recommend: entries.concat(related),
                uploader: user?.name ?? '',
                uploaderAvatar: this.fileThumb(user?.avatar?.id) ?? '',
                uploadTime: uploadTime,
                updateTime: this.timeAgo(json.updatedAt),
                viewsCount: viewsCount,
                stars: stars,
                likesCount: Number(json.numLikes) || 0,
                commentsCount: Number(json.numComments) || 0,
                isLiked: json.liked === true,
                url: `${this.iwaraBaseUrl}/video/${id}`,
            }
        },

        loadEp: async (animeId, epId) => {
            // 请求视频信息拿 fileUrl，解析分片（不同分辨率 m3u8）
            let res = await Network.get(`${this.apiBaseUrl}video/${animeId}`, this.authHeaders())
            if (res.status !== 200) throw `Invalid Status Code ${res.status}`
            let json = JSON.parse(res.body)
            if (!json.fileUrl) throw '该视频没有可播放的源地址'

            let epsRes = await Network.get(json.fileUrl, this.authHeaders({
                'X-Version': xVersionOf(json.fileUrl, this.fileSalt),
            }))
            if (epsRes.status !== 200) {
                throw `Invalid Status Code ${epsRes.status}`
            }
            let epsJson = JSON.parse(epsRes.body)

            // 分片 = 不同分辨率（preview 除外），全部返回供清晰度切换
            let videoStreams = []
            let url = ''
            for (let a of epsJson ?? []) {
                if (a.name === 'preview' || !a.src?.view) continue
                let src = normalizeUrl(a.src.view)
                if (!url) url = src
                let stream = {
                    index: videoStreams.length,
                    name: a.name,
                    url: src,
                }
                // 分辨率名（如 "1080"）转成宽高，播放器才能显示成 1080p
                let height = parseInt(a.name, 10)
                if (!isNaN(height) && height > 0) {
                    stream.height = height
                    stream.width = Math.round(height * 16 / 9)
                }
                videoStreams.push(stream)
            }
            if (!url) throw 'No source found'

            return {
                url: url,
                videoStreams: videoStreams,
            }
        },

        likeAnime: async (id, isLiking) => {
            this.requireLogin()
            let res = isLiking
                ? await Network.post(`${this.apiBaseUrl}video/${id}/like`, this.authHeaders())
                : await Network.delete(`${this.apiBaseUrl}video/${id}/like`, this.authHeaders())
            if (res.status !== 200 && res.status !== 201) {
                throw `Invalid Status Code ${res.status}`
            }
        },

        loadComments: async (id, subId, page, replyTo) => {
            this.requireLogin()
            let startIndex = Math.max(0, page - 1)
            let url = `${this.apiBaseUrl}video/${id}/comments?page=${startIndex}&limit=40`
            if (replyTo) url += `&parent=${encodeURIComponent(replyTo)}`
            let json = await this.getJson(url, this.authHeaders())
            let comments = (json.results ?? []).map(c => new Comment({
                id: c.id,
                userName: c.user?.name ?? '',
                avatar: this.fileThumb(c.user?.avatar?.id),
                content: c.body ?? '',
                time: c.createdAt,
                replyCount: Number(c.numReplies) || 0,
            }))
            return {
                comments: comments,
                maxPage: this.calcMaxPage(json.count, 40),
            }
        },

        // tag 是 iwara 的标签 id，搜不出东西，直接跳到「该标签下的视频」二级页
        onClickTag: (namespace, tag) => {
            return {
                page: 'category',
                attributes: {
                    category: `标签 · ${tag}`,
                    param: `tag|${tag}`,
                },
            }
        },

        link: {
            domains: ['www.iwara.tv', 'iwara.tv', 'apiq.iwara.tv'],

            linkToId: (link) => {
                let matched = `${link}`.match(/iwara\.tv\/video\/([^\/?#]+)/)
                return matched ? matched[1] : null
            },

            // 视频链接 -> 详情页；播放列表/用户主页 -> 二级页
            resolveTarget: async (text) => {
                let matched = `${text}`.match(/iwara\.tv\/(video|playlist|profile)\/([^\/?#]+)/)
                if (!matched) return null
                let kind = matched[1]
                let key = matched[2]

                if (kind === 'video') {
                    return { kind: 'anime', id: key }
                }

                if (kind === 'playlist') {
                    // 二级页标题固定为「播放列表」，不用额外请求列表名
                    return {
                        kind: 'viewMore',
                        viewMore: {
                            page: 'category',
                            attributes: {
                                category: '播放列表',
                                param: `playlist|${key}`,
                                url: `${this.iwaraBaseUrl}/playlist/${key}`,
                            },
                        },
                    }
                }

                // /profile/<name>[/playlists]
                let tab = `${text}`.match(/iwara\.tv\/profile\/([^\/?#]+)\/(\w+)/)
                try {
                    let json = await this.getJson(`${this.apiBaseUrl}profile/${encodeURIComponent(key)}`, this.headers())
                    let user = json?.user
                    if (!user?.id) return null
                    if (tab && tab[2] === 'playlists') {
                        return {
                            kind: 'viewMore',
                            viewMore: {
                                page: 'category',
                                attributes: {
                                    category: `${user.name ?? key} 的播放列表`,
                                    param: `playlists|${user.id}`,
                                    url: `${this.iwaraBaseUrl}/profile/${encodeURIComponent(key)}/playlists`,
                                },
                            },
                        }
                    }
                    return {
                        kind: 'viewMore',
                        viewMore: {
                            page: 'category',
                            attributes: {
                                category: `${user.name ?? key} 的全部视频`,
                                param: `user|${user.id}`,
                                url: `${this.iwaraBaseUrl}/profile/${encodeURIComponent(key)}`,
                            },
                        },
                    }
                } catch (e) {
                    return null
                }
            },
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

/** 协议相对地址 //cdn/... -> https://cdn/... */
function normalizeUrl(url) {
    let value = `${url ?? ''}`
    return value.startsWith('//') ? `https:${value}` : value
}

/** 从 fileUrl 里取 uuid（最后一段路径）与 expires */
function parseUrlInfo(url) {
    let path = `${url}`.split('?')[0].split('#')[0]
    let segments = path.split('/').filter(e => e.length > 0)
    let fileId = segments.length > 0 ? segments[segments.length - 1] : ''

    let params = {};
    let queryIndex = url.indexOf('?');
    if (queryIndex >= 0) {
        let queryStr = url.substring(queryIndex + 1).split('#')[0];
        for (let pair of queryStr.split('&')) {
            if (!pair) continue;
            let idx = pair.indexOf('=');
            let key = idx >= 0 ? pair.substring(0, idx) : pair;
            let val = idx >= 0 ? pair.substring(idx + 1) : '';
            if (key) params[decodeURIComponent(key)] = decodeURIComponent(val);
        }
    }

    return {
        fileId: fileId,
        expires: params.expires,
    };
}

/** 站点前端用 sha1("<uuid>_<expires>_<salt>") 作为 X-Version 头 */
function xVersionOf(url, salt) {
    let info = parseUrlInfo(url);
    if (!info.expires) {
        throw 'Failed to get expires from file url';
    }
    let concatenated = `${info.fileId}_${info.expires}_${salt}`;
    return Convert.hexEncode(Convert.sha1(Convert.encodeUtf8(concatenated)));
}