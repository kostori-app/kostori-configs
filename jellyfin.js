/** @type {import('./_kostori_.js')} */
class Jellyfin extends AnimeSource {

    name = "jellyfin"

    key = "jellyfin"

    version = "1.0.3"

    minAppVersion = "1.0.0"

    url = "https://raw.githubusercontent.com/kostori-app/kostori-configs/master/jellyfin.js"

    host = this.baseUrl

    async init() {
    }

    get protocol() {
        return this.loadSetting('protocol');
    }

    get address(){
        return this.loadSetting('address');
    }

    get port(){
        return this.loadSetting('port');
    }

    get userId(){
        return this.loadData('userId');
    }

    get apiKey(){
        return this.loadData('token');
    }

    parseQuery(parentId, type) {
        return `ParentId=${parentId}&SortBy=DateLastContentAdded&SortOrder=Descending&Limit=40&StartIndex=0&IncludeItemTypes=${type}&Recursive=true&UserId=${this.userId}`;
    }

    async apiGet(path) {
        let res = await Network.get(`${this.baseUrl}${path}`, this.headers);
        if (res.status !== 200) {
            throw `Invalid Status Code ${res.status}`;
        }
        return JSON.parse(res.body);
    }

    coverOf(item) {
        let id = item.Id;
        return (item.ImageTags && item.ImageTags.Primary != null)
            ? `${this.baseUrl}/Items/${id}/Images/Primary?tag=${item.ImageTags.Primary}`
            : `${this.baseUrl}/Users/${this.userId}/Images/Primary`;
    }

    // 继续观看条目在副标题显示进度，剧集显示所属剧名
    progressText(item) {
        try {
            let ud = item.UserData;
            if (ud && ud.PlaybackPositionTicks && item.RunTimeTicks) {
                let pct = Math.floor(ud.PlaybackPositionTicks / item.RunTimeTicks * 100);
                if (pct > 0 && pct < 100) {
                    return `已观看 ${pct}%`;
                }
            }
            if (item.Type === 'Episode' && item.SeriesName) {
                return item.SeriesName;
            }
        } catch (e) {}
        return '';
    }

    toAnime(item) {
        let data = {
            id: item.Id,
            title: item.Name || '',
            subtitle: this.progressText(item),
            cover: this.coverOf(item),
            tags: [],
            description: '',
        };
        // 人物：点击进入二级分类页（列出其参演作品），而不是直接进详情页
        if (item.Type === 'Person') {
            data.viewMore = {
                page: 'category',
                attributes: { category: item.Name || '', param: `person|${item.Id}` },
            };
        }
        return new Anime(data);
    }

    maxPageOf(json, pageSize) {
        let total = json.TotalRecordCount || 0;
        return total <= pageSize ? 1 : Math.ceil(total / pageSize);
    }

    async fetchItemsByType(id, type) {
        let url = `${this.baseUrl}/Items?${this.parseQuery(id, type)}`;
        let itemRes = await Network.get(url, this.headers);
        if (itemRes.status !== 200) {
            throw `Invalid Status Code ${itemRes.status}`;
        }
        let itemsJson = JSON.parse(itemRes.body);
        return (itemsJson.Items || []).map(a => this.toAnime(a));
    }

    async fetchUserItems(query, pageSize) {
        let json = await this.apiGet(`/Users/${this.userId}/Items?${query}`);
        return {
            animes: (json.Items || []).map(a => this.toAnime(a)),
            maxPage: this.maxPageOf(json, pageSize || 100),
        };
    }

    async fetchResumeItems(startIndex, limit) {
        let json = await this.apiGet(
            `/Users/${this.userId}/Items/Resume?StartIndex=${startIndex}&Limit=${limit}` +
            `&MediaTypes=Video&Recursive=true&UserId=${this.userId}`
        );
        return {
            animes: (json.Items || []).map(a => this.toAnime(a)),
            maxPage: this.maxPageOf(json, limit),
        };
    }

    favoriteQuery(type, startIndex, limit) {
        return `Filters=IsFavorite&IncludeItemTypes=${type}` +
            `&SortBy=DateLastContentAdded&SortOrder=Descending&StartIndex=${startIndex}` +
            `&Limit=${limit}&Recursive=true&UserId=${this.userId}`;
    }

    // 读取手动排序（libraryOrder 保存媒体库 Id 数组），并把合集/播放列表固定到最后
    orderFolders(items) {
        let manual = [];
        try {
            let v = this.loadSetting('libraryOrder');
            if (Array.isArray(v)) {
                manual = v;
            }
        } catch (e) {}
        let used = {};
        let arr = [];
        // 先按手动顺序取出
        for (let id of manual) {
            for (let it of items) {
                if (it.Id === id && !used[it.Id]) {
                    used[it.Id] = true;
                    arr.push(it);
                }
            }
        }
        // 其余保持原顺序
        for (let it of items) {
            if (!used[it.Id]) {
                used[it.Id] = true;
                arr.push(it);
            }
        }
        // 合集/播放列表固定到最后
        let normal = [];
        let last = [];
        for (let it of arr) {
            if (it.CollectionType === 'boxsets' || it.CollectionType === 'playlists') {
                last.push(it);
            } else {
                normal.push(it);
            }
        }
        return normal.concat(last);
    }

    async recursiveFetch(folderId) {
        let epsRes = await Network.get(`${this.baseUrl}/Items?ParentId=${folderId}&IncludeItemTypes=Movie,Series,Folder&SortOrder=Descending&SortBy=DateLastContentAdded&Recursive=false&UserId=${this.userId}`, this.headers);
        if (epsRes.status !== 200) {
            throw `Invalid Status Code ${epsRes.status}`;
        }
        let epsJson = JSON.parse(epsRes.body);
        let epsItems = epsJson.Items;

        for (let a of epsItems) {
            if (a.Type === "Folder") {
                await this.recursiveFetch(a.Id);  // 递归访问子Folder
            } else {
                let link = `${this.baseUrl}/Videos/${a.Id}/stream.mp4?api_key=${this.apiKey}&UserId=${this.userId}`;
                let title = a.Name || `第${ep.size + 1}话`;
                ep.set(link, title);
            }
        }
    }

    get baseUrl() {
        return `${this.protocol}${this.address}:${this.port}`
    }

    get loginHeaders() {
        return {
            'X-Emby-Authorization': `MediaBrowser Client="Kostori", Device="Kostori", DeviceId="1145141919810", Version=${this.version},`
        }
    }

    get headers() {
        return {
            'X-Emby-Token': this.loadData('token'),
            'X-Emby-Authorization': this.loadData('token')
        }
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
                `${this.baseUrl}/Users/AuthenticateByName`,
                this.loginHeaders,
                {
                    "Username": account,
                    "Pw": pwd
                })

            if (res.status === 200) {
                let json = JSON.parse(res.body)
                if (!json.AccessToken) {
                    throw 'Failed to get token\nResponse: ' + res.body
                }
                this.saveData('token', json.AccessToken)
                this.saveData('userId', json.User.Id)
                return 'ok'
            }

            throw 'Failed to login'
        },

        logout: () => {
            this.deleteData('token')
        },

        registerWebsite: ""
    }


    explore = [
        {
            title: "jellyfin",
            type: "multiPartPage",
            load: async () => {
                let result = []

                // 继续观看：主页第一行
                try {
                    let resume = await this.fetchResumeItems(0, 20)
                    if (resume.animes.length > 0) {
                        result.push({
                            title: "继续观看",
                            animes: resume.animes,
                            viewMore: { page: 'category', attributes: { category: '继续观看', param: 'resume' } },
                        })
                    }
                } catch (e) {}

                // 媒体库：普通库在前，合集/播放列表固定最后
                let json = await this.apiGet(`/Library/MediaFolders`)
                let items = this.orderFolders(json.Items || [])
                for (const item of items) {
                    let type = collectionTypeMap[item.CollectionType]
                    let animes = await this.fetchItemsByType(item.Id, type || '')
                    result.push({
                        title: item.Name,
                        animes: animes,
                        viewMore: { page: 'category', attributes: { category: item.Name, param: `${item.Id}-${type || ''}` } },
                    })
                }

                return result
            }
        },
        {
            title: "我的收藏",
            type: "multiPartPage",
            load: async () => {
                let result = []
                for (const group of favoriteGroups) {
                    try {
                        let res = await this.fetchUserItems(this.favoriteQuery(group.type, 0, 20), 20)
                        if (res.animes.length > 0) {
                            result.push({
                                title: group.title,
                                animes: res.animes,
                                viewMore: { page: 'category', attributes: { category: group.title, param: `fav|${group.type}` } },
                            })
                        }
                    } catch (e) {}
                }
                return result
            }
        }
    ]

    category = {
        title: "Jellyfin",
        parts: []
    }

    categoryAnimes = {
        load: async (category, param, options, page) => {
            let startIndex = (page - 1) * 100;

            // 继续观看
            if (category === '继续观看') {
                return await this.fetchResumeItems(startIndex, 100);
            }

            // 收藏分类：param 形如 fav|Series
            if (param && param.indexOf('fav|') === 0) {
                let type = param.substring(4);
                return await this.fetchUserItems(this.favoriteQuery(type, startIndex, 100), 100);
            }

            // 人物作品：param 形如 person|<personId>，进入二级页后列出该人物参演作品
            if (param && param.indexOf('person|') === 0) {
                let personId = param.substring(7);
                let sortBy = (options && options[0]) ? options[0] : 'DateLastContentAdded';
                let sortOrder = (options && options[1]) ? options[1] : 'Descending';
                let json = await this.apiGet(
                    `/Items?PersonIds=${personId}&IncludeItemTypes=Movie,Series&Recursive=true` +
                    `&SortBy=${sortBy}&SortOrder=${sortOrder}&Limit=100&StartIndex=${startIndex}&UserId=${this.userId}`
                );
                return {
                    animes: (json.Items || []).map(a => this.toAnime(a)),
                    maxPage: this.maxPageOf(json, 100),
                }
            }

            // 媒体库浏览
            param ??= category
            param = encodeURIComponent(param)
            let parts = param.split("-");
            let id = parts[0];
            let type = parts[1];
            let sortBy = (options && options[0]) ? options[0] : 'DateLastContentAdded';
            let sortOrder = (options && options[1]) ? options[1] : 'Descending';
            let json = await this.apiGet(
                `/Items?ParentId=${id}&SortBy=${sortBy}&SortOrder=${sortOrder}` +
                `&Limit=100&StartIndex=${startIndex}&IncludeItemTypes=${type}&Recursive=true&UserId=${this.userId}`
            );

            return {
                animes: (json.Items || []).map(a => this.toAnime(a)),
                maxPage: this.maxPageOf(json, 100),
            }
        },

        optionList: [
            {
                label: "排序",
                options: [
                    "DateLastContentAdded-更新日期",
                    "DateCreated-创建日期",
                    "DateLastActivity-最后活动日期",
                    "DatePlayed-最后播放日期",
                    "Name-标题",
                    "SortName-规范化标题",
                    "PremiereDate-首映日期",
                    "EndDate-完结日期",
                    "ProductionYear-年份",
                    "RunTimeTicks-播放时长",
                    "CommunityRating-社区评分",
                    "CriticRating-媒体评分",
                    "OfficialRating-官方评分",
                    "PlayCount-播放次数",
                    "IndexNumber-集数排序",
                    "ParentIndexNumber-季号排序",
                    "IsUnplayed-是否未播放",
                    "IsPlayed-是否播放",
                    "Random-随机"
                ],
                notShowWhen: specialCategories
            },
            {
                options: [
                    "Descending-倒序",
                    "Ascending-正序",
                ],
                notShowWhen: specialCategories
            }
        ],
    }

    search = {
        load:async (keyword) => {
            let res = await Network.get(`${this.baseUrl}/Items?SearchTerm=${keyword}&IncludeItemTypes=Movie,Series&SortBy=DateLastContentAdded&SortOrder=Descending&Recursive=true&UserId=${this.userId}`, this.headers,)
            if (res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let json = JSON.parse(res.body)
            let animes = (json.Items || []).map(a => this.toAnime(a));
            return {
                animes: animes,
                maxPage: 1
            }
        }
    }

    anime = {
        loadInfo: async (id) => {
            let res = await Network.get(`${this.baseUrl}/Users/${this.userId}/Items/${id}?&UserId=${this.userId}`,this.headers)
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let json = JSON.parse(res.body)
            let title = json.Name
            let cover = this.coverOf(json)
            let description = json.Overview
            let broadcastDate = [];
            if(json.ProductionYear != null){
                broadcastDate.push(`${json.ProductionYear}`);
            }

            // 剧照/背景图
            let thumbnails = []
            if (Array.isArray(json.BackdropImageTags) && json.BackdropImageTags.length > 0) {
                for (let i = 0; i < json.BackdropImageTags.length; i++) {
                    thumbnails.push(`${this.baseUrl}/Items/${id}/Images/Backdrop/${i}?tag=${json.BackdropImageTags[i]}`)
                }
            }

            let actors = (json.People || []).map(a => a.Name)
            let tags = (json.TagItems || []).map(t => t.Name);
            let ep = new Map()
            if(json.Type === "Series"){
                let epsRes = await Network.get(`${this.baseUrl}/Shows/${id}/Episodes?&UserId=${this.userId}`,this.headers)
                if(epsRes.status !== 200) {
                    throw `Invalid Status Code ${epsRes.status}`
                }
                let epsJson = JSON.parse(epsRes.body)
                let epsItems = epsJson.Items

                for(let a of epsItems) {
                    let title = a.Name
                    let link = `${this.baseUrl}/Videos/${a.Id}/stream?api_key=${this.apiKey}&UserId=${this.userId}&static=true`
                    if (title.length === 0) {
                        title = `第${ep.size + 1}話`;
                    }
                    ep.set(link, title);
                }
            } else if(json.Type === "Movie"){
                let link = `${this.baseUrl}/Videos/${json.Id}/stream?api_key=${this.apiKey}&UserId=${this.userId}&static=true`
                let title = json.Name
                ep.set(link, title);
            }else if(json.Type === "BoxSet"){
                let epsRes = await Network.get(`${this.baseUrl}/Items?ParentId=${id}&IncludeItemTypes=Movie,Series,SortOrder=Descending&SortBy=DateLastContentAdded&Recursive=true&UserId=${this.userId}`,this.headers)
                if(epsRes.status !== 200) {
                    throw `Invalid Status Code ${epsRes.status}`
                }
                let epsJson = JSON.parse(epsRes.body)
                let epsItems = epsJson.Items
                for (let a of epsItems) {
                    let link = `${this.baseUrl}/Videos/${a.Id}/stream?api_key=${this.apiKey}&UserId=${this.userId}&static=true`
                    let title = a.Name
                    if (title.length === 0) {
                        title = `第${ep.size + 1}話`;
                    }
                    ep.set(link, title);
                }
            }else if(json.Type === "Folder"){
                let epsRes = await Network.get(`${this.baseUrl}/Items?ParentId=${id}&IncludeItemTypes=Movie&SortOrder=Descending&SortBy=DateLastContentAdded&Recursive=true&UserId=${this.userId}`,this.headers)
                if(epsRes.status !== 200) {
                    throw `Invalid Status Code ${epsRes.status}`
                }
                let epsJson = JSON.parse(epsRes.body)
                let epsItems = epsJson.Items
                for (let a of epsItems) {
                    let link = `${this.baseUrl}/Videos/${a.Id}/stream?api_key=${this.apiKey}&UserId=${this.userId}&static=true`
                    let title = a.Name
                    if (title.length === 0) {
                        title = `第${ep.size + 1}話`;
                    }
                    ep.set(link, title);
                }
            }else if(json.Type === "Playlist"){
                let epsRes = await Network.get(`${this.baseUrl}/Playlists/${id}/Items?SortOrder=Descending&SortBy=DateLastContentAdded&UserId=${this.userId}`,this.headers)
                if(epsRes.status !== 200) {
                    throw `Invalid Status Code ${epsRes.status}`
                }
                let epsJson = JSON.parse(epsRes.body)
                let epsItems = epsJson.Items
                for (let a of epsItems) {
                    let link = `${this.baseUrl}/Videos/${a.Id}/stream?api_key=${this.apiKey}&UserId=${this.userId}&static=true`
                    let title = a.Name
                    if (title.length === 0) {
                        title = `第${ep.size + 1}話`;
                    }
                    ep.set(link, title);
                }
            }else if(json.Type === "Person"){
                // 人物不可直接播放，作品在下方推荐区展示
            }else{
                let link = `${this.baseUrl}/Videos/${json.Id}/stream?api_key=${this.apiKey}&UserId=${this.userId}&static=true`
                let title = json.Name
                ep.set(link, title);
            }
            if (ep.size === 0) {
                ep.set('#', '暂无剧集')
            }

            let eps = {
                "jellyfin": ep,
            }

            let animes = []
            if(json.Type === "Person"){
                // 人物：展示其参演作品
                let worksRes = await this.apiGet(`/Items?PersonIds=${id}&IncludeItemTypes=Movie,Series&Recursive=true&SortBy=DateLastContentAdded&SortOrder=Descending&UserId=${this.userId}`)
                animes = (worksRes.Items || []).map(a => this.toAnime(a));
            }else{
                let animesRes = await Network.get(`${this.baseUrl}/Items/${id}/Similar?Limit=60&UserId=${this.userId}`,this.headers)
                if(animesRes.status === 200) {
                    let animesJson = JSON.parse(animesRes.body)
                    animes = (animesJson.Items || []).map((a) => this.toAnime(a))
                }
            }
            return new AnimeDetails({
                id: id,
                title: title,
                cover: cover,
                description: description,
                thumbnails: thumbnails.length > 0 ? thumbnails : null,
                tags: {
                    "年份": broadcastDate,
                    "演员": actors,
                    "类型": tags,
                },
                episode: eps,
                recommend: animes,
                url: `${this.baseUrl}/web/index.html#!/item?id=${id}&serverId=${json.ServerId}`,
            })
        },
        loadEp: async (animeId, epId) => {
            if (typeof epId !== 'string' || epId.length === 0) {
                throw "暂无剧集"
            }
            // 从播放 URL 提取媒体 Id，调 PlaybackInfo 获取音轨/字幕/视频流
            try {
                let m = epId.match(/\/Videos\/([^/?#]+)/)
                if (m) {
                    let itemId = m[1]
                    let piRes = await Network.post(
                        `${this.baseUrl}/Items/${itemId}/PlaybackInfo?UserId=${this.userId}&StartTimeTicks=0&AutoOpenLiveStream=true`,
                        this.headers,
                        {}
                    )
                    if (piRes.status === 200) {
                        let pi = JSON.parse(piRes.body)
                        let src = (pi.MediaSources || [])[0]
                        if (src) {
                            let audioTracks = []
                            let subtitleTracks = []
                            let videoStreams = []
                            for (let ms of (src.MediaStreams || [])) {
                                if (ms.Type === 'Audio') {
                                    audioTracks.push({
                                        index: ms.Index != null ? ms.Index : audioTracks.length,
                                        language: ms.Language || null,
                                        title: ms.DisplayTitle || null,
                                        codec: ms.Codec || null,
                                        channels: ms.Channels != null ? ms.Channels : null,
                                    })
                                } else if (ms.Type === 'Subtitle') {
                                    subtitleTracks.push({
                                        index: ms.Index != null ? ms.Index : subtitleTracks.length,
                                        language: ms.Language || null,
                                        title: ms.DisplayTitle || null,
                                        codec: ms.Codec || null,
                                        channels: null,
                                    })
                                } else if (ms.Type === 'Video') {
                                    videoStreams.push({
                                        index: ms.Index != null ? ms.Index : videoStreams.length,
                                        width: ms.Width != null ? ms.Width : null,
                                        height: ms.Height != null ? ms.Height : null,
                                        bitrate: ms.BitRate != null ? ms.BitRate : null,
                                        codec: ms.Codec || null,
                                        name: ms.DisplayTitle || null,
                                    })
                                }
                            }
                            return {
                                url: epId,
                                headers: this.headers,
                                audioTracks: audioTracks,
                                subtitleTracks: subtitleTracks,
                                videoStreams: videoStreams,
                                container: src.Container || null,
                                playSessionId: pi.PlaySessionId || null,
                            }
                        }
                    }
                }
            } catch (e) {
                // 媒体信息获取失败则退化为纯 URL
            }
            return epId
        },
        playbackProgress: async (url, positionMs, durationMs, playing, playSessionId) => {
            try {
                let m = url.match(/\/Videos\/([^/?#]+)/)
                if (!m) return null
                await Network.post(
                    `${this.baseUrl}/Sessions/Playing/Progress?api_key=${this.apiKey}`,
                    this.headers,
                    {
                        ItemId: m[1],
                        PositionTicks: positionMs * 10000,
                        IsPaused: !playing,
                        PlaySessionId: playSessionId || null,
                    })
            } catch (e) {}
            return null
        },
        playbackStopped: async (url, positionMs, playSessionId) => {
            try {
                let m = url.match(/\/Videos\/([^/?#]+)/)
                if (!m) return null
                await Network.post(
                    `${this.baseUrl}/Sessions/Playing/Stopped?api_key=${this.apiKey}`,
                    this.headers,
                    {
                        ItemId: m[1],
                        PositionTicks: positionMs * 10000,
                        PlaySessionId: playSessionId || null,
                    })
            } catch (e) {}
            return null
        },
        sourceAction: async (action, params) => {
            try {
                if (action === 'favorite') {
                    let id = params.id
                    if (params.favorite) {
                        await Network.post(`${this.baseUrl}/Users/${this.userId}/FavoriteItems/${id}?api_key=${this.apiKey}`, this.headers, {})
                    } else {
                        await Network.delete(`${this.baseUrl}/Users/${this.userId}/FavoriteItems/${id}?api_key=${this.apiKey}`, this.headers)
                    }
                } else if (action === 'delete') {
                    await Network.delete(`${this.baseUrl}/Items/${params.id}?api_key=${this.apiKey}`, this.headers)
                } else if (action === 'markPlayed') {
                    let id = params.id
                    if (params.played) {
                        await Network.post(`${this.baseUrl}/Users/${this.userId}/PlayedItems/${id}?api_key=${this.apiKey}`, this.headers, {})
                    } else {
                        await Network.delete(`${this.baseUrl}/Users/${this.userId}/PlayedItems/${id}?api_key=${this.apiKey}`, this.headers)
                    }
                } else if (action === 'clearPlayback') {
                    await Network.post(`${this.baseUrl}/Sessions/Playing/Progress?api_key=${this.apiKey}`, this.headers, {
                        ItemId: params.id,
                        PositionTicks: 0,
                        IsPaused: true,
                    })
                } else if (action === 'rate') {
                    await Network.post(`${this.baseUrl}/Users/${this.userId}/Items/${params.id}/Rating?api_key=${this.apiKey}`, this.headers, {
                        Rating: params.rating,
                    })
                }
            } catch (e) {}
            return null
        },
        onClickTag: (namespace, tag) => {
            return {
                action: 'search',
                keyword: tag,
            }
        },
    }

    settings = {
        protocol: {
            title: "Protocol",
            type: "select",
            options: [
                {
                    value: 'http://',
                },
                {
                    value: 'https://',
                },
            ],
            default: "http://",
        },
        address: {
            title: "Address",
            type: "input",
            validator: '^(?:\\d{1,3}\\.){3}\\d{1,3}$|^(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}$',
            default: '127.0.0.1',
        },
        port: {
            title: "Port",
            type: "input",
            validator: '^\\d{1,5}$',
            default: '8096',
        },
        libraryOrder: {
            title: "Library Order",
            type: "order",
            // 由 App 设置页调用，返回可排序的媒体库列表
            loader: async () => {
                let json = await this.apiGet(`/Library/MediaFolders`)
                return (json.Items || []).map(i => ({ id: i.Id, name: i.Name }))
            },
            default: [],
        },
    }

    translation = {
        'zh_CN': {
            'Protocol': '协议',
            'Address': '地址',
            'Port': '端口',
            'Library Order': '媒体库排序',
            '继续观看': '继续观看',
            '我的收藏': '我的收藏',
            '收藏节目': '收藏节目',
            '收藏电影': '收藏电影',
            '收藏合集': '收藏合集',
            '收藏人物': '收藏人物',
        },
        'zh_TW': {
            'Protocol': '協議',
            'Address': '地址',
            'Port': '端口',
            'Library Order': '媒體庫排序',
            '继续观看': '繼續觀看',
            '我的收藏': '我的收藏',
            '收藏节目': '收藏節目',
            '收藏电影': '收藏電影',
            '收藏合集': '收藏合集',
            '收藏人物': '收藏人物',
        },
        'en': {}
    }
}

const collectionTypeMap = {
    tvshows: 'Series',
    movies: 'Movie',
    homevideos: 'Video',
    boxsets: 'BoxSet',
    playlists: 'Playlist',
};

// 收藏页分组（顺序即展示顺序）
const favoriteGroups = [
    { title: '收藏节目', type: 'Series' },
    { title: '收藏电影', type: 'Movie' },
    { title: '收藏合集', type: 'BoxSet' },
    { title: '收藏人物', type: 'Person' },
];

// 这些分类不支持“更新日期/正倒序”排序，隐藏排序选项
const specialCategories = ['继续观看', '收藏节目', '收藏电影', '收藏合集', '收藏人物'];
