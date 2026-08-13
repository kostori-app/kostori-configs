/** @type {import('./_kostori_.js')} */
class sefun7 extends AnimeSource {

    name = "7sefun"

    isBangumi = true

    key = "sefun7"

    version = "1.0.8"

    minAppVersion = "1.0.0"

    url = "https://raw.githubusercontent.com/kostori-app/kostori-configs/master/7sefun.js"

    host = "https://www.7sefun.top"

    get baseUrl() {
        return `https://www.7sefun.top`
    }

    get userAgent() {
        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
    }

    get headers() {
        return {
            'User-Agent': this.userAgent,
            'Referer': this.baseUrl + '/',
        }
    }

    init() {}

    fullUrl(path) {
        if (!path) return ''
        if (/^https?:\/\//i.test(path)) return path
        return this.baseUrl + (path.startsWith('/') ? '' : '/') + path
    }

    /**
     * maccms 播放器 url 解码（可能双重编码）：
     * - 先 URL 解码外层；
     * - 仅当字符串只含 base64 字符时才按 maccms 自定义 base64 解码
     *   （~ 代替 =，- _ 映射 + /，补齐长度）；
     * - base64 解码后再反复 URL 解码（base64(URL编码(url)) 常见）。
     */
    decodeMaccmsUrl(s) {
        if (!s) return ''
        let url = s
        try { url = decodeURIComponent(url) } catch (e) {}
        if (/^[A-Za-z0-9+\/=\-_~]+$/.test(url)) {
            try {
                let t = url.replace(/~/g, '=').replace(/-/g, '+').replace(/_/g, '/')
                while (t.length % 4 !== 0) t += '='
                let decoded = Convert.decodeUtf8(Convert.decodeBase64(t))
                if (decoded) {
                    let prev = decoded
                    for (let i = 0; i < 4; i++) {
                        let next
                        try { next = decodeURIComponent(prev) } catch (e) { break }
                        if (next === prev) break
                        prev = next
                    }
                    return prev
                }
            } catch (e) {}
        }
        return url
    }

    /**
     * WebView 跟随跳转链嗅探视频地址：
     * 优先返回直链（type: video）；player_url 解码后若仍是跳转页则继续加载，
     * 最多 3 跳。
     */
    pickVideo(results) {
        if (!results) return null
        let video = results.find(r => r && r.type === 'video' && r.url)
        if (video) return video.url
        let native = results.find(r => r && (r.type === 'hls_native') && r.url)
        if (native) return native.url
        return null
    }

    async resolveViaWebview(url) {
        let current = url
        let seen = {}
        for (let hops = 0; hops < 5; hops++) {
            // 1) 先带扫描：非 CF 页面几秒内 early-complete 返回
            let results = await WebViewVideo.fetchVideoUrl(
                current,
                { 'User-Agent': this.userAgent, 'Referer': this.baseUrl + '/' },
                '',
                25000,
                true,
            )
            let video = this.pickVideo(results)
            if (video) return video

            // 2) 可能是 CF 挑战页（注入的 fetch/XHR 钩子会干扰挑战），
            //    换无扫描重试：不注入 JS 钩子，仅靠原生 onLoadResource
            results = await WebViewVideo.fetchVideoUrl(
                current,
                { 'User-Agent': this.userAgent, 'Referer': this.baseUrl + '/' },
                '',
                25000,
                false,
            )
            video = this.pickVideo(results)
            if (video) return video

            // 3) player_url 解码跳转
            let pv = results.find(r => r && r.type === 'player_url' && r.url)
            if (pv) {
                let decoded = this.decodeMaccmsUrl(pv.url)
                if (decoded && /\.(m3u8|mp4)(\?.*)?$/i.test(decoded)) return decoded
                if (decoded && /^https?:\/\//i.test(decoded) && !seen[decoded]) {
                    seen[decoded] = true
                    current = decoded
                    continue
                }
            }

            // 4) 跟随嵌套 iframe 播放页（如 QQ 播放器）：作为主 frame 重新加载嗅探
            let np = results.find(r => r && r.type === 'nested_page' && r.url && !seen[r.url])
            if (np) {
                seen[np.url] = true
                current = np.url
                continue
            }
            break
        }
        return null
    }

    parseAnime(a) {
        // 1. 获取对应的 HTML 节点（列表页与搜索页结构略有差异，互相兜底）
        let link = a.querySelector('a.video-wrapper')
        let imagelink = a.querySelector('img.videoimg')

        // 2. 解析属性与文本值（增加可选链与空值保护）
        let id = link?.attributes['href']?.trim() ?? ''

        // 图片链接优先使用 src（根据提供的 HTML），若图片使用了懒加载亦可兼容 data-src
        let image = imagelink?.attributes['src']?.trim() || imagelink?.attributes['data-src']?.trim() || ''
        let cover = image.startsWith('http') ? image : (image ? `${this.baseUrl}${image}` : '')

        // 标题按"文本非空"依次尝试：video-by > video-name > img alt > a[title]
        // （explore 中 video-by 存在但为空，标题在 video-name；搜索结果标题在 video-by）
        let name = a.querySelector('div.video-by')?.text?.trim() ?? ''
        if (!name) name = a.querySelector('div.video-name')?.text?.trim() ?? ''
        if (!name) name = imagelink?.attributes['alt']?.trim() ?? ''
        if (!name) name = link?.attributes['title']?.trim() ?? ''

        let info = a.querySelector('div.video-time')?.text?.trim() ?? ''
        let view = a.querySelector('div.video-view')?.text?.trim() ?? ''

        // 组合信息（例如：把状态和播放量合并到 description）
        let description = [info, view].filter(Boolean).join(' | ')

        return new Anime({
            id: id,
            title: name,
            subtitle: '',       // 当前 HTML 中未提供副标题
            cover: cover,
            tags: [],           // 当前 HTML 中未提供分类标签
            description: description,  // 输出示例："1.0 | 更新至5话"
        })
    }

    async fetchAnimes(url) {
        let res = await Network.get(url, this.headers)
        if (res.status !== 200) {
            throw `Invalid Status Code ${res.status}`
        }
        let document = new HtmlDocument(res.body)
        let animeDivs = []
        for (let s of ['div.video', 'div.videos .video', 'div.vodlist_item', 'div.searchlist']) {
            let els = document.querySelectorAll(s)
            if (els.length > 0) {
                animeDivs = els
                break
            }
        }
        console.log(`7sefun: ${url} bodyLen=${res.body.length} itemCount=${animeDivs.length}`)
        let animes = animeDivs.map(a => {
            try {
                return this.parseAnime(a)
            } catch (e) {
                console.error("Error parsing anime:", e)
                return null
            }
        }).filter(a => a !== null)
        document.dispose()
        return animes
    }

    explore = [
        {
            title: "番剧最新",

            type: "multiPageAnimeList",

            load: async (page) => {
                let animes = await this.fetchAnimes(`${this.baseUrl}/vodshow/1--------${page}---.html`)
                return {
                    animes: animes,
                    maxPage: null,
                }
            }
        },
        {
            title: "剧场版最新",

            type: "multiPageAnimeList",

            load: async (page) => {
                let animes = await this.fetchAnimes(`${this.baseUrl}/vodshow/2--------${page}---.html`)
                return {
                    animes: animes,
                    maxPage: null,
                }
            }
        },
        {
            title: "特摄最新",

            type: "multiPageAnimeList",

            load: async (page) => {
                let animes = await this.fetchAnimes(`${this.baseUrl}/vodshow/4--------${page}---.html`)
                return {
                    animes: animes,
                    maxPage: null,
                }
            }
        },
        {
            title: "国漫最新",

            type: "multiPageAnimeList",

            load: async (page) => {
                let animes = await this.fetchAnimes(`${this.baseUrl}/vodshow/5--------${page}---.html`)
                return {
                    animes: animes,
                    maxPage: null,
                }
            }
        },
        {
            title: "美番最新",

            type: "multiPageAnimeList",

            load: async (page) => {
                let animes = await this.fetchAnimes(`${this.baseUrl}/vodshow/6--------${page}---.html`)
                return {
                    animes: animes,
                    maxPage: null,
                }
            }
        },
    ]

    static category_param_dict = {
        "全部": "2",
        "日本动漫": "riman",
        "国产动漫": "guoman",
        "欧美动漫": "oman",
        "动漫电影": "dmdianying",
    }

    category = {
        title: "7sefun",
        parts: [
            {
                name: '类型',
                type: 'fixed',
                categories: Object.keys(sefun7.category_param_dict),
                categoryParams: Object.values(sefun7.category_param_dict),
                itemType: "category"
            }
        ]
    }

    categoryAnimes = {
        load: async (category, param, options, page) => {
            let animes = await this.fetchAnimes(`${this.baseUrl}/vodshow/${param}--------${page}---.html`)
            return {
                animes: animes,
                maxPage: null
            }
        },
        optionList: []
    }

    search = {
        load: async (keyword, searchOption, page) => {
            let animes = await this.fetchAnimes(`${this.baseUrl}/vodsearch/-------------.html?wd=${keyword}`)

            return {
                animes: animes,
                maxPage: 1
            }
        },
    }

    /**
     * 解析某个线路（.chat-header）的剧集。
     * 在 header 之后遍历兄弟节点找到含 /vodplay/ 链接的容器。
     * 返回 { name, epMap }；找不到剧集返回 null。
     */
    getLineEpisodes(h, fallbackName) {
        let bfq = h.querySelector('.chat-stream-bfq')
        let lineName = bfq?.text?.trim() || fallbackName || ''
        if (!lineName) return null
        let container = h.nextElementSibling
        let links = []
        while (container) {
            links = container.querySelectorAll('a[href*="/vodplay/"]')
            if (links.length > 0) break
            container = container.nextElementSibling
        }
        if (links.length === 0) return null
        let epMap = new Map()
        for (let a of links) {
            let href = a.attributes['href']?.trim() ?? ''
            let text = a.text?.trim() ?? ''
            if (!href) continue
            if (!text) text = `第${epMap.size + 1}集`
            epMap.set(href, text)
        }
        if (epMap.size === 0) return null
        return { name: lineName, epMap: epMap }
    }

    anime = {
        loadInfo: async (id) => {
            let url = this.fullUrl(id)
            let res = await Network.get(url, this.headers)
            if (res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)

            let titleElement = document.querySelector('div.video-p-name')
            let title = titleElement?.text?.trim() ?? ''
            let hotIdx = title.indexOf('热度：')
            if (hotIdx > -1) title = title.slice(0, hotIdx).trim()

            let imageElement = document.querySelector('img.author-img')
            let imageUrl = imageElement?.attributes['src']?.trim() ?? ''
            let cover = this.fullUrl(imageUrl)

            let descriptionElement = document.querySelector('div.video-p-subtitle')
            let description = descriptionElement?.text?.trim() ?? ''

            // 解析 video-p-sub1 中的 "导演：/演员：/类型：/别名：" 等
            let subMap = {}
            let sub1s = document.querySelectorAll('div.video-p-sub1')
            for (let s of sub1s) {
                let text = s.text?.trim() ?? ''
                let m = text.match(/^([^：:]+)[：:]\s*(.*)$/)
                if (m) {
                    subMap[m[1].trim()] = m[2].trim()
                }
            }

            let director = subMap['导演'] ? subMap['导演'].split(',').map(s => s.trim()).filter(Boolean) : []
            let actors = subMap['演员'] ? subMap['演员'].split(',').map(s => s.trim()).filter(Boolean) : []
            let tags = subMap['类型'] ? subMap['类型'].split(',').map(s => s.trim()).filter(Boolean) : []

            // 按播放线分组剧集：每个 .chat-header 带 .chat-stream-bfq（线路名），
            // 其后的剧集容器含 .message-container.vod-play-list-container。
            // 1) 优先只保留名称包含 "b" 的线路（如 "b"、"B线路"、"线路B" 等）。
            let eps = {}
            let chatHeaders = document.querySelectorAll('.chat-header')

            for (let h of chatHeaders) {
                let bfq = h.querySelector('.chat-stream-bfq')
                let lineName = bfq?.text?.trim() ?? ''
                if (!lineName) continue
                if (!lineName.toLowerCase().includes('b')) continue
                let parsed = this.getLineEpisodes(h, lineName)
                if (!parsed) continue
                // 同名线路去重
                let key = parsed.name, n = 1
                while (eps[key]) key = `${parsed.name}${n++}`
                eps[key] = parsed.epMap
            }

            // 2) 没有含 "b" 的线路时，兜底解析所有线路
            if (Object.keys(eps).length === 0) {
                let fallbackIndex = 0
                for (let h of chatHeaders) {
                    fallbackIndex++
                    let parsed = this.getLineEpisodes(h, `线路${fallbackIndex}`)
                    if (!parsed) continue
                    let key = parsed.name, n = 1
                    while (eps[key]) key = `${parsed.name}${n++}`
                    eps[key] = parsed.epMap
                }
            }

            // 3) 完全无剧集时给空占位
            if (Object.keys(eps).length === 0) {
                let epMap = new Map()
                epMap.set('#', '暂无剧集')
                eps['播放列表'] = epMap
            }

            // 猜你喜欢
            let recommends = []
            let chatVids = document.querySelectorAll('div.chat-vid')
            for (let c of chatVids) {
                let aTag = c.querySelector('a.chat-vid__wrapper')
                let href = aTag?.attributes['href']?.trim() ?? ''
                if (!href) continue
                let img = c.querySelector('img.chat-vid__img')
                let image = img?.attributes['src']?.trim() ?? ''
                let name = c.querySelector('.chat-vid__name')?.text?.trim() ?? ''
                let by = c.querySelector('.chat-vid__by')?.text?.trim() ?? ''
                recommends.push(new Anime({
                    id: href,
                    title: name,
                    subtitle: '',
                    cover: this.fullUrl(image),
                    tags: [],
                    description: by,
                }))
            }
            document.dispose()

            return new AnimeDetails({
                title: title,
                cover: cover,
                description: description,
                tags: {
                    "导演": director,
                    "演员": actors,
                    "类型": tags,
                },
                episode: eps,
                recommend: recommends,
                url: url,
            })
        },

        loadEp: async (animeId, epId) => {
            if (!epId || epId === '#') throw "暂无剧集"
            let pageUrl = this.fullUrl(epId)

            // 1. 遍历页面所有 player 配置：每线路一个，取第一个能解出 m3u8/mp4 的，
            //    或解码出真实播放页地址作为 WebView 目标
            let targetUrl = pageUrl
            let res = await Network.get(pageUrl, this.headers)
            if (res.status !== 200) throw "Invalid status code: " + res.status
            let pmRe = /player_[a-z0-9]+\s*=\s*(\{[\s\S]*?\})/g
            let pm
            while ((pm = pmRe.exec(res.body)) !== null) {
                let cfg = null
                try { cfg = JSON.parse(pm[1]) } catch (e) {}
                if (!cfg || !cfg.url) continue
                let decoded = this.decodeMaccmsUrl(cfg.url)
                if (decoded && /\.(m3u8|mp4)(\?.*)?$/i.test(decoded)) return decoded
                if (decoded && /^https?:\/\//i.test(decoded) && targetUrl === pageUrl) {
                    targetUrl = decoded
                }
            }

            // 2. WebView 加载目标页（可能是解码出的真实播放页）并跟随跳转嗅探
            let videoUrl = await this.resolveViaWebview(targetUrl)
            if (videoUrl) return videoUrl
            throw "未找到播放链接"
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
