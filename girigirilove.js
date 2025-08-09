/** @type {import('./_kostori_.js')} */
class Girigirilove extends AnimeSource{
    name = "girigirilove"

    key = "girigirilove"

    version = "1.1.0"

    minAppVersion = "1.0.0"

    url = "https://raw.githubusercontent.com/kostori-app/kostori-configs/master/girigirilove.js"

    get baseUrl() {
        return `https://anime.girigirilove.com`
    }

    get userAgent(){
        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
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


    explore = [
        {
        title: "ggl日番",

        type: "mixed",

        load: async (page) => {
            let res = await Network.get(`https://anime.girigirilove.com/show/2--------${page}---/`,{"User-Agent": this.userAgent})
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
                maxPage: 20000
            }  // 返回包含所有动漫信息的数组
        }
    },
        {
            title: "ggl美番",

            type: "mixed",

            load: async (page) => {
                let res = await Network.get(`https://anime.girigirilove.com/show/3--------${page}---/`,{"User-Agent": this.userAgent})
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
                    maxPage: 20000
                }  // 返回包含所有动漫信息的数组
            }
        },
        {
            title: "ggl剧场版",

            type: "mixed",

            load: async (page) => {
                let res = await Network.get(`https://anime.girigirilove.com/show/21--------${page}---/`,{"User-Agent": this.userAgent})
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
                    maxPage: 20000
                }  // 返回包含所有动漫信息的数组
            }
        }
    ]

    search = {
        load:async (keyword, page) => {
            let url = `${this.baseUrl}/search/${keyword}----------${page}---/`
            let res = await Network.get(url, {"User-Agent": this.userAgent})
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
                    id: id,
                    title: title,
                    subtitle: '',
                    cover: this.baseUrl + image,
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
            let res = await Network.get(`${this.baseUrl}${id}`,{})
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
            let res = await Network.get(`${this.baseUrl}${epId}`,{})
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
