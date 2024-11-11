class Girigirilove extends AnimeSource{
    name = "girigirilove"

    key = "girigirilove"

    version = "1.0.1"

    minAppVersion = "1.0.0"

    url = ""

    get baseUrl() {
        return `https://anime.girigirilove.com`
    }

    account = null

    parseAnime(a) {
        let link = a.querySelector('a.public-list-exp');
        let imagelink =  link.querySelector('img.gen-movie-img');
        let infolink = a.querySelector('span.public-list-prb');
        let subNamelink = a. querySelector('div.public-list-subtitle');
        let id = link.attributes['href']?.trim() ?? '';
        let name = link.attributes['title']?.trim() ?? '';
        let image = imagelink?.attributes['data-src']?.trim() ?? '';
        let info = infolink?.text.trim() ?? '';
        let subName = subNamelink?.text.trim() ?? '';
        return new Anime (
            {
                id: id,
                title: name,
                subtitle: subName,
                cover: image,
                description: info,
            }
        )
    }

    explore = [{
        title: "ggl最新",

        type: "multiPageAnimeList",

        load: async (page) => {
            let res = await Network.get(`https://anime.girigirilove.com/show/2--------${page}---/`,{})
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            let parts = document.querySelectorAll('div.border-box div.public-list-box')
            let animeList = [];
            for (let part in parts){
                let anime = this.parseAnime(part);  // 使用 parseAnime 解析动漫信息
                animeList.push(anime);  // 将解析结果添加到 animeList 数组
            }
            document.dispose();
            return animeList;  // 返回包含所有动漫信息的数组
        }
    }]

    search = {
        load:async (keyword, page) => {
            let url = `${this.baseUrl}/search/${keyword}----------${page}---/`
            let res = await Network.get(url, {})
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            let parts = document.querySelectorAll('div.public-list-box')
            let animeList = [];
            for (let part in parts){
                let anime = this.parseAnime(part);  // 使用 parseAnime 解析动漫信息
                animeList.push(anime);  // 将解析结果添加到 animeList 数组
            }
            document.dispose();
            return animeList;  // 返回包含所有动漫信息的数组
        }
    }

    anime = {
        loadInfo: async (id) => {
            let res = await Network.get(`${this.baseUrl}${id}`,{})
            if(res.status !== 200) {
                throw `Invalid Status Code ${res.status}`
            }
            let document = new HtmlDocument(res.body)
            let animeDivs = document.querySelectorAll('div.border-box div.public-list-box');
            let titleElement = document.querySelector('h3.slide-info-title.hide');
            let title = titleElement?.text.trim() ?? '';
            let descriptionElement = document.querySelector('#height_limit.text.cor3');
            let description = descriptionElement?.text.trim() ?? '';
            let director = extractLinksAfterStrong(document, '导演');
            let actors = extractLinksAfterStrong(document, '演员');
            let tags = extractLinksAfterStrong(document, '类型');
            let imageElement = document.querySelector('div.detail-pic img');
            let imageUrl = imageElement?.attributes['data-src'] ?? '';
            let episodeElements = document.querySelectorAll('.anthology-list-play li a');
            let ep = new Map()
            for (let e of episodeElements) {  // 使用 for...of 获取元素
                let link = e.attributes['href']?.trim() ?? '';  // 获取 'href' 属性并去除空格
                let title = e.text.trim() ?? '';  // 获取链接文本作为标题

                // 如果标题为空，用其他逻辑生成标题（例如使用链接的某些信息）
                if (title.length === 0) {
                    title = `第${ep.size + 1}話`;
                }

                ep.set(link, title);  // 将链接和标题存入 Map
            }

            if (ep.size === 0) {
                ep.set('#', '第1話');
            }

            let recommend = []
            for (let a of animeDivs) {
                let anime = this.parseAnime(part);
                recommend.push(anime)
            }
            return {
                title: title,
                cover: imageUrl,
                description: description,
                tags: {
                    "导演": [director],
                    "演员": [actors],
                    "类型": [tags],
                },
                episode: ep,
                recommend: recommend
            }
        },

        loadEp: async (animeId, epId) => {
        let res = await Network.get(`${this.baseUrl}${epId}`,{})
            if (res.status !== 200) {
                throw "Invalid status code: " + res.status
            }
            // 使用解析库（例如 jsdom）来解析HTML
            let document = new HtmlDocument(res.body); // 假设HtmlDocument可用于解析HTML
            let div = document.querySelector('.player-left') || document.querySelector('.player-top');

            if (!div) {
                return '';  // 如果没有找到对应的div，直接返回空字符串
            }

            // 获取包含视频链接的 script 元素内容
            let scriptContent = div.querySelector('script')?.textContent;
            if (!scriptContent) {
                return '';
            }

            // 将 script 内容按逗号分割并处理每一行
            let scriptLines = scriptContent.split(',').map(line => line.trim());

            for (let line of scriptLines) {
                if (line.includes('"url"')) {
                    // 提取并解码 base64 编码的视频链接
                    let encoded = line.split(':')[1].replace(/"/g, '').replace(/,/g, '');
                    let decoded = atob(encoded);  // 使用 atob() 解码 base64 字符串
                    let videoLink = decodeURIComponent(decoded);  // 对解码内容进行 URI 解码

                    // 输出解析的视频链接或直接返回
                    console.log('Parsed video link:', videoLink);
                    return videoLink;
                }
            }

            return '';  // 如果没有找到视频链接，返回空字符串
        }
    }
}

function extractLinksAfterStrong(document, targetText) {
    let results = [];
    let strongElements = document.querySelectorAll('div.slide-info.hide strong');

    for (let strong of strongElements) {
        let strongText = strong.textContent.trim().replace(/[:：]/g, '').trim();

        if (strongText === targetText) {
            let parent = strong.parentElement;

            if (parent) {
                let linkElements = parent.querySelectorAll('a');
                results = Array.from(linkElements).map(e => e.textContent.trim());
                break;
            }
        }
    }

    return results;
}