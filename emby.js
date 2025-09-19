/** @type {import('./_kostori_.js')} */
class Emby extends AnimeSource {

    name = "emby"

    key = "emby"

    version = "1.0.4"

    minAppVersion = "1.0.0"

    url = "https://raw.githubusercontent.com/kostori-app/kostori-configs/master/emby.js"

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

    async fetchItemsByType(id, type) {
        let url = `${this.baseUrl}/Items?${this.parseQuery(id, type)}`;
        let itemRes = await Network.get(url, this.headers);
        if (itemRes.status !== 200) {
            throw `Invalid Status Code ${itemRes.status}`;
        }
        let itemsJson = JSON.parse(itemRes.body);
        return itemsJson.Items.map(a => {
            let id = a.Id;
            let name = a.Name;
            let cover = a.ImageTags.Primary != null
                ? `${this.baseUrl}/Items/${id}/Images/Primary?tag=${a.ImageTags.Primary}`
                : `${this.baseUrl}/Users/${this.userId}/Images/Primary`
            return new Anime({
                id: id,
                title: name,
                subtitle: '',
                cover: cover,
                tags: [],
                description: '',
            });
        });
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
            title: "emby",
            type: "multiPartPage",
            load: async () => {
                let res = await Network.get(`${this.baseUrl}/Library/MediaFolders`, this.headers,)
                if (res.status !== 200) {
                    throw `Invalid Status Code ${res.status}`
                }
                let json = JSON.parse(res.body)
                let items = json.Items;
                let result = []
                for (const item of items) {
                    if (['tvshows', 'movies', 'homevideos', 'boxsets', 'playlists'].includes(item.CollectionType)) {
                        const apiType = collectionTypeMap[item.CollectionType];
                        let animes = await this.fetchItemsByType(item.Id, apiType);
                        result.push({
                            title: item.Name,
                            animes: animes,
                            viewMore: `category:${item.Name}@${item.Id}-${apiType}`,
                        });
                    }else {
                        let animes = await this.fetchItemsByType(item.Id, '');
                        result.push({
                            title: item.Name,
                            animes: animes,
                            viewMore: `category:${item.Name}@${item.Id}-`,
                        });
                    }
                }

                return result
            }
        }
    ]

    category = {
        title: "Emby",
        parts: []
    }

    categoryAnimes = {
        load: async (category, param, options, page) => {
            param ??= category
            param = encodeURIComponent(param)
            let parts = param.split("-");
            let id = parts[0];
            let type = parts[1];
            let startIndex = (page - 1) * 100;
            let res = await Network.get(`${this.baseUrl}/Items?ParentId=${id}&SortBy=${options[0]}&SortOrder=${options[1]}&Limit=100&StartIndex=${startIndex}&IncludeItemTypes=${type}&Recursive=true&UserId=${this.userId}`, this.headers)
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }

            let json = JSON.parse(res.body)
            let animes = json.Items.map(a => {
                let id = a.Id;
                let name = a.Name;
                let cover = a.ImageTags.Primary != null
                    ? `${this.baseUrl}/Items/${id}/Images/Primary?tag=${a.ImageTags.Primary}`
                    : `${this.baseUrl}/Users/${this.userId}/Images/Primary`
                return new Anime({
                    id: id,
                    title: name,
                    subtitle: '',
                    cover: cover,
                    tags: [],
                    description: '',
                });
            });
            let pageCount = json.TotalRecordCount <= 100
                ? 1
                : Math.ceil(json.TotalRecordCount / 100);


            return {
                animes: animes,
                maxPage: pageCount
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
                ]
            },
            {
                options: [
                    "Descending-倒序",
                    "Ascending-正序",
                ]
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
            let animes = json.Items.map(a => {
                let id = a.Id;
                let name = a.Name;
                let cover = a.ImageTags.Primary != null
                    ? `${this.baseUrl}/Items/${id}/Images/Primary?tag=${a.ImageTags.Primary}`
                    : `${this.baseUrl}/Users/${this.userId}/Images/Primary`
                return new Anime({
                    id: id,
                    title: name,
                    subtitle: '',
                    cover: cover,
                    tags: [],
                    description: '',
                });
            });
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
            let cover = json.ImageTags.Primary != null
                ? `${this.baseUrl}/Items/${id}/Images/Primary?tag=${json.ImageTags.Primary}`
                : `${this.baseUrl}/Users/${this.userId}/Images/Primary`
            let description = json.Overview
            let broadcastDate = [];
            broadcastDate.push(json.ProductionYear);
            let actors = json.People.map(a => a.Name)
            let tags = json.TagItems.map(t => t.Name);
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
            }else{
                let link = `${this.baseUrl}/Videos/${json.Id}/stream?api_key=${this.apiKey}&UserId=${this.userId}&static=true`
                let title = json.Name
                ep.set(link, title);
            }
            if (ep.size === 0) {
                ep.set('#', '暂无剧集')
            }

            let eps = {
                "emby": ep,
            }

            let animesRes = await Network.get(`${this.baseUrl}/Items/${id}/Similar?Limit=60&UserId=${this.userId}`,this.headers)
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let animesJson = JSON.parse(animesRes.body)
            let items = animesJson.Items;
            let animes = items.map((a) => {
                let id = a.Id;
                let name = a.Name;
                let cover = a.ImageTags.Primary != null
                    ? `${this.baseUrl}/Items/${id}/Images/Primary?tag=${a.ImageTags.Primary}`
                    : `${this.baseUrl}/Users/${this.userId}/Images/Primary`
                return new Anime({
                    id: id,
                    title: name,
                    subtitle: '',
                    cover: cover,
                    tags: [],
                    description: '',
                });
            })
            return new AnimeDetails({
                id: id,
                title: title,
                cover: cover,
                description: description,
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
            return epId;
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
    }

    translation = {
    }
}

const collectionTypeMap = {
    tvshows: 'Series',
    movies: 'Movie',
    homevideos: 'Video',
    boxsets: 'BoxSet',
    playlists: 'Playlist',
};