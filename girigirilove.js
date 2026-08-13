/** @type {import('./_kostori_.js')} **/
class Girigirilove extends AnimeSource{
    name = "girigirilove"

    isBangumi = true

    key = "girigirilove"

    version = "1.1.6"

    minAppVersion = "1.0.0"

    url = "https://raw.githubusercontent.com/kostori-app/kostori-configs/master/girigirilove.js"

    host = "https://ani.girigirilove.com"

    get baseUrl() {
        return `https://ani.girigirilove.com`
    }

    get userAgent(){
        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
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
            // 用最终响应地址重试（bgm -> ani 内部重定向会丢会话 cookie），
            // 并绕过 GET 缓存，避免命中旧的验证码页导致死循环
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
     * girigirilove 结构：验证码图片 img.ds-verify-img（src=/verify/index.html），
     * 输入框 input[name=verify]，提交按钮 .verify-submit（data-type 标识场景）。
     * 提交端点：POST /index.php/ajax/verify_check?type=search&verify=<code>，
     * 返回 JSON {code:1} 表示通过。
     */
    async _solveCaptcha(res, reqUrl) {
        // 验证码域名取响应最终 URL（含重定向，bgm -> ani 等镜像），兜底用请求 URL / baseUrl
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
        // 注意：isolate 模式下 fetchBytes().body 是普通 JS Array 而非 ArrayBuffer，
        // 需要先包一层 Uint8Array 取 .buffer，否则 Convert.encodeBase64 会报 variable type error: array。
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

    parseAnime(a) {
        let link = a.querySelector('a.public-list-exp')
        // 兼容 vod-detail / search-list 结构
        if (link == null) {
            let hrefEl = a.querySelector('div.detail-info a[href]') || a.querySelector('a[href]')
            if (hrefEl == null) return null
            let id = (hrefEl.attributes['href'] || '').trim()
            let img = a.querySelector('img.gen-movie-img') || a.querySelector('div.detail-pic img')
            let image = img ? (img.attributes['data-src'] || '') : ''
            let titleEl = a.querySelector('h3.slide-info-title')
            let title = titleEl ? titleEl.text.trim() : ''
            let cover = image ? (image.startsWith('http') ? image : this.baseUrl + image) : ''
            return new Anime({
                id: id,
                title: title,
                subtitle: '',
                cover: cover,
                tags: [],
                description: '',
            })
        }

        let imagelink = link.querySelector('img.gen-movie-img')
        let infolink = a.querySelector('span.public-list-prb')
        let subNamelink = a.querySelector('div.public-list-subtitle')
        let spanPrt = a.querySelector('span.public-prt');

        // 解析属性值
        let id = link.attributes['href'].trim() ?? ''
        let name = link.attributes['title'].trim() ?? ''
        let image = imagelink.attributes['data-src'].trim() ?? ''
        let cover = `${this.baseUrl}${image}`
        let info = infolink.text.trim() ?? ''
        let subName = subNamelink.text.trim() ?? ''
        let category = spanPrt?.text.trim() ?? '';
        let categoryList = category ? category.split(',').map((e) => e.trim()) : [];

        return new Anime({
            id: id,
            title: name,
            subtitle: subName ?? '',
            cover: cover,
            tags: categoryList ?? '',
            description: info ?? '',
        })
    }

    /** 兼容两种列表结构：public-list-box（旧）/ vod-detail（search-list 等新布局） */
    _queryList(document) {
        let divs = document.querySelectorAll('div.public-list-box')
        if (divs.length === 0) {
            divs = document.querySelectorAll('div.vod-detail')
        }
        return divs
    }


    explore = [
        {
        title: "ggl日番",

        type: "mixed",

        load: async (page) => {
            let res = await this._get(`${this.baseUrl}/show/2--------${page}---/`)
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            let animeDivs = this._queryList(document)
            let animeList = []
            let animes = animeDivs.map(a => this.parseAnime(a)).filter(a => a !== null)
            animeList.push(animes)
            document.dispose()
            return {
                data: animeList,
                maxPage: 20000
            }  // 返回包含所有动漫信息的数组
        }
    },
        {
            title: "ggl美番",

            type: "mixed",

            load: async (page) => {
                let res = await this._get(`${this.baseUrl}/show/3--------${page}---/`)
                if(res.status !== 200) {
                    throw `Invalid Status Code ${res.status}`
                }
                let document = new HtmlDocument(res.body)
                let animeDivs = this._queryList(document)
                let animeList = []
                let animes = animeDivs.map(a => this.parseAnime(a)).filter(a => a !== null)
                animeList.push(animes)
                document.dispose()
                return {
                    data: animeList,
                    maxPage: 20000
                }  // 返回包含所有动漫信息的数组
            }
        },
        {
            title: "ggl剧场版",

            type: "mixed",

            load: async (page) => {
                let res = await this._get(`${this.baseUrl}/show/21--------${page}---/`)
                if(res.status !== 200) {
                    throw `Invalid Status Code ${res.status}`
                }
                let document = new HtmlDocument(res.body)
                let animeDivs = this._queryList(document)
                let animeList = []
                let animes = animeDivs.map(a => this.parseAnime(a)).filter(a => a !== null)
                animeList.push(animes)
                document.dispose()
                return {
                    data: animeList,
                    maxPage: 20000
                }  // 返回包含所有动漫信息的数组
            }
        }
    ]

   static category_param = {
        "喜剧": "/show/2---%E5%96%9C%E5%89%A7--------/",
       "爱情": "/show/2---%E7%88%B1%E6%83%85--------/",
       "恐怖": "/show/2---%E6%81%90%E6%80%96--------/",
       "动作": "/show/2---%E5%8A%A8%E4%BD%9C--------/",
       "科幻": "/show/2---%E7%A7%91%E5%B9%BB--------/",
       "剧情": "/show/2---%E5%89%A7%E6%83%85--------/",
       "战争": "/show/2---%E6%88%98%E4%BA%89--------/",
       "奇幻": "/show/2---%E5%A5%87%E5%B9%BB--------/",
       "冒险": "/show/2---%E5%86%92%E9%99%A9--------/",
       "悬疑": "/show/2---%E6%82%AC%E7%96%91--------/",
       "校园": "/show/2---%E6%A0%A1%E5%9B%AD--------/",
       "后宫": "/show/2---%E5%90%8E%E5%AE%AB--------/",
       "热血": "/show/2---%E7%83%AD%E8%A1%80--------/",
       "运动": "/show/2---%E8%BF%90%E5%8A%A8--------/",
       "职场": "/show/2---%E8%81%8C%E5%9C%BA--------/",
       "百合": "/show/2---%E7%99%BE%E5%90%88--------/",
       "乙女": "/show/2---%E4%B9%99%E5%A5%B3--------/",
       "机甲": "/show/2---%E6%9C%BA%E7%94%B2--------/",
       "日常": "/show/2---%E6%97%A5%E5%B8%B8--------/",
       "魔法少女": "/show/2---%E9%AD%94%E6%B3%95%E5%B0%91%E5%A5%B3--------/",
       "异世界": "/show/2---%E5%BC%82%E4%B8%96%E7%95%8C--------/",
       "爱抖露": "/show/2---%E7%88%B1%E6%8A%96%E9%9C%B2--------/",
       "音乐": "/show/2---%E9%9F%B3%E4%B9%90--------/",
       "萌": "/show/2---%E8%90%8C--------/"}

    category = {
        title: "Girigirilove",
        parts: [
            {
                name: "类型",
                type: 'fixed',
                categories: Object.keys(Girigirilove.category_param),
                categoryParams: Object.values(Girigirilove.category_param),
                itemType: "category"
            }
        ]
    }

    categoryAnimes = {
        load: async (category, param, options, page) => {
            const injectPage = (param, page) => {
                const parts = param.split("-");
                const index = parts.length - 4;
                if (index >= 0) {
                    parts[index] = page;
                }
                return parts.join("-");
            };
            let res = await this._get(`${this.baseUrl}${injectPage(param, page)}`)
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            let animeDivs = this._queryList(document)
            let animes = animeDivs.map(a => this.parseAnime(a)).filter(a => a !== null)
            document.dispose()
            return {
                animes: animes,
                maxPage: null
            }
        },
        optionList: [
        ]

    }

    search = {
        load:async (keyword,searchOption,page) => {
            let url = `${this.baseUrl}/search/${keyword}----------${page}---/`
            let res = await this._get(url)
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            // 搜索结果的条目结构：div.vod-detail.search-list
            let animeDivs = document.querySelectorAll('div.vod-detail.search-list')
            if (animeDivs.length === 0) {
                animeDivs = document.querySelectorAll('div.vod-detail')
            }
            let animes = []
            for (let div of animeDivs){
                try {
                    let a = div.querySelector('div.detail-info a[href]') || div.querySelector('a[href]')
                    let id = a ? (a.attributes['href'] || '').trim() : ''
                    let img = div.querySelector('img.gen-movie-img') || div.querySelector('div.detail-pic img')
                    let image = img ? (img.attributes['data-src'] || '') : ''
                    let titleEl = div.querySelector('h3.slide-info-title')
                    let title = titleEl ? titleEl.text.trim() : ''
                    let infoEl = div.querySelector('span.slide-info-remarks.cor5') || div.querySelector('.slide-info-remarks')
                    let info = infoEl ? infoEl.text.trim() : ''
                    let cover = image ? (image.startsWith('http') ? image : this.baseUrl + image) : ''
                    animes.push({
                        id: id,
                        title: title,
                        subtitle: '',
                        cover: cover,
                        tags: [],
                        description: info,
                    })
                } catch (e) {
                    // 单个条目解析失败则跳过
                }
            }
            document.dispose()
            return {
                animes: animes,
                maxPage: 999
            }
        }
    }

    anime = {
        loadInfo: async (id) => {
            let res = await this._get(`${this.baseUrl}${id}`)
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            let animeDivs = this._queryList(document)
            let titleElement = document.querySelector('h3.slide-info-title.hide')
            let title = titleElement.text.trim() ?? ''
            let descriptionElement = document.querySelector('#height_limit.text.cor3')
            let description = descriptionElement.text.trim() ?? ''
            let director = extractLinksAfterStrong(document, '导演')
            let actors = extractLinksAfterStrong(document, '演员')
            let tags = extractLinksAfterStrong(document, '类型')
            let slideInfo = document.querySelector('.slide-info.hide')
            let spanElements = slideInfo.querySelectorAll('span.slide-info-remarks')
            let broadcastDate = []
            spanElements.forEach(span => {
                broadcastDate.push(span.text.trim())
            });
            let imageElement = document.querySelector('div.detail-pic img')
            let imageUrl = imageElement.attributes['data-src'] ?? ''
            let cover = `${this.baseUrl}${imageUrl}`
            let episodeElements = document.querySelectorAll('.anthology-list-play li a')
            let ep = new Map()
            let ep2 = new Map()
            for (let e of episodeElements) {
                let link = e.attributes['href']?.trim() ?? '';
                let title = e.text.trim() ?? '';

                if (title.length === 0) {
                    title = `第${ep.size + 1}話`;
                }

                // Extracting the number after the first dash in the link
                const splitLink = link.split("-");
                if (splitLink.length >= 2) {
                    const episodeNumber = parseInt(splitLink[1]);

                    // Checking if the episode number after the first dash is 1 or 2
                    if (episodeNumber === 1) {
                        ep.set(link, title);

                    } else if (episodeNumber === 2) {
                        ep2.set(link, title);

                    }
                }
            }
            if (ep.size === 0) {
                ep.set('#', '暂无剧集')
            }

            let eps = {
                "繁体": ep,
                "简体": ep2
            }

            let animes = animeDivs.map(a => {
                try {
                    return this.parseAnime(a);  // 调用解析函数
                } catch (e) {
                    console.error("Error parsing anime:", e);  // 打印错误信息
                    return null;  // 出错时返回 null 或其他默认值，跳过当前元素
                }
            }).filter(anime => anime !== null);  // 使用 filter 去除 null 值
            document.dispose()
            return new AnimeDetails({
                id: id,
                title: title,
                cover: cover,
                description: description,
                tags: {
                    "放送日期": broadcastDate,
                    "导演": director,
                    "演员": actors,
                    "类型": tags,
                },
                episode: eps,
                recommend: animes,
                url: this.baseUrl + id,
            })
        },

        loadEp: async (animeId, epId) => {
            let res = await this._get(`${this.baseUrl}${epId}`)
            if (res.status !== 200) {
                throw "Invalid status code: " + res.status
            }
            let document = new HtmlDocument(res.body)
            let div = document.querySelector('.player-left') || document.querySelector('.player-top')
            let scriptContent = div.querySelector('script').text;
            let scriptLines = scriptContent.split(',').map(line => line.trim());
            for (let line of scriptLines) {
                if (line.includes('"url"')) {
                    let encoded = line.split(':')[1].replace(/"/g, '').replace(/,/g, '');
                    let decoded = Convert.decodeBase64(encoded)
                    let urlEncoded = Convert.decodeUtf8(decoded);
                    document.dispose()
                    return decodeURIComponent(urlEncoded)
                }
            }
        },

        onClickTag: (namespace, tag) => {
            return {
                action: 'search',
                keyword: tag,
            }
        },
    }
}

function extractLinksAfterStrong(document, targetText) {
    let strongElements = document.querySelectorAll('div.slide-info.hide >strong')
    let linkElements = [];
    for (let strong of strongElements) {
        let strongText = strong.text.trim().replace(/[:：]/g, '').trim()
        if (strongText === targetText) {
            let parentElement = strong.parent;
            let links = parentElement.querySelectorAll('a');
            links.forEach(link => {
                linkElements.push(link.text.trim());
            });
            break;
        }
    }
    return linkElements;
}
