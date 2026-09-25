/** @type {import('./_kostori_.js')} **/
class Guyuplan extends AnimeSource {
    name = "谷雨计划"

    isBangumi = true

    key = "guyuplan"

    version = "1.0.0"

    minAppVersion = "1.0.0"

    url = "https://raw.githubusercontent.com/kostori-app/kostori-configs/master/guyuplan.js"

    host = "https://dm.guyuplan.com"
    
    httpHeaders = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    }

    get baseUrl() {
        return `https://dm.guyuplan.com`
    }

    get userAgent() {
        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
    }

    decrypt() {
        const time = Math.ceil(new Date().getTime() / 1000);
        return { time, key: Convert.hexEncode(Convert.md5(Convert.encodeUtf8("DS" + time + "DCC147D11943AF75"))) }; // EC.Pop.Uid: DCC147D11943AF75
    }

    async queryJson(query) {

        let res = await Network.post(
            'https://dm.guyuplan.com/index.php/api/vod',
            this.headers,
            query
        )

        if (res.status !== 200) {
            throw `Invalid Status Code ${res.status}`
        }

        return JSON.parse(res.body)
    }

    /**
     * 统一的 GET 请求：若响应是验证码拦截页，则弹出手动验证码输入框，
     * 提交验证后带新 cookie 重试原请求。
     */
    async _get(url, headers = {}) {
        let reqHeaders = {"User-Agent": this.userAgent, ...headers}
        let res = await Network.get(url, reqHeaders)
        let attempts = 0
        while (this._isCaptchaPage(res) && attempts < 3) {
            attempts++
            let solved = await this._solveCaptcha(res, url)
            if (!solved) {
                throw '验证码验证失败，请重试'
            }
            // 用最终响应地址重试，并绕过 GET 缓存，避免命中旧的验证码页导致死循环
            let retryUrl = (res && res.url) ? res.url : url
            res = await Network.get(retryUrl, {...reqHeaders, "cache-time": "no"})
        }
        return res
    }

    /** 判断响应页面是否为验证码拦截页 */
    _isCaptchaPage(res) {
        if (!res || !res.body || typeof res.body !== 'string') return false
        const lower = res.body.toLowerCase()
        if (!lower.includes('captcha') && !lower.includes('verify') && !lower.includes('验证码')) {
            return false
        }
        try {
            let doc = new HtmlDocument(res.body)
            let hit =
                doc.querySelector('img.ds-verify-img, .verify-submit, input[name="verify"]') != null ||
                doc.querySelector('img[src*="captcha"], img[src*="verify"], img[id*="captcha"], form[action*="verify"], input[name*="captcha"]') != null
            doc.dispose()
            return hit
        } catch (e) {
            return false
        }
    }

    /**
     * 解析验证码页面、弹框输入并提交验证。
     * maccms 结构：验证码图片 img.ds-verify-img，输入框 input[name=verify]，
     * 提交按钮 .verify-submit（data-type 标识场景）。
     * 提交端点：POST /index.php/ajax/verify_check?type=<type>&verify=<code>。
     */
    async _solveCaptcha(res, reqUrl) {
        // 验证码域名取响应最终 URL（含重定向），兜底用请求 URL / baseUrl
        let origin = this.baseUrl
        let base = (res && res.url) ? res.url : reqUrl
        let m = String(base).match(/^(https?:\/\/[^/]+)/)
        if (m) origin = m[1]

        let doc = new HtmlDocument(res.body)
        let img = doc.querySelector('img.ds-verify-img') ||
            doc.querySelector('img[src*="verify"], img[src*="captcha"], img[id*="captcha"]')
        let button = doc.querySelector('.verify-submit')

        // 必须在 dispose 之前读取元素属性
        let imgUrl = ''
        if (img) {
            let src = img.attributes['src'] || img.attributes['data-src'] || ''
            if (src) imgUrl = src.startsWith('http') ? src : origin + src
        }
        let type = 'search'
        if (button && button.attributes['data-type']) {
            type = button.attributes['data-type']
        }
        doc.dispose()

        if (!imgUrl) {
            throw '未找到验证码图片'
        }

        // 转成 data URL，确保弹窗内能加载（携带源 cookie）。
        // cache-time: no 绕过 GET 缓存，确保每次拿到当前会话的新验证码图。
        let imgData = imgUrl
        try {
            let r = await Network.fetchBytes('GET', imgUrl, {"User-Agent": this.userAgent, "cache-time": "no"})
            if (r && r.body) {
                let ab = new Uint8Array(r.body).buffer
                imgData = 'data:image/jpeg;base64,' + Convert.encodeBase64(ab)
            }
        } catch (e) {
            imgData = imgUrl
        }

        let code = await UI.showCaptchaDialog('请输入验证码', imgData)
        if (code == null) {
            throw '已取消验证码输入'
        }

        // 提交验证：POST verify_check，验证码走 query 参数（type + verify），返回 JSON {code:1} 表示通过。
        // 不传 body（data 置空），避免空对象 {} 触发 PHP 500。
        try {
            let verifyUrl = origin + '/index.php/ajax/verify_check?type=' +
                encodeURIComponent(type) + '&verify=' + encodeURIComponent(code)
            let vr = await Network.post(
                verifyUrl,
                {
                    "User-Agent": this.userAgent,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                null
            )
            if (vr.status !== 200) return false
            // 解析返回 JSON：code==1 通过
            try {
                let body = typeof vr.body === 'string' ? vr.body : Convert.decodeUtf8(vr.body)
                if (body) {
                    let j = JSON.parse(body)
                    if (j && typeof j === 'object') {
                        if ('code' in j) return Number(j.code) === 1
                        if ('status' in j) {
                            let s = j.status
                            return s === 1 || s === 'success' || s === 200 || s === true
                        }
                    }
                }
            } catch (e) {}
            return true
        } catch (e) {
            return false
        }
    }

    async queryAnimes(query) {
        let json = await this.queryJson(query)

        function parseAnimed(anime) {
            let tags = anime.vod_class ? anime.vod_class.split(',') : []
            let cover = anime.vod_pic
            if (cover && !cover.startsWith('http')) {
                cover = `https://dm.guyuplan.com/${cover.replace(/^\/+/, '')}`
            }

            return new Anime(
                {
                    id: String(anime.vod_id),
                    title: anime.vod_name,
                    subTitle: anime.vod_sub,
                    cover: cover,
                    tags: tags,
                    description: anime.vod_remarks
                }
            )
        }
        let animes = json.list.map(a => parseAnimed(a))
        return {
            animes: animes,
            maxPage: null
        }
    }

    parseAnime(a) {
        let link = a.querySelector('a.public-list-exp')
        let imagelink = link.querySelector('img.gen-movie-img')
        let infolink = a.querySelector('span.public-list-prb')
        let subNamelink = a.querySelector('div.public-list-subtitle')
        let spanPrt = a.querySelector('span.public-prt')

        // 解析属性值：详情链接提取纯数字 id
        let id = extractId(link.attributes['href'] ?? '')
        let name = link.attributes['title']?.trim() ?? ''
        let image = imagelink?.attributes['data-src']?.trim() ?? ''
        let cover = image.startsWith('http') ? image : `${this.baseUrl}${image}`
        let info = infolink?.text?.trim() ?? ''
        let subName = subNamelink?.text?.trim() ?? ''
        let category = spanPrt?.text?.trim() ?? ''
        let categoryList = category ? category.split(',').map((e) => e.trim()) : []

        return new Anime({
            id: id,
            title: name,
            subtitle: subName ?? '',
            cover: cover,
            tags: categoryList ?? '',
            description: info ?? '',
        })
    }

    explore = [
        {
            title: "日番",
            type: "multiPageAnimeList",
            load: async (page) => {
                const { time, key } = this.decrypt();
                return await this.queryAnimes({ "type": 1, "class": "", "page": page, "time": time, "key": key })
            }
        },
        {
            title: "美番",
            type: "multiPageAnimeList",
            load: async (page) => {
                const { time, key } = this.decrypt();
                return await this.queryAnimes({ "type": 2, "class": "", "page": page, "time": time, "key": key })
            }
        },
        {
            title: "电影",
            type: "multiPageAnimeList",
            load: async (page) => {
                const { time, key } = this.decrypt();
                return await this.queryAnimes({ "type": 3, "class": "", "page": page, "time": time, "key": key })
            }
        },
        {
            title: "国漫",
            type: "multiPageAnimeList",
            load: async (page) => {
                const { time, key } = this.decrypt();
                return await this.queryAnimes({ "type": 4, "class": "", "page": page, "time": time, "key": key })
            }
        }
    ]

    static category_param = {
        "热血": "热血",
        "运动": "运动",
        "励志": "励志",
        "竞技": "竞技",
        "校园": "校园",
        "奇幻": "奇幻",
        "冒险": "冒险",
        "科幻": "科幻",
        "机甲": "机甲",
        "魔法": "魔法",
        "异世界": "异世界",
        "百合": "百合",
        "恋爱": "恋爱",
        "后宫": "后宫",
        "日常": "日常",
        "搞笑": "搞笑",
        "萌": "萌",
        "治愈": "治愈",
        "音乐": "音乐",
        "偶像": "偶像",
        "悬疑": "悬疑",
        "推理": "推理",
        "恐怖": "恐怖",
        "战斗": "战斗"
    }

    category = {
        title: "谷雨计划",
        parts: [
            {
                name: "类型",
                type: 'fixed',
                categories: Object.keys(Guyuplan.category_param),
                categoryParams: Object.values(Guyuplan.category_param),
                itemType: "category"
            }
        ]
    }

    categoryAnimes = {
        load: async (category, param, options, page) => {
            let type = 1
            if (options && options.length > 0 && options[0]) {
                const t = parseInt(String(options[0]).split('-')[0])
                if (!isNaN(t)) {
                    type = t
                }
            }
            const { time, key } = this.decrypt();
            return await this.queryAnimes({ "type": type, "class": category, "page": page, "time": time, "key": key })
        },
        optionList: [
            {
                label: "分区",
                options: [
                    { value: "1", label: "日番" },
                    { value: "2", label: "美番" },
                    { value: "3", label: "电影" },
                    { value: "4", label: "国漫" },
                ]
            }
        ]
    }

    search = {
        load: async (keyword, searchOption, page) => {
            let url = page === 1 
                ? `${this.baseUrl}/index.php/vod/search/wd/${encodeURIComponent(keyword)}.html` 
                : `${this.baseUrl}/index.php/vod/search/wd/${encodeURIComponent(keyword)}/page/${page}.html`
            let res = await this._get(url)
            if (res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            let animeDivs = document.querySelectorAll('div.public-list-box')
            let animes = []
            for (let div of animeDivs) {
                let link = div.querySelector('a.public-list-exp')
                let id = extractId(link?.attributes['href'] ?? '')
                // 图片：img.data-src 优先，其次 div.cover 背景图
                let imgEl = link?.querySelector('img')
                let image = imgEl?.attributes['data-src']?.trim() ?? imgEl?.attributes['src']?.trim() ?? ''
                if (!image) {
                    let coverDiv = div.querySelector('div.cover')
                    let style = coverDiv?.attributes['style'] ?? ''
                    let m = String(style).match(/url\((https?:\/\/[^)]+)\)/)
                    if (m) image = m[1]
                }
                // 标题：thumb-txt a 优先，其次 title 属性去掉"封面图"后缀
                let title = div.querySelector('div.thumb-txt a')?.text?.trim() ??
                    link?.attributes['title']?.trim()?.replace(/封面图$/, '') ?? ''
                // 更新状态
                let info = div.querySelector('span.public-list-prb')?.text?.trim() ?? ''
                // 简介
                let subName = div.querySelector('span.thumb-blurb')?.text?.trim() ?? ''
                // 分类：thumb-else 的 /class/ 链接；兼容旧结构 .public-prt
                let categoryList = []
                for (let cl of div.querySelectorAll('div.thumb-else a[href*="/class/"]')) {
                    let t = cl.text?.trim() ?? ''
                    if (t) categoryList.push(t)
                }
                if (subName === '') {
                    subName = div.querySelector('.public-list-subtitle')?.text?.trim() ?? ''
                }
                if (categoryList.length === 0) {
                    let category = div.querySelector('.public-prt')?.text?.trim() ?? ''
                    categoryList = category ? category.split(',').map((e) => e.trim()) : []
                }
                let cover = image.startsWith('http') ? image : `${this.baseUrl}${image}`
                animes.push(new Anime({
                    id: id,
                    title: title,
                    subtitle: subName,
                    cover: cover,
                    tags: categoryList,
                    description: info,
                }))
            }
            let lastPageA = document.querySelector('.stui-page li:last-child a') ?? document.querySelector('.page-link:last-child')
            let maxPage = lastPageA ? parseInt(lastPageA.text.trim()) : 999
            document.dispose()
            return {
                animes: animes,
                maxPage: maxPage
            }
        }
    }

    anime = {
        loadInfo: async (id) => {
            let res = await this._get(`${this.baseUrl}/index.php/vod/detail/id/${id}`)
            if (res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            
            // 标题
            let titleElement = document.querySelector('h3.slide-info-title')
            let title = titleElement?.text?.trim() ?? ''
            
            // 简介（去 &nbsp; 残留的非断行空格）
            let descriptionElement = document.querySelector('#height_limit.text')
            let description = (descriptionElement?.text ?? '').replace(/\u00a0/g, '').trim()
            
            // 封面
            let imageElement = document.querySelector('div.detail-pic img')
            let imageUrl = imageElement?.attributes['data-src'] ?? ''
            let cover = imageUrl.startsWith('http') ? imageUrl : `${this.baseUrl}${imageUrl}`
            
            // 备注（更新状态）
            let remarkElements = document.querySelectorAll('.slide-info-remarks')
            let remarks = []
            let tags = {}
            let year = ''
            let region = ''
            let genreList = []
            
            for (let el of remarkElements) {
                let text = el.text?.trim() ?? ''
                if (text) {
                    remarks.push(text)
                }
            }
            
            // 提取演员
            let actors = extractFieldAfterStrong(document, '演员')
            
            // 提取导演
            let director = extractFieldAfterStrong(document, '导演')
            
            // 提取类型标签
            let genreElements = document.querySelectorAll('.slide-info .slide-info-remarks a')
            for (let el of genreElements) {
                let text = el.text?.trim() ?? ''
                let href = el.attributes['href'] ?? ''
                if (href.includes('/class/')) {
                    genreList.push(text)
                }
            }
            
            // 提取年份和地区
            let strongElements = document.querySelectorAll('.slide-info strong, div.slide-info a')
            for (let el of document.querySelectorAll('a[href*="/search/year/"]')) {
                year = el.text?.trim() ?? ''
            }
            for (let el of document.querySelectorAll('a[href*="/search/未知/"]')) {
                region = el.text?.trim() ?? ''
            }
            
            // 更新时间
            let updateTime = ''
            for (let el of document.querySelectorAll('.slide-info')) {
                let text = el.text?.trim() ?? ''
                if (text.includes('更新')) {
                    let match = text.match(/更新\s*[:：]\s*(\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2}:\d{2})/)
                    if (match) {
                        updateTime = match[1]
                    }
                }
            }
            
            // 集数 - 遍历所有线路（box 与线路 tab 顺序一一对应）
            let routeSlides = Array.from(document.querySelectorAll('.anthology-tab .swiper-slide'))
            let routeNames = routeSlides.map(s => {
                let rt = s.text?.trim() ?? ''
                let badge = s.querySelector('.badge')?.text?.trim() ?? ''
                if (badge && rt.endsWith(badge)) {
                    rt = rt.slice(0, rt.length - badge.length)
                }
                return rt.replace(/\u00a0/g, '').trim() || ''
            })
            let boxes = Array.from(document.querySelectorAll('.anthology-list-box'))
            // 外层按线路组织：key = 线路名，value = 该线路的集 map（客户端按线路/集两级读取）
            let ep = new Map()
            boxes.forEach((box, i) => {
                let playList = box.querySelector('.anthology-list-play')
                if (!playList) return
                let epList = new Map()
                for (let e of playList.querySelectorAll('li a')) {
                    let link = e.attributes['href']?.trim() ?? ''
                    // 清理站点模板残留的装饰前缀/尾巴（如"▶️ 立即播放"）
                    let epTitle = (e.text?.trim() ?? '')
                        .replace(/[\s▶▶️]+/g, '')
                        .replace(/立即播放$/g, '')
                    if (epTitle.length === 0) {
                        epTitle = `第${epList.size + 1}集`
                    }
                    if (link) {
                        // 集值须为 Map（客户端 episode 解析只接受 Map 格式）
                        epList.set(link, { title: epTitle })
                    }
                }
                if (epList.size === 0) return
                ep.set(routeNames[i] || `线路${i + 1}`, epList)
            })
            if (ep.size === 0) {
                ep.set('#', { title: '暂无剧集' })
            }
            
            // 推荐动漫
            let animeDivs = document.querySelectorAll('div.public-list-box')
            let recommendList = []
            for (let a of animeDivs) {
                try {
                    let anime = this.parseAnime(a)
                    if (anime.id !== id) {
                        recommendList.push(anime)
                    }
                } catch (e) {
                    // skip
                }
            }
            
            // 构建tags
            tags = {
                "地区": region ? [region] : [],
                "类型": genreList,
                "导演": director,
                "演员": actors,
            }
            
            // 备注信息
            let remarkText = ''
            for (let el of document.querySelectorAll('.slide-info')) {
                let text = el.text?.trim() ?? ''
                if (text.startsWith('备注')) {
                    remarkText = text.replace(/备注\s*[:：]\s*/, '')
                }
            }
            
            document.dispose()
            return new AnimeDetails({
                title: title,
                cover: cover,
                description: description,
                tags: tags,
                episode: ep,
                recommend: recommendList,
                url: this.baseUrl + '/index.php/vod/detail/id/' + id,
                updateTime: year,
            })
        },

        loadEp: async (animeId, epId) => {
            let pageUrl = `${this.baseUrl}${epId}`

            // 剥掉转发壳（如 https://xxx/m3u8/?url=<真实地址>），只留真实 m3u8/mp4
            let realUrl = (u) => {
                if (!u || typeof u !== 'string') return u
                let m = u.match(/^https?:\/\/[^\s?]+\?[^\s]*url=([^&\s]+)/i)
                if (m) {
                    let real = decodeURIComponent(m[1])
                    if (/^https?:\/\//i.test(real)) return real
                }
                return u
            }

            // 1) 嗅探播放页：优先拿直接视频地址，否则取嵌套解析站(bfq)的 iframe 地址
            let r1 = await WebViewVideo.fetchVideoUrl(pageUrl, {"User-Agent": this.userAgent}, null, 10000, true)
            for (let item of r1) {
                if (item && (item.type === 'video' || item.type === 'hls_native') && item.url && /\.m3u8/i.test(item.url)) {
                    return realUrl(item.url)
                }
            }
            let frameUrl = ''
            for (let item of r1) {
                if (item && (item.type === 'nested_page' || item.type === 'player_url') && item.url) {
                    frameUrl = item.url
                    break
                }
            }
            if (!frameUrl) {
                throw "Could not find player iframe"
            }

            // 2) 在解析站页面上下文注入脚本（同源可读 config、可 fetch api.php、crypto-js 已加载）：
            //    POST api.php → AES-CBC-128 解密 → 上报真实 m3u8
            let decryptScript = `(function(){
                var tries = 0;
                var done = false;
                function go() {
                    if (done) return;
                    try {
                        if (typeof config === 'undefined' || !config || !config.url || typeof CryptoJS === 'undefined') { throw 'not ready'; }
                        var body = 'url=' + encodeURIComponent(config.url) + '&time=' + encodeURIComponent(config.time) + '&key=' + encodeURIComponent(config.key);
                        fetch('api.php', {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: body})
                        .then(function(r) { return r.json(); })
                        .then(function(d) {
                            if (d && d.code == '200' && d.url) {
                                var dec = CryptoJS.AES.decrypt(d.url, CryptoJS.enc.Utf8.parse('ARTPLAYERliUlanG'), {
                                    iv: CryptoJS.enc.Utf8.parse('ArtplayerliUlanG'),
                                    mode: CryptoJS.mode.CBC,
                                    padding: CryptoJS.pad.Pkcs7
                                });
                                var u = dec.toString(CryptoJS.enc.Utf8);
                                if (u && !done) {
                                    done = true;
                                    try { __kostoriReport({type: 'video', url: u}); } catch(e) {}
                                }
                            }
                        }).catch(function(){});
                    } catch(e) {}
                    if (++tries < 50) setTimeout(go, 400);
                }
                go();
            })();`
            let r2 = await WebViewVideo.fetchVideoUrl(frameUrl, {"User-Agent": this.userAgent, "Referer": pageUrl}, decryptScript, 15000, false)
            for (let item of r2) {
                if (item && (item.type === 'video' || item.type === 'hls_native') && item.url) {
                    return realUrl(item.url)
                }
            }

            throw "Could not find video URL via webview sniffing"
        },

        onClickTag: (namespace, tag) => {
            return {
                action: 'search',
                keyword: tag,
            }
        },
    }
}

/**
 * 提取strong标签后的链接文本
 * @param document {HtmlDocument}
 * @param fieldName {string}
 * @returns {string[]}
 */
function extractFieldAfterStrong(document, fieldName) {
    let strongElements = document.querySelectorAll('div.slide-info strong, .slide-info strong')
    let results = []
    for (let strong of strongElements) {
        let strongText = strong.text?.trim()?.replace(/[:：]/g, '')?.trim() ?? ''
        if (strongText === fieldName) {
            let parentElement = strong.parent
            if (parentElement) {
                let links = parentElement.querySelectorAll('a')
                links.forEach(link => {
                    let text = link.text?.trim() ?? ''
                    if (text) {
                        results.push(text)
                    }
                })
            }
            break
        }
    }
    return results
}

/**
 * 从详情/播放链接中提取纯数字 id
 * @param href {string}
 * @returns {string}
 */
function extractId(href) {
    let m = String(href).match(/\/id\/(\d+)/)
    return m ? m[1] : String(href)
}
