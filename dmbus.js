/** @type {import('./_kostori_.js')} */
class Dmbus extends AnimeSource {

    name = "dmbus"

    isBangumi = true

    key = "dmbus"

    version = "1.0.0"

    minAppVersion = "2.0.0"

    url = "https://raw.githubusercontent.com/kostori-app/kostori-configs/master/dmbus.js"

    host = "https://dmbus.cc"

    get baseUrl() {
        return `https://dmbus.cc`
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
     * 解析列表/搜索卡片：<div class="item"> 内
     * <a class="cover" data-bg="...">（封面）<a class="title" href="/v/6185.html">（标题）
     * <span class="desc">（状态）
     */
    parseAnime(item) {
        let coverA = item.querySelector('a.cover')
        let titleA = item.querySelector('a.title')
        let link = titleA || coverA
        let href = link?.attributes['href']?.trim() ?? ''

        let id = ''
        let m = href.match(/\/v\/([^./?#]+)/)
        if (m) id = m[1]

        let image = coverA?.attributes['data-bg']?.trim() ?? ''
        let cover = image.startsWith('http') ? image : (image ? this.fullUrl(image) : '')

        let name = titleA?.attributes['title']?.trim() || titleA?.text?.trim() || link?.attributes['title']?.trim() || ''

        let status = item.querySelector('.desc')?.text?.trim() ?? ''

        return new Anime({
            id: id,
            title: name,
            subtitle: '',
            cover: cover,
            tags: [],
            description: status,
        })
    }

    async fetchAnimes(url) {
        // 用 headless WebView 渲染抓取（dmbus.cc 对普通 HTTP 客户端有
        // Cloudflare 522 等拦截，WebView 可真实渲染拿到 DOM）
        let html = await WebViewVideo.fetchHtml(url, this.headers)
        if (!html) throw `WebView 加载失败: ${url}`
        let document = new HtmlDocument(html)
        let items = document.querySelectorAll('div.item')
        console.log(`dmbus: ${url} itemCount=${items.length}`)
        let animes = items.map(a => {
            try {
                return this.parseAnime(a)
            } catch (e) {
                console.error("Error parsing anime:", e)
                return null
            }
        }).filter(a => a !== null && a.id)
        document.dispose()
        return animes
    }

    static category_map = {
        "国漫": "list-1.html",
        "日漫": "list-2.html",
        "欧美动漫": "list-3.html",
        "电影": "list-4.html",
    }

    category = {
        title: "分类",
        parts: [
            {
                name: '类型',
                type: 'fixed',
                categories: Object.keys(Dmbus.category_map),
                itemType: 'category'
            }
        ]
    }

    categoryAnimes = {
        load: async (category, param, options, page) => {
            let path = Dmbus.category_map[category] || 'list-2.html'
            let animes = await this.fetchAnimes(`${this.baseUrl}${path}`)
            return { animes: animes, maxPage: null }
        }
    }

    explore = [
        {
            title: "最新更新",
            type: "multiPageAnimeList",
            load: async (page) => {
                let animes = await this.fetchAnimes(this.baseUrl)
                return { animes: animes, maxPage: 1 }
            }
        },
        {
            title: "国漫",
            type: "multiPageAnimeList",
            load: async (page) => {
                let animes = await this.fetchAnimes(`${this.baseUrl}/list-1-${page}.html`)
                return { animes: animes, maxPage: null }
            }
        },
        {
            title: "日漫",
            type: "multiPageAnimeList",
            load: async (page) => {
                let animes = await this.fetchAnimes(`${this.baseUrl}/list-2-${page}.html`)
                return { animes: animes, maxPage: null }
            }
        },
        {
            title: "欧美动漫",
            type: "multiPageAnimeList",
            load: async (page) => {
                let animes = await this.fetchAnimes(`${this.baseUrl}/list-3-${page}.html`)
                return { animes: animes, maxPage: null }
            }
        },
        {
            title: "电影",
            type: "multiPageAnimeList",
            load: async (page) => {
                let animes = await this.fetchAnimes(`${this.baseUrl}/list-4-${page}.html`)
                return { animes: animes, maxPage: null }
            }
        },
    ]

    search = {
        load: async (keyword, searchOption, page) => {
            let animes = await this.fetchAnimes(`${this.baseUrl}/s----------.html?wd=${keyword}`)
            return { animes: animes, maxPage: 1 }
        }
    }

    anime = {
        loadInfo: async (id) => {
            let url = `${this.baseUrl}/v/${id}.html`
            // 用 headless WebView 渲染抓取（绕过 Cloudflare 522 拦截）
            let html = await WebViewVideo.fetchHtml(url, this.headers)
            if (!html) throw "WebView 加载失败: " + url
            let document = new HtmlDocument(html)

            let title = document.querySelector('h1.v_title a')?.text?.trim() ?? ''

            let image = document.querySelector('.v_content .cover img')?.attributes['src']?.trim() ?? ''
            // 封面是 /img.php?url=... 代理地址，直接解出真实图片 URL
            let um = image.match(/[?&]url=([^&]+)/)
            if (um) {
                try {
                    image = decodeURIComponent(um[1])
                } catch (e) {}
            }
            let cover = image.startsWith('http') ? image : this.fullUrl(image)

            // 简介：从 #intro 里找「剧情：」开头的段落
            let description = ''
            let intro = document.querySelector('#intro')
            if (intro) {
                for (let p of intro.querySelectorAll('p')) {
                    let t = p.text?.trim() ?? ''
                    if (t.startsWith('剧情：')) {
                        description = t.slice(3).trim()
                        break
                    }
                }
            }

            // 标签：p.v_desc 里的 a（校园、搞笑）
            let tags = []
            for (let a of document.querySelectorAll('p.v_desc a')) {
                let t = a.text?.trim()
                if (t) tags.push(t)
            }

            // 剧集：线路名 + play_list
            let eps = {}
            let lines = document.querySelectorAll('ul.tab_control.play_from li')
            let lineNames = []
            for (let l of lines) {
                let n = l.text?.trim()
                if (n) lineNames.push(n)
            }
            let playLists = document.querySelectorAll('ul.play_list')
            for (let i = 0; i < playLists.length; i++) {
                let lineName = lineNames[i] || `线路${i + 1}`
                let entries = []
                for (let a of playLists[i].querySelectorAll('a')) {
                    let href = a.attributes['href']?.trim() ?? ''
                    let text = a.text?.trim() ?? ''
                    if (!href) continue
                    if (!text) text = `第${entries.length + 1}集`
                    else if (/^\d+$/.test(text)) text = `第${text}集`
                    entries.push([href, text])
                }
                // 页面 play_list 默认倒序（play_list_sort 可切换正序/倒序）：
                // 集号全是纯数字且是倒序时翻转为正序，避免第 1 集排到最后
                let nums = entries.map(e => /^第(\d+)集$/.test(e[1]) ? parseInt(e[1].replace(/[^0-9]/g, ''), 10) : 0)
                if (nums.length > 1 && nums.every(n => n > 0) && nums[0] > nums[nums.length - 1]) {
                    entries.reverse()
                }
                let epMap = new Map(entries)
                if (epMap.size > 0) eps[lineName] = epMap
            }
            if (Object.keys(eps).length === 0) {
                let m = new Map()
                m.set('#', '暂无剧集')
                eps['播放列表'] = m
            }

            // 相关推荐
            let recommend = []
            for (let c of document.querySelectorAll('.type_tab_ul .item')) {
                try {
                    let a = this.parseAnime(c)
                    if (a.id && a.id !== id) recommend.push(a)
                } catch (e) {}
            }

            document.dispose()

            return new AnimeDetails({
                title: title,
                cover: cover,
                description: description,
                tags: { "类型": tags },
                episode: eps,
                recommend: recommend,
                url: url,
            })
        },

        loadEp: async (animeId, epId) => {
            if (!epId || epId === '#') throw "暂无剧集"
            let pageUrl = this.fullUrl(epId)
            // 用 headless WebView 渲染抓取（绕过 Cloudflare 522 拦截）
            let html = await WebViewVideo.fetchHtml(pageUrl, this.headers)
            if (!html) throw "WebView 加载失败: " + pageUrl

            let doc = new HtmlDocument(html)
            let iframe = doc.querySelector('iframe[src]')
            let iframeUrl = iframe?.attributes['src']?.trim() ?? ''
            doc.dispose()
            if (!iframeUrl) throw "未找到播放器"
            iframeUrl = this.fullUrl(iframeUrl)

            // 从 iframe src 提取加密的 url 参数
            let m = iframeUrl.match(/[?&]url=([^&]+)/)
            if (!m) throw "未找到加密地址"
            let encrypted = m[1]

            return await this.resolvePlayUrl(encrypted, pageUrl)
        },

        onClickTag: (namespace, tag) => {
            return {
                action: 'search',
                keyword: tag,
            }
        },
    }

    /**
     * 通过 hhplayer 正常接口解析真实播放地址：
     * 1. GET https://hhjx.hhplayer.com/?url={encrypted} 读取 window.__HHJX_BOOTSTRAP__ 里的 url/t/key
     * 2. POST https://hhjx.hhplayer.com/api/parse 返回真实 mp4/m3u8
     */
    async resolvePlayUrl(encrypted, referer) {
        let playerBase = 'https://hhjx.hhplayer.com'

        let bootRes = await Network.get(`${playerBase}/?url=${encrypted}`, {
            'User-Agent': this.userAgent,
            'Referer': referer,
        })
        if (bootRes.status !== 200) throw "获取播放器失败: " + bootRes.status

        let bm = bootRes.body.match(/window\.__HHJX_BOOTSTRAP__\s*=\s*(\{[\s\S]*?\})\s*;/)
        if (!bm) throw "未找到播放配置"
        let boot
        try {
            boot = JSON.parse(bm[1])
        } catch (e) {
            throw "播放配置解析失败"
        }
        if (!boot.url || !boot.key) throw "播放配置不完整"

        let parseRes = await Network.post(`${playerBase}/api/parse`, {
            'User-Agent': this.userAgent,
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'Referer': `${playerBase}/`,
            'Origin': playerBase,
        }, {
            url: boot.url,
            t: boot.t,
            key: boot.key,
            client_fallback: false,
        })
        if (parseRes.status !== 200) throw "解析失败: " + parseRes.status

        let json = JSON.parse(parseRes.body)
        if (json.code !== 200 || !json.url) throw "解析失败: " + (json.msg || json.code)
        return json.url
    }

    settings = {
    }

    translation = {
    }
}
