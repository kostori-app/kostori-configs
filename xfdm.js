/** @type {import('./_kostori_.js')} */
class Xfdm extends AnimeSource{
    name = "xfdm"

    isBangumi = true

    key = "xfdm"

    version = "1.0.9"

    minAppVersion = "1.0.0"

    url = "https://raw.githubusercontent.com/kostori-app/kostori-configs/master/xfdm.js"

    host = "https://dm1.xfdm.pro"

    // ── 稀饭动漫 Next（next.xifanacg.com / api.xifanacg.com）──────────────────
    // 规则来源：https://github.com/Predidit/KazumiRules/blob/main/xfdmnext.json
    // 通过设置里的「接口版本」在旧站与新站之间切换。
    nextBaseUrl = "https://next.xifanacg.com"

    nextApiUrl = "https://api.xifanacg.com"

    nextApiKey = "sb_publishable_OBIVAWACIX6lPXrO98_z24_HcsmalkA"

    get baseUrl() {
        return `https://dm1.xfdm.pro`
    }

    get nextHeaders() {
        return {
            'apikey': this.nextApiKey,
            'Authorization': `Bearer ${this.nextApiKey}`,
            'Content-Type': 'application/json',
        }
    }

    // 是否启用稀饭动漫 Next 新接口（默认使用旧接口）
    useNext() {
        try {
            return this.loadSetting('apiType') === 'next'
        } catch (e) {
            return false
        }
    }

    // 调用 Next 站的 Supabase RPC
    async nextQuery(fn, body) {
        let res = await Network.post(
            `${this.nextApiUrl}/rest/v1/rpc/${fn}`,
            this.nextHeaders,
            body
        )
        if (res.status !== 200) {
            throw `Invalid Status Code ${res.status}`
        }
        return JSON.parse(res.body)
    }

    // 列表卡片/覆盖层用的短提示（对齐站点卡片：更新至 x / y 集、全 x 集等）
    nextRemark(a) {
        if (a.is_finished && a.total_episodes) {
            return `全 ${a.total_episodes} 集`
        }
        if (a.current_episodes && a.total_episodes) {
            return `更新至 ${a.current_episodes} / ${a.total_episodes} 集`
        }
        if (a.current_episodes) {
            return `更新至 ${a.current_episodes} 集`
        }
        let parts = []
        if (a.anime_type && a.anime_type.name) {
            parts.push(a.anime_type.name)
        }
        if (a.release_year) {
            parts.push(String(a.release_year))
        }
        return parts.join(' · ')
    }

    parseNextAnime(a) {
        return new Anime({
            id: String(a.id),
            title: a.title,
            subtitle: a.title_original ?? '',
            cover: a.cover_url,
            tags: a.meta_tags ?? [],
            description: this.nextRemark(a),
            stars: a.bangumi_score ?? null,
        })
    }

    nextMaxPage(list, pageSize) {
        let total = list.length > 0 ? (list[0].total_count ?? 0) : 0
        return Math.max(1, Math.ceil(total / pageSize))
    }

    // 空关键词 + 排序即可当作榜单/最新列表使用
    // filterTypeId: 1=连载新番 2=完结旧番 3=剧场版 4=美漫（新接口分类参数）
    async nextList(sortBy, sortOrder, page, filterTypeId) {
        let pageSize = 24
        let body = {
            search_term: '',
            page_number: page,
            items_per_page: pageSize,
            sort_by: sortBy,
            sort_order: sortOrder ?? 'desc',
        }
        if (filterTypeId) {
            body.filter_type_id = filterTypeId
        }
        let list = await this.nextQuery('search_animes', body)
        return {
            animes: list.map((a) => this.parseNextAnime(a)),
            maxPage: this.nextMaxPage(list, pageSize),
        }
    }

    async nextSearch(keyword, page) {
        let pageSize = 24
        let list = await this.nextQuery('search_animes', {
            search_term: keyword,
            page_number: page,
            items_per_page: pageSize,
            sort_by: 'created_at',
            sort_order: 'desc',
        })
        return {
            animes: list.map((a) => this.parseNextAnime(a)),
            maxPage: this.nextMaxPage(list, pageSize),
        }
    }

    async nextLoadInfo(id) {
        let json = await this.nextQuery('get_anime_detail', { p_id: Number(id) })
        let anime = json.anime ?? {}

        // episode 的 key 编码为「线路id|剧集id」，loadEp 时再拆开请求播放地址
        let episode = {}
        for (let source of (json.sources ?? [])) {
            let list = new Map()
            for (let e of (source.episodes ?? [])) {
                let title = e.title || (e.kind === 'movie' ? '正片' : `第${e.episode_number ?? ''}话`)
                list.set(`${source.id}|${e.id}`, title)
            }
            if (list.size > 0) {
                episode[source.name || `线路${source.id}`] = list
            }
        }

        let tags = {
            '导演': anime.director ? [anime.director] : [],
            '演员': anime.actors ?? [],
            '类型': anime.meta_tags ?? [],
        }
        if (anime.release_year) {
            tags['年份'] = [String(anime.release_year)]
        }

        return new AnimeDetails({
            id: String(id),
            title: anime.title,
            subtitle: anime.title_original ?? anime.season_subtitle ?? '',
            cover: anime.cover_url,
            description: anime.description ?? '',
            tags: tags,
            episode: episode,
            recommend: (json.related ?? []).map((a) => this.parseNextAnime(a)),
            url: `${this.nextBaseUrl}/anime/${id}`,
        })
    }

    async nextPlayback(action, episodeId, sourceId) {
        let body = { action: action, episode_id: episodeId }
        if (sourceId) {
            body.source_id = sourceId
        }
        let res = await Network.post(
            `${this.nextApiUrl}/functions/v1/issue-web-playback`,
            this.nextHeaders,
            body
        )
        if (res.status !== 200) {
            return null
        }
        try {
            return JSON.parse(res.body)
        } catch (e) {
            return null
        }
    }

    async nextLoadEp(animeId, epId) {
        let parts = String(epId).split('|')
        let sourceId = Number(parts[0])
        let episodeId = Number(parts[1] ?? parts[0])

        // 优先取 HLS 直链，失败再回退 MP4
        let json = await this.nextPlayback('hls', episodeId, sourceId)
        if (!json || !json.ok || !json.url) {
            json = await this.nextPlayback('fallback', episodeId, sourceId)
        }
        if (!json || !json.ok || !json.url) {
            throw 'Failed to load playback url'
        }
        return json.url
    }

    get headers() {
        let token = this.loadData('token')
        let headers = {
            'Referer': 'https://dm1.xfdm.pro/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
        if (token) {
            headers['Authorization'] = `Bearer ${token}`
        }
        return headers
    }

    parseAnime(a) {
        let link = a.querySelector('a.public-list-exp')
        let imagelink = link.querySelector('img.gen-movie-img')
        let infolink = a.querySelector('span.public-list-prb')
        let subNamelink = a.querySelector('div.public-list-subtitle')
        let spanPrt = a.querySelector('span.public-prt');

        // 解析属性值
        let id = link.attributes['href'].trim() ?? ''
        let name = link.attributes['title'].trim() ?? ''
        let image = imagelink.attributes['data-src'].trim() ?? ''
        let info = infolink.text.trim() ?? ''
        let subName = subNamelink.text.trim() ?? ''
        let category = spanPrt?.text.trim() ?? '';
        let categoryList = category ? category.split(',').map((e) => e.trim()) : [];

        return new Anime({
            id: id.replace(/\D/g, ""),
            title: name,
            subtitle: subName ?? '',
            cover: image,
            tags: categoryList ?? '',
            description: info ?? '',
        })
    }

    decrypt() {
        const time = Math.ceil(new Date().getTime() / 1000);
        return { time, key: Convert.hexEncode(Convert.md5(Convert.encodeUtf8("DS" + time + "DCC147D11943AF75"))) }; // EC.Pop.Uid: DCC147D11943AF75
    }

    async queryJson(query) {

        let res = await Network.post(
            'https://dm1.xfdm.pro/index.php/api/vod',
            this.headers,
            query
        )

        if (res.status !== 200) {
            throw `Invalid Status Code ${res.status}`
        }

        return JSON.parse(res.body)
    }

    async queryAnimes(query) {
        let json = await this.queryJson(query)

        function parseAnimed(anime) {
            let tags = anime.vod_class ? anime.vod_class.split(',') : []

            return new Anime(
                {
                    id: String(anime.vod_id),
                    title: anime.vod_name,
                    subTitle: anime.vod_sub,
                    cover: anime.vod_pic,
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

    explore = [
        {
        title: "稀饭动漫最新",

        type: "mixed",

        load: async (page) => {
            // 新接口：最近更新
            if (this.useNext()) {
                let res = await this.nextList('updated_at', 'desc', page)
                return { data: [res.animes], maxPage: res.maxPage }
            }
            let res = await Network.get(`https://dm1.xfdm.pro/map.html`,this.headers)
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            let animeDivs = document.querySelectorAll('div.public-list-box')
            let animeList = []
            let animes = animeDivs.map(a => this.parseAnime(a))
            animeList.push(animes)
            document.dispose()
            return {
                data: animeList,
                maxPage: 1
            }  // 返回包含所有动漫信息的数组
        }
        },
        {
            title: "稀饭动漫连载新番",

            type: "mixed",

            load: async (page) => {
                // 新接口：连载新番（按上映日期，与「最新」tab 区分）
                if (this.useNext()) {
                    let res = await this.nextList('release_date', 'desc', page, 1)
                    return { data: [res.animes], maxPage: res.maxPage }
                }
                const { time, key } = this.decrypt();
                let res = await this.queryAnimes({ "type": 1, "class": "", "page": page, "time": time, "key": key })
                return { data: [res.animes], maxPage: res.maxPage }
            }
        },
        {
            title: "稀饭动漫完结旧番",

            type: "mixed",

            load: async (page) => {
                // 新接口：完结旧番（按上映日期）
                if (this.useNext()) {
                    let res = await this.nextList('release_date', 'desc', page, 2)
                    return { data: [res.animes], maxPage: res.maxPage }
                }
                const { time, key } = this.decrypt();
                let res = await this.queryAnimes({ "type": 2, "class": "", "page": page, "time": time, "key": key })
                return { data: [res.animes], maxPage: res.maxPage }
            }
        },
        {
            title: "稀饭动漫剧场版",

            type: "mixed",

            load: async (page) => {
                // 新接口：剧场版（按上映日期）
                if (this.useNext()) {
                    let res = await this.nextList('release_date', 'desc', page, 3)
                    return { data: [res.animes], maxPage: res.maxPage }
                }
                const { time, key } = this.decrypt();
                let res = await this.queryAnimes({ "type": 3, "class": "", "page": page, "time": time, "key": key })
                return { data: [res.animes], maxPage: res.maxPage }
            }
        },
        {
            title: "稀饭动漫美漫",

            type: "mixed",

            load: async (page) => {
                // 新接口：美漫（按上映日期）
                if (this.useNext()) {
                    let res = await this.nextList('release_date', 'desc', page, 4)
                    return { data: [res.animes], maxPage: res.maxPage }
                }
                const { time, key } = this.decrypt();
                let res = await this.queryAnimes({ "type": 21, "class": "", "page": page, "time": time, "key": key })
                return { data: [res.animes], maxPage: res.maxPage }
            }
        },
    ]

    search = {
        load:async (keyword,searchOption,page) => {
            if (this.useNext()) {
                return await this.nextSearch(keyword, page)
            }
            let url = `https://dm1.xfdm.pro/search/wd/${keyword}/page/${page}.html`
            let res = await Network.get(url, this.headers,)
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            let animeDivs = document.querySelectorAll('div.public-list-box')
            let animes = []
            for (let div of animeDivs){
                let id = div.querySelector('a.public-list-exp').attributes['href'].trim() ?? ''
                let image = div.querySelector('a.public-list-exp img').attributes['data-src'].trim() ?? ''
                let title = div.querySelector('.thumb-txt.cor4.hide').text.trim() ?? ''
                let info = div.querySelector('.public-list-prb.hide.ft2').text.trim() ?? ''
                let category = div.querySelector('.thumb-else.cor5.hide').querySelectorAll('a').map(a => a.text.trim())
                animes.push({
                    id: id.replace(/\D/g, ""),
                    title: title,
                    subtitle: '',
                    cover: image,
                    tags: category,
                    description: info,
                })
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
            if (this.useNext()) {
                return await this.nextLoadInfo(id)
            }
            let res = await Network.get(`${this.baseUrl}/bangumi/${id}`,{},)
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            let animeDivs = document.querySelectorAll('div.public-list-box')
            let titleElement = document.querySelector('h3.slide-info-title.hide')
            let title = titleElement.text.trim() ?? ''
            let descriptionElement = document.querySelector('#height_limit.text.cor3')
            let description = descriptionElement.text.trim() ?? ''
            let director = extractLinksAfterStrong(document, '导演')
            let actors = extractLinksAfterStrong(document, '演员')
            let tags = extractLinksAfterStrong(document, '类型')
            let imageElement = document.querySelector('div.detail-pic img')
            let imageUrl = imageElement.attributes['data-src'] ?? ''
            let episodeElements = document.querySelectorAll('.anthology-list-play li a')
            let ep = new Map()
            let ep2 = new Map()
            let ep3 = new Map()
            for (let e of episodeElements) {
                let link = e.attributes['href']?.trim() ?? '';
                let title = e.text.trim() ?? '';

                if (title.length === 0) {
                    title = `第${ep.size + 1}話`;
                }

                // Extracting the number after the first dash in the link
                const splitLink = link.split("/");
                if (splitLink.length >= 2) {
                    const episodeNumber = parseInt(splitLink[3]);

                    if (episodeNumber === 1) {
                        ep.set(link, title);

                    } else if (episodeNumber === 2) {
                        ep2.set(link, title);

                    }else if (episodeNumber === 3) {
                        ep3.set(link, title);

                    }else if (episodeNumber === 4) {
                        ep4.set(link, title);

                    }
                }
            }
            if (ep.size === 0) {
                ep.set('#', '第1話')
            }

            let eps = {
                "稀饭主线1": ep,
                "稀饭主线2": ep2,
                "稀饭备用": ep3
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
                id: id.replace(/\D/g, ""),
                title: title,
                cover: imageUrl,
                description: description,
                tags: {
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
            if (this.useNext()) {
                return await this.nextLoadEp(animeId, epId)
            }
            let res = await Network.get(`${this.baseUrl}${epId}`,{},)
            if (res.status !== 200) {
                throw "Invalid status code: " + res.status
            }
            const json = JSON.parse(res.body.match(/var player_aaaa=({.+?})</)[1]);
            return decodeURIComponent(json.encrypt ? Convert.decodeBase64(json.url) : json.url);
        },

        onClickTag: (namespace, tag) => {
            return {
                action: 'search',
                keyword: tag,
            }
        },
    }

    // 设置：在旧站（dm1.xfdm.pro）与稀饭动漫 Next（next.xifanacg.com）之间切换
    settings = {
        apiType: {
            title: "接口版本",
            type: "select",
            options: [
                { value: "old", text: "稀饭动漫(旧)" },
                { value: "next", text: "稀饭动漫Next(新)" },
            ],
            default: "old",
        },
    }

    translation = {
        'zh_CN': {
            '接口版本': '接口版本',
            '稀饭动漫(旧)': '稀饭动漫(旧)',
            '稀饭动漫Next(新)': '稀饭动漫Next(新)',
        },
        'zh_TW': {
            '接口版本': '介面版本',
            '稀饭动漫(旧)': '稀飯動漫(舊)',
            '稀饭动漫Next(新)': '稀飯動漫Next(新)',
        },
        'en': {
            '接口版本': 'API Version',
            '稀饭动漫(旧)': 'Xifan Anime (Legacy)',
            '稀饭动漫Next(新)': 'Xifan Anime Next',
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