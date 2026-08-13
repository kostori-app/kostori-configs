/** @type {import('./_kostori_.js')} **/
class Guyuplan extends AnimeSource {
    name = "谷雨计划"

    isBangumi = true

    key = "guyuplan"

    version = "1.0.0"

    minAppVersion = "1.0.0"

    url = "https://raw.githubusercontent.com/kostori-app/kostori-configs/master/guyuplan.js"

    host = "https://dm.guyuplan.com"

    get baseUrl() {
        return `https://dm.guyuplan.com`
    }

    get userAgent() {
        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
    }

    parseAnime(a) {
        let link = a.querySelector('a.public-list-exp')
        let imagelink = link.querySelector('img.gen-movie-img')
        let infolink = a.querySelector('span.public-list-prb')
        let subNamelink = a.querySelector('div.public-list-subtitle')
        let spanPrt = a.querySelector('span.public-prt')

        // 解析属性值
        let id = link.attributes['href'].trim() ?? ''
        let name = link.attributes['title'].trim() ?? ''
        let image = imagelink.attributes['data-src'].trim() ?? ''
        let cover = image.startsWith('http') ? image : `${this.baseUrl}${image}`
        let info = infolink?.text.trim() ?? ''
        let subName = subNamelink?.text.trim() ?? ''
        let category = spanPrt?.text.trim() ?? ''
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
                let url = page === 1 
                    ? `${this.baseUrl}/index.php/vod/show/id/1.html` 
                    : `${this.baseUrl}/index.php/vod/show/id/1/page/${page}.html`
                let res = await Network.get(url, {"User-Agent": this.userAgent})
                if (res.status !== 200) {
                    throw `Invalid Status Code ${res.status}`
                }
                let document = new HtmlDocument(res.body)
                let animeDivs = document.querySelectorAll('div.public-list-box')
                let animes = animeDivs.map(a => this.parseAnime(a))
                let lastPageA = document.querySelector('.stui-page li:last-child a') ?? document.querySelector('.page-link:last-child')
                let maxPage = lastPageA ? parseInt(lastPageA.text.trim()) : null
                document.dispose()
                return {
                    animes: animes,
                    maxPage: maxPage
                }
            }
        },
        {
            title: "美番",
            type: "multiPageAnimeList",
            load: async (page) => {
                let url = page === 1 
                    ? `${this.baseUrl}/index.php/vod/show/id/2.html` 
                    : `${this.baseUrl}/index.php/vod/show/id/2/page/${page}.html`
                let res = await Network.get(url, {"User-Agent": this.userAgent})
                if (res.status !== 200) {
                    throw `Invalid Status Code ${res.status}`
                }
                let document = new HtmlDocument(res.body)
                let animeDivs = document.querySelectorAll('div.public-list-box')
                let animes = animeDivs.map(a => this.parseAnime(a))
                let lastPageA = document.querySelector('.stui-page li:last-child a') ?? document.querySelector('.page-link:last-child')
                let maxPage = lastPageA ? parseInt(lastPageA.text.trim()) : null
                document.dispose()
                return {
                    animes: animes,
                    maxPage: maxPage
                }
            }
        },
        {
            title: "电影",
            type: "multiPageAnimeList",
            load: async (page) => {
                let url = page === 1 
                    ? `${this.baseUrl}/index.php/vod/show/id/3.html` 
                    : `${this.baseUrl}/index.php/vod/show/id/3/page/${page}.html`
                let res = await Network.get(url, {"User-Agent": this.userAgent})
                if (res.status !== 200) {
                    throw `Invalid Status Code ${res.status}`
                }
                let document = new HtmlDocument(res.body)
                let animeDivs = document.querySelectorAll('div.public-list-box')
                let animes = animeDivs.map(a => this.parseAnime(a))
                let lastPageA = document.querySelector('.stui-page li:last-child a') ?? document.querySelector('.page-link:last-child')
                let maxPage = lastPageA ? parseInt(lastPageA.text.trim()) : null
                document.dispose()
                return {
                    animes: animes,
                    maxPage: maxPage
                }
            }
        },
        {
            title: "国漫",
            type: "multiPageAnimeList",
            load: async (page) => {
                let url = page === 1 
                    ? `${this.baseUrl}/index.php/vod/show/id/4.html` 
                    : `${this.baseUrl}/index.php/vod/show/id/4/page/${page}.html`
                let res = await Network.get(url, {"User-Agent": this.userAgent})
                if (res.status !== 200) {
                    throw `Invalid Status Code ${res.status}`
                }
                let document = new HtmlDocument(res.body)
                let animeDivs = document.querySelectorAll('div.public-list-box')
                let animes = animeDivs.map(a => this.parseAnime(a))
                let lastPageA = document.querySelector('.stui-page li:last-child a') ?? document.querySelector('.page-link:last-child')
                let maxPage = lastPageA ? parseInt(lastPageA.text.trim()) : null
                document.dispose()
                return {
                    animes: animes,
                    maxPage: maxPage
                }
            }
        }
    ]

    static category_param = {
        "热血": "/index.php/vod/show/class/%E7%83%AD%E8%A1%80/id/1",
        "运动": "/index.php/vod/show/class/%E8%BF%90%E5%8A%A8/id/1",
        "励志": "/index.php/vod/show/class/%E5%8A%B1%E5%BF%97/id/1",
        "竞技": "/index.php/vod/show/class/%E7%AB%9E%E6%8A%80/id/1",
        "校园": "/index.php/vod/show/class/%E6%A0%A1%E5%9B%AD/id/1",
        "奇幻": "/index.php/vod/show/class/%E5%A5%87%E5%B9%BB/id/1",
        "冒险": "/index.php/vod/show/class/%E5%86%92%E9%99%A9/id/1",
        "科幻": "/index.php/vod/show/class/%E7%A7%91%E5%B9%BB/id/1",
        "机甲": "/index.php/vod/show/class/%E6%9C%BA%E7%94%B2/id/1",
        "魔法": "/index.php/vod/show/class/%E9%AD%94%E6%B3%95/id/1",
        "异世界": "/index.php/vod/show/class/%E5%BC%82%E4%B8%96%E7%95%8C/id/1",
        "百合": "/index.php/vod/show/class/%E7%99%BE%E5%90%88/id/1",
        "恋爱": "/index.php/vod/show/class/%E6%81%8B%E7%88%B1/id/1",
        "后宫": "/index.php/vod/show/class/%E5%90%8E%E5%AE%AB/id/1",
        "日常": "/index.php/vod/show/class/%E6%97%A5%E5%B8%B8/id/1",
        "搞笑": "/index.php/vod/show/class/%E6%90%9E%E7%AC%91/id/1",
        "萌": "/index.php/vod/show/class/%E8%90%8C/id/1",
        "治愈": "/index.php/vod/show/class/%E6%B2%BB%E6%84%88/id/1",
        "音乐": "/index.php/vod/show/class/%E9%9F%B3%E4%B9%90/id/1",
        "偶像": "/index.php/vod/show/class/%E5%81%B6%E5%83%8F/id/1",
        "悬疑": "/index.php/vod/show/class/%E6%82%AC%E7%96%91/id/1",
        "推理": "/index.php/vod/show/class/%E6%8E%A8%E7%90%86/id/1",
        "恐怖": "/index.php/vod/show/class/%E6%81%90%E6%80%96/id/1",
        "战斗": "/index.php/vod/show/class/%E6%88%98%E6%96%97/id/1"
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
            let url = page === 1 
                ? `${this.baseUrl}${param}.html` 
                : `${this.baseUrl}${param}/page/${page}.html`
            let res = await Network.get(url, {"User-Agent": this.userAgent})
            if (res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            let animeDivs = document.querySelectorAll('div.public-list-box')
            let animes = animeDivs.map(a => this.parseAnime(a))
            let lastPageA = document.querySelector('.stui-page li:last-child a') ?? document.querySelector('.page-link:last-child')
            let maxPage = lastPageA ? parseInt(lastPageA.text.trim()) : null
            document.dispose()
            return {
                animes: animes,
                maxPage: maxPage
            }
        },
        optionList: []
    }

    search = {
        load: async (keyword, searchOption, page) => {
            let url = page === 1 
                ? `${this.baseUrl}/index.php/vod/search/wd/${encodeURIComponent(keyword)}.html` 
                : `${this.baseUrl}/index.php/vod/search/wd/${encodeURIComponent(keyword)}/page/${page}.html`
            let res = await Network.get(url, {"User-Agent": this.userAgent})
            if (res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            let animeDivs = document.querySelectorAll('div.public-list-box')
            let animes = []
            for (let div of animeDivs) {
                let link = div.querySelector('a.public-list-exp')
                let id = link?.attributes['href'].trim() ?? ''
                let image = link?.querySelector('img')?.attributes['data-src'].trim() ?? ''
                let title = div.querySelector('a.time-title')?.text.trim() ?? link?.attributes['title'].trim() ?? ''
                let info = div.querySelector('.public-list-prb')?.text.trim() ?? ''
                let subName = div.querySelector('.public-list-subtitle')?.text.trim() ?? ''
                let category = div.querySelector('.public-prt')?.text.trim() ?? ''
                let categoryList = category ? category.split(',').map((e) => e.trim()) : []
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
            let res = await Network.get(`${this.baseUrl}${id}`, {"User-Agent": this.userAgent})
            if (res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            
            // 标题
            let titleElement = document.querySelector('h3.slide-info-title')
            let title = titleElement?.text.trim() ?? ''
            
            // 简介
            let descriptionElement = document.querySelector('#height_limit.text')
            let description = descriptionElement?.text.trim() ?? ''
            
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
                let text = el.text.trim()
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
                let text = el.text.trim()
                let href = el.attributes['href'] ?? ''
                if (href.includes('/class/')) {
                    genreList.push(text)
                }
            }
            
            // 提取年份和地区
            let strongElements = document.querySelectorAll('.slide-info strong, div.slide-info a')
            for (let el of document.querySelectorAll('a[href*="/search/year/"]')) {
                year = el.text.trim()
            }
            for (let el of document.querySelectorAll('a[href*="/search/未知/"]')) {
                region = el.text.trim()
            }
            
            // 更新时间
            let updateTime = ''
            for (let el of document.querySelectorAll('.slide-info')) {
                let text = el.text.trim()
                if (text.includes('更新')) {
                    let match = text.match(/更新\s*[:：]\s*(\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2}:\d{2})/)
                    if (match) {
                        updateTime = match[1]
                    }
                }
            }
            
            // 集数 - 使用第一个线路
            let episodeElements = document.querySelectorAll('.anthology-list-box:first-child .anthology-list-play li a')
            let ep = new Map()
            for (let e of episodeElements) {
                let link = e.attributes['href']?.trim() ?? ''
                let epTitle = e.text.trim() ?? ''
                if (epTitle.length === 0) {
                    epTitle = `第${ep.size + 1}集`
                }
                if (link) {
                    ep.set(link, epTitle)
                }
            }
            if (ep.size === 0) {
                ep.set('#', '暂无剧集')
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
                "年份": year ? [year] : [],
                "地区": region ? [region] : [],
                "类型": genreList,
                "导演": director ? [director] : [],
                "演员": actors,
            }
            
            // 备注信息
            let remarkText = ''
            for (let el of document.querySelectorAll('.slide-info')) {
                let text = el.text.trim()
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
                url: this.baseUrl + id,
                updateTime: updateTime,
                uploader: remarkText,
            })
        },

        loadEp: async (animeId, epId) => {
            let res = await Network.get(`${this.baseUrl}${epId}`, {"User-Agent": this.userAgent})
            if (res.status !== 200) {
                throw "Invalid status code: " + res.status
            }
            let document = new HtmlDocument(res.body)
            
            // 尝试从播放页面获取视频URL
            let scriptElements = document.querySelectorAll('script')
            for (let script of scriptElements) {
                let content = script.text ?? ''
                // 查找player_aaaa变量中的url
                let match = content.match(/var\s+player_aaaa\s*=\s*(\{[^}]+\})/)
                if (match) {
                    try {
                        let playerData = JSON.parse(match[1])
                        if (playerData.url) {
                            let url = playerData.url
                            // 尝试base64解码
                            try {
                                let decoded = Convert.decodeBase64(url)
                                url = Convert.decodeUtf8(decoded)
                            } catch (e) {
                                // 如果解码失败，直接使用原URL
                            }
                            document.dispose()
                            return url
                        }
                    } catch (e) {
                        // continue
                    }
                }
                
                // 也尝试直接查找url
                let urlMatch = content.match(/"url"\s*:\s*"([^"]+)"/)
                if (urlMatch) {
                    let url = urlMatch[1]
                    try {
                        let decoded = Convert.decodeBase64(url)
                        url = Convert.decodeUtf8(decoded)
                    } catch (e) {
                        // if decode fails, use as is
                    }
                    document.dispose()
                    return url
                }
            }
            
            // 如果没有找到，尝试从iframe获取
            let iframe = document.querySelector('iframe')
            if (iframe) {
                let src = iframe.attributes['src'] ?? ''
                if (src) {
                    document.dispose()
                    return src.startsWith('http') ? src : `${this.baseUrl}${src}`
                }
            }
            
            document.dispose()
            throw "Could not find video URL"
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
        let strongText = strong.text.trim().replace(/[:：]/g, '').trim()
        if (strongText === fieldName) {
            let parentElement = strong.parent
            if (parentElement) {
                let links = parentElement.querySelectorAll('a')
                links.forEach(link => {
                    let text = link.text.trim()
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
