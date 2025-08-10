/** @type {import('./_kostori_.js')} */
class Emby extends AnimeSource {

    name = "emby"

    key = "emby"

    version = "1.0.2"

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
        return this.loadSetting('userId');
    }

    get apiKey(){
        return this.loadSetting('api_key');
    }

    parseQuery(parentId, type) {
        return `ParentId=${parentId}&SortBy=DateCreated&SortOrder=Descending&Limit=20&StartIndex=0&api_key=${this.apiKey}&UserId=${this.userId}&IncludeItemTypes=${type}&Recursive=true`;
    }

    async fetchItemsByType(id, type) {
        let url = `${this.protocol}${this.address}:${this.port}/Items?${this.parseQuery(id, type)}`;
        let itemRes = await Network.get(url, {});
        if (itemRes.status !== 200) {
            throw `Invalid Status Code ${itemRes.status}`;
        }
        let itemsJson = JSON.parse(itemRes.body);
        return itemsJson.Items.map(a => {
            let id = a.Id;
            let name = a.Name;
            let cover = a.ImageTags.Primary != null
                ? `${this.protocol}${this.address}:${this.port}/Items/${id}/Images/Primary?tag=${a.ImageTags.Primary}&api_key=${this.apiKey}`
                : `${this.protocol}${this.address}:${this.port}/Users/${this.userId}/Images/Primary?api_key=${this.apiKey}`
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
        let epsRes = await Network.get(`${this.protocol}${this.address}:${this.port}/Items?ParentId=${folderId}&IncludeItemTypes=Movie,Series,Folder&UserId=${this.userId}&api_key=${this.apiKey}&SortOrder=Descending&SortBy=DateCreated&Recursive=false`, {});
        if (epsRes.status !== 200) {
            throw `Invalid Status Code ${epsRes.status}`;
        }
        let epsJson = JSON.parse(epsRes.body);
        let epsItems = epsJson.Items;

        for (let a of epsItems) {
            if (a.Type === "Folder") {
                await this.recursiveFetch(a.Id);  // 递归访问子Folder
            } else {
                let link = `${this.protocol}${this.address}:${this.port}/Videos/${a.Id}/stream.mp4?api_key=${this.apiKey}&UserId=${this.userId}`;
                let title = a.Name || `第${ep.size + 1}话`;
                ep.set(link, title);
            }
        }
    }


    explore = [
        {
            title: "emby",
            type: "multiPartPage",
            load: async () => {
                let res = await Network.get(`${this.protocol}${this.address}:${this.port}/Library/MediaFolders?api_key=${this.apiKey}`, {},)
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
            let startIndex = (page - 1) * 20;
            let res = await Network.get(`${this.protocol}${this.address}:${this.port}/Items?ParentId=${id}&SortBy=${options[0]}&SortOrder=Descending&Limit=100&StartIndex=${startIndex}&api_key=${this.apiKey}&UserId=${this.userId}&IncludeItemTypes=${type}&Recursive=true`, {})
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }

            let json = JSON.parse(res.body)
            let animes = json.Items.map(a => {
                let id = a.Id;
                let name = a.Name;
                let cover = a.ImageTags.Primary != null
                    ? `${this.protocol}${this.address}:${this.port}/Items/${id}/Images/Primary?tag=${a.ImageTags.Primary}&api_key=${this.apiKey}`
                    : `${this.protocol}${this.address}:${this.port}/Users/${this.userId}/Images/Primary?api_key=${this.apiKey}`
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
        // provide options for category comic loading
        optionList: [
            {
                // For a single option, use `-` to separate the value and text, left for value, right for text
                options: [
                    "DateCreated-创建日期",
                    "DatePlayed-加入日期",
                    "Name-标题",
                    "ProductionYear-年份",
                    "RunTimeTicks-播放时长",
                    "Random-随机"
                ]
            }
        ],
    }

    search = {
        load:async (keyword) => {
            let res = await Network.get(`${this.protocol}${this.address}:${this.port}/Items?SearchTerm=${keyword}&IncludeItemTypes=Movie,Series&api_key=${this.apiKey}&UserId=${this.userId}&SortBy=DateCreated&SortOrder=Descending&Recursive=true`, {},)
            if (res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let json = JSON.parse(res.body)
            let animes = json.Items.map(a => {
                let id = a.Id;
                let name = a.Name;
                let cover = a.ImageTags.Primary != null
                    ? `${this.protocol}${this.address}:${this.port}/Items/${id}/Images/Primary?tag=${a.ImageTags.Primary}&api_key=${this.apiKey}`
                    : `${this.protocol}${this.address}:${this.port}/Users/${this.userId}/Images/Primary?api_key=${this.apiKey}`
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
            let res = await Network.get(`${this.protocol}${this.address}:${this.port}/Users/${this.userId}/Items/${id}?api_key=${this.apiKey}`,{})
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let json = JSON.parse(res.body)
            let title = json.Name
            let cover = json.ImageTags.Primary != null
                ? `${this.protocol}${this.address}:${this.port}/Items/${id}/Images/Primary?tag=${json.ImageTags.Primary}&api_key=${this.apiKey}`
                : `${this.protocol}${this.address}:${this.port}/Users/${this.userId}/Images/Primary?api_key=${this.apiKey}`
            let description = json.Overview
            let broadcastDate = [`${json.ProductionYear}`]
            let actors = json.People.map(a => a.Name)
            let tags = json.TagItems.map(t => t.Name);
            let ep = new Map()
            if(json.Type === "Series"){
                let epsRes = await Network.get(`${this.protocol}${this.address}:${this.port}/Shows/${id}/Episodes?api_key=${this.apiKey}&UserId=${this.userId}`,{})
                if(epsRes.status !== 200) {
                    throw `Invalid Status Code ${epsRes.status}`
                }
                let epsJson = JSON.parse(epsRes.body)
                let epsItems = epsJson.Items

                for(let a of epsItems) {
                    let title = a.Name
                    let link = `${this.protocol}${this.address}:${this.port}/Videos/${a.Id}/stream.mp4?api_key=${this.apiKey}&UserId=${this.userId}`
                    if (title.length === 0) {
                        title = `第${ep.size + 1}話`;
                    }
                    ep.set(link, title);
                }
            } else if(json.Type === "Movie"){
                let link = `${this.protocol}${this.address}:${this.port}/Videos/${json.Id}/stream.mp4?api_key=${this.apiKey}&UserId=${this.userId}`
                let title = json.Name
                ep.set(link, title);
            }else if(json.Type === "BoxSet"){
                let epsRes = await Network.get(`${this.protocol}${this.address}:${this.port}/Items?ParentId=${id}&IncludeItemTypes=Movie,Series,&UserId=${this.userId}&api_key=${this.apiKey}&SortOrder=Descending&SortBy=DateCreated&Recursive=true`,{})
                if(epsRes.status !== 200) {
                    throw `Invalid Status Code ${epsRes.status}`
                }
                let epsJson = JSON.parse(epsRes.body)
                let epsItems = epsJson.Items
                for (let a of epsItems) {
                    let link = `${this.protocol}${this.address}:${this.port}/Videos/${a.Id}/stream.mp4?api_key=${this.apiKey}&UserId=${this.userId}`
                    let title = a.Name
                    if (title.length === 0) {
                        title = `第${ep.size + 1}話`;
                    }
                    ep.set(link, title);
                }
            }else if(json.Type === "Folder"){
                let epsRes = await Network.get(`${this.protocol}${this.address}:${this.port}/Items?ParentId=${id}&IncludeItemTypes=Movie&UserId=${this.userId}&api_key=${this.apiKey}&SortOrder=Descending&SortBy=DateCreated&Recursive=true`,{})
                if(epsRes.status !== 200) {
                    throw `Invalid Status Code ${epsRes.status}`
                }
                let epsJson = JSON.parse(epsRes.body)
                let epsItems = epsJson.Items
                for (let a of epsItems) {
                    let link = `${this.protocol}${this.address}:${this.port}/Videos/${a.Id}/stream.mp4?api_key=${this.apiKey}&UserId=${this.userId}`
                    let title = a.Name
                    if (title.length === 0) {
                        title = `第${ep.size + 1}話`;
                    }
                    ep.set(link, title);
                }
            }else if(json.Type === "Playlist"){
                let epsRes = await Network.get(`${this.protocol}${this.address}:${this.port}/Playlists/${id}/Items?UserId=${this.userId}&api_key=${this.apiKey}&SortOrder=Descending&SortBy=DateCreated`,{})
                if(epsRes.status !== 200) {
                    throw `Invalid Status Code ${epsRes.status}`
                }
                let epsJson = JSON.parse(epsRes.body)
                let epsItems = epsJson.Items
                for (let a of epsItems) {
                    let link = `${this.protocol}${this.address}:${this.port}/Videos/${a.Id}/stream.mp4?api_key=${this.apiKey}&UserId=${this.userId}`
                    let title = a.Name
                    if (title.length === 0) {
                        title = `第${ep.size + 1}話`;
                    }
                    ep.set(link, title);
                }
            }else{
                let link = `${this.protocol}${this.address}:${this.port}/Videos/${json.Id}/stream.mp4?api_key=${this.apiKey}&UserId=${this.userId}`
                let title = json.Name
                ep.set(link, title);
            }
            if (ep.size === 0) {
                ep.set('#', '暂无剧集')
            }

            let eps = {
                "emby": ep,
            }

            let animesRes = await Network.get(`${this.protocol}${this.address}:${this.port}/Items/${id}/Similar?api_key=${this.apiKey}&UserId=${this.userId}&Limit=60`,{})
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let animesJson = JSON.parse(animesRes.body)
            let items = animesJson.Items;
            let animes = items.map((a) => {
                let id = a.Id;
                let name = a.Name;
                let cover = a.ImageTags.Primary != null
                    ? `${this.protocol}${this.address}:${this.port}/Items/${id}/Images/Primary?tag=${a.ImageTags.Primary}&api_key=${this.apiKey}`
                    : `${this.protocol}${this.address}:${this.port}/Users/${this.userId}/Images/Primary?api_key=${this.apiKey}`
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
                url: `${this.protocol}${this.address}:${this.port}/web/index.html#!/item?id=${id}&serverId=${json.ServerId}`,
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
        userId: {
            title: "UserId",
            type: "input",
            validator: '^[a-zA-Z0-9]+$',
            default: '',
        },
        api_key: {
            title: "Api_key",
            type: "input",
            validator: '^[a-zA-Z0-9]+$',
            default: '',
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