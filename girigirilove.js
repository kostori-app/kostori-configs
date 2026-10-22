/** @type {import('./_kostori_.js')} */
class Girigirilove extends AnimeSource {
    name = "girigirilove"

    isBangumi = true

    key = "girigirilove"

    version = "1.1.9"

    minAppVersion = "1.3.0"

    url = "https://raw.githubusercontent.com/kostori-app/kostori-configs/master/girigirilove.js"

    host = "https://ani.girigirilove.com"

    get baseUrl() {
        return 'https://ani.girigirilove.com'
    }

    get apiBaseUrl() {
        return 'https://m3u8.girigirilove.com/api.php'
    }

    get userAgent() {
        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
    }

    async _api(path, params = {}) {
        let query = Object.keys(params)
            .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
            .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
            .join('&')
        let requestUrl = `${this.apiBaseUrl}/${path}${query ? `?${query}` : ''}`
        let res = await Network.get(requestUrl, {
            'User-Agent': this.userAgent,
            'Accept': 'application/json',
            'Referer': `${this.baseUrl}/`,
        })
        if (res.status !== 200) {
            throw `Girigirilove API request failed (${res.status}): ${path}`
        }
        let payload
        try {
            payload = JSON.parse(res.body)
        } catch (e) {
            throw `Girigirilove API returned invalid JSON: ${path}`
        }
        if (!payload || (Number(payload.code) !== 1 && Number(payload.code) !== 200)) {
            throw payload?.msg || `Girigirilove API error: ${payload?.code ?? 'unknown'}`
        }
        return payload.info
    }

    _splitValues(value, separator = /[,，]+/) {
        if (!value) return []
        return String(value).split(separator).map((part) => part.trim()).filter(Boolean)
    }

    _imageUrl(value) {
        if (!value) return ''
        let image = String(value).trim()
        if (/^https?:\/\//i.test(image)) return image
        image = image.replace(/^\/+/, '')
        if (image.startsWith('upload/')) return `https://jpg.girigirilove.net/${image}`
        return `${this.baseUrl}/${image}`
    }

    _cleanHtml(value) {
        if (!value) return ''
        return String(value)
            .replace(/<br\s*\/?\s*>/gi, '\n')
            .replace(/<\/p\s*>/gi, '\n')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&quot;/gi, '"')
            .trim()
    }

    _legacyAnimeId(value) {
        let vodId = String(value ?? '').trim()
        if (!vodId) return ''
        // 旧版源使用 /GV{id}/ 作为 Anime.id，历史和收藏依赖这个格式关联。
        return `/GV${vodId}/`
    }

    parseAnime(item) {
        if (!item || item.vod_id == null) return null
        let cover = this._imageUrl(item.vod_pic_thumb || item.vod_pic)
        let tags = this._splitValues(item.vod_class)
        let remarks = item.vod_remarks || ''
        let description = [
            remarks,
            item.vod_year || '',
            item.vod_area || '',
            item.vod_score && item.vod_score !== '0.0' ? `评分 ${item.vod_score}` : '',
        ].filter(Boolean).join(' · ')
        return new Anime({
            id: this._legacyAnimeId(item.vod_id),
            title: item.vod_name || '',
            subtitle: item.vod_sub || '',
            cover: cover,
            tags: tags,
            description: description,
        })
    }

    async _loadList(typeId, page, filters = {}) {
        let pageNumber = Math.max(1, parseInt(page, 10) || 1)
        let limit = 48
        let info = await this._api('Vod/get_list', {
            type_id: typeId,
            offset: (pageNumber - 1) * limit,
            limit: limit,
            ...filters,
        })
        let rows = Array.isArray(info?.rows) ? info.rows : []
        let animes = rows.map((item) => this.parseAnime(item)).filter(Boolean)
        let total = Number(info?.total) || 0
        return {
            animes: animes,
            maxPage: total > 0 ? Math.ceil(total / limit) : 1,
        }
    }

    _extractVodId(value) {
        let text = String(value ?? '').trim()
        if (/^\d+$/.test(text)) return text
        let legacyMatch = text.match(/(?:^|\/)GV(\d+)(?:\/|\.html)?(?:[?#].*)?$/i)
        if (legacyMatch) return legacyMatch[1]
        let match = text.match(/(?:^|\/)(\d+)(?:\.html)?\/?(?:[?#].*)?$/i)
        return match ? match[1] : ''
    }

    _parseEpisodes(detail) {
        let sourceNames = String(detail?.vod_play_from || '').split('$$$')
        let sourceLists = String(detail?.vod_play_url || '').split('$$$')
        let episodes = {}
        for (let i = 0; i < sourceLists.length; i++) {
            let sourceName = sourceNames[i]?.trim() || `线路${i + 1}`
            let sourceEpisodes = new Map()
            let entries = sourceLists[i].split('#')
            for (let index = 0; index < entries.length; index++) {
                let entry = entries[index].trim()
                if (!entry) continue
                let separator = entry.indexOf('$')
                let name = separator >= 0 ? entry.slice(0, separator).trim() : `第${index + 1}集`
                let url = separator >= 0 ? entry.slice(separator + 1).trim() : entry
                if (!url) continue
                sourceEpisodes.set(url, name || `第${index + 1}集`)
            }
            if (sourceEpisodes.size > 0) episodes[sourceName] = sourceEpisodes
        }
        return episodes
    }

    explore = [
        {
            title: "ggl日番",
            type: "mixed",
            load: async (page) => {
                let result = await this._loadList(2, page)
                return { data: [result.animes], maxPage: result.maxPage }
            },
        },
        {
            title: "ggl美番",
            type: "mixed",
            load: async (page) => {
                let result = await this._loadList(3, page)
                return { data: [result.animes], maxPage: result.maxPage }
            },
        },
        {
            title: "ggl剧场版",
            type: "mixed",
            load: async (page) => {
                let result = await this._loadList(21, page)
                return { data: [result.animes], maxPage: result.maxPage }
            },
        },
        {
            title: "ggl真人番剧",
            type: "mixed",
            load: async (page) => {
                let result = await this._loadList(20, page)
                return { data: [result.animes], maxPage: result.maxPage }
            },
        },
    ]

    static category_param = {
        "喜剧": "喜剧",
        "爱情": "爱情",
        "恐怖": "恐怖",
        "动作": "动作",
        "科幻": "科幻",
        "剧情": "剧情",
        "战争": "战争",
        "奇幻": "奇幻",
        "冒险": "冒险",
        "悬疑": "悬疑",
        "校园": "校园",
        "后宫": "后宫",
        "热血": "热血",
        "运动": "运动",
        "职场": "职场",
        "百合": "百合",
        "乙女": "乙女",
        "机甲": "机甲",
        "日常": "日常",
        "魔法少女": "魔法少女",
        "异世界": "异世界",
        "爱抖露": "爱抖露",
        "音乐": "音乐",
        "萌": "萌",
    }

    category = {
        title: "Girigirilove",
        parts: [
            {
                name: "类型",
                type: 'fixed',
                categories: Object.keys(Girigirilove.category_param),
                categoryParams: Object.values(Girigirilove.category_param),
                itemType: "category",
            },
        ],
    }

    categoryAnimes = {
        load: async (category, param, options, page) => {
            let result = await this._loadList(2, page, { vod_class: param || category })
            return {
                animes: result.animes,
                maxPage: result.maxPage,
            }
        },
        optionList: [],
    }

    search = {
        load: async (keyword, searchOption, page) => {
            return await this._loadList(null, page, { vod_name: keyword || '' })
        },
        optionList: [],
    }

    anime = {
        loadInfo: async (id) => {
            let vodId = this._extractVodId(id)
            if (!vodId) throw '无法识别番剧 ID'
            let detail = await this._api('Vod/get_detail', { vod_id: vodId })
            if (Array.isArray(detail)) detail = detail[0]
            if (!detail || detail.vod_id == null) throw '未找到番剧详情'

            let episodes = this._parseEpisodes(detail)
            let tags = {}
            let addTag = (name, values) => {
                let items = Array.isArray(values) ? values : this._splitValues(values, /\s*\/\s*/)
                items = items.map((value) => String(value).trim()).filter(Boolean)
                if (items.length) tags[name] = items
            }
            addTag('放送日期', detail.vod_pubdate)
            addTag('导演', detail.vod_director)
            addTag('演员', detail.vod_actor)
            addTag('类型', detail.vod_class)
            addTag('地区', detail.vod_area)
            addTag('年份', detail.vod_year)
            addTag('语言', detail.vod_lang)
            addTag('版本', detail.vod_version)
            addTag('状态', detail.vod_state)
            addTag('播出时间', detail.vod_weekday)
            addTag('播放量', detail.vod_hits == null ? '' : String(detail.vod_hits))
            addTag('评分', detail.vod_score && detail.vod_score !== '0.0' ? detail.vod_score : '')

            let description = this._cleanHtml(detail.vod_blurb || detail.vod_content || '')
            let cover = this._imageUrl(detail.vod_pic_thumb || detail.vod_pic)
            let recommendations = []
            return new AnimeDetails({
                // 继续沿用传入的旧路径 ID，让历史记录和本地收藏保持相同身份。
                id: String(id ?? '').trim() || this._legacyAnimeId(vodId),
                title: detail.vod_name || '',
                cover: cover,
                description: description,
                tags: tags,
                episode: episodes,
                recommend: recommendations,
                url: `${this.baseUrl}/detail/${vodId}`,
            })
        },

        loadEp: async (animeId, epId) => {
            let url = String(epId || '').trim()
            if (!url) throw '该剧集没有可播放地址'
            return url
        },

        onClickTag: (namespace, tag) => {
            return {
                action: 'search',
                keyword: tag,
            }
        },
    }
}
